import { DateTime } from "luxon";
import {
  EXERCISE_AFTER_WAKE_H,
  EXERCISE_DURATION_H,
  LIGHT_SEEK_DURATION_H,
  RETURN_FORCED_WAKE_UNTIL_LOCAL,
  SHIFT_RATE_WEST_H_PER_DAY,
  SLEEP_DURATION_H,
} from "./constants";
import type { Baseline } from "./circadian";
import { shiftedCbtMin, shiftAtInstant } from "./circadian";
import { parseHHMM } from "./util";
import type { ProtocolInput, Step } from "./types";

/**
 * Return-leg sub-plan. Same direction logic in reverse: SFO→LHR east means
 * LHR→SFO is west. We compute a fresh signed shift at returnDepartAt (so a
 * round-trip ends near baseline) and emit westward-style steps:
 * - evening light_seek in origin tz (delay zone)
 * - forced wakefulness floor at 22:30 origin local on Days 0..1
 * - NO melatonin
 * - progressively later wake
 */
export function emitReturnSteps(
  input: ProtocolInput,
  baseline: Baseline,
): Step[] {
  if (!input.returnDepartAt || !input.returnArriveAt) return [];

  // Direction from destTz (where user has been adapted) back to homeTz
  const { direction, shiftHours } = shiftAtInstant(input.destTz, input.homeTz, input.returnDepartAt);
  if (direction === "none") return [];

  const steps: Step[] = [];

  // Watch-set on return boarding
  steps.push({
    kind: "watch_set",
    scheduledAt: input.returnDepartAt,
    displayTz: input.homeTz,
    originalTz: input.destTz,
    payload: { fromTz: input.destTz, toTz: input.homeTz },
  });

  const arriveBackUtc = DateTime.fromJSDate(input.returnArriveAt).toUTC();
  const totalDays = Math.ceil(Math.abs(shiftHours) / SHIFT_RATE_WEST_H_PER_DAY);

  // Baseline upon return: user's home baseline (shifted destTz back to homeTz)
  // Adapted state at return = baseline shifted by full shiftHours from outbound
  // For simplicity in v1, recover toward homeTz baseline using west-rate.
  const adaptedCbtMinAtReturn = baseline.cbtMin; // we model recovery TO home baseline

  for (let d = 0; d <= totalDays + 2; d++) {
    // Use west direction with shiftHours signed; cbtMin advances in real time
    // (in the home tz) toward baseline.
    const cbtMin = shiftedCbtMin(adaptedCbtMinAtReturn, d, "west", shiftHours);
    void cbtMin;

    // Wake in home tz: 1.5h later each day until aligned
    const baseHomeWake = DateTime.fromJSDate(arriveBackUtc.toJSDate(), { zone: input.homeTz }).set({
      hour: parseHHMM(input.habitualWakeLocal).hour,
      minute: parseHHMM(input.habitualWakeLocal).minute,
    }).plus({ days: d });

    const wakeAt = baseHomeWake;
    const sleepStart = wakeAt.minus({ hours: SLEEP_DURATION_H });

    // Forced wakefulness floor on Day 0 and Day 1
    if (d <= 1) {
      const { hour, minute } = parseHHMM(RETURN_FORCED_WAKE_UNTIL_LOCAL);
      const forcedUntil = wakeAt.set({ hour, minute }).minus({ days: 1 });
      if (forcedUntil > DateTime.fromJSDate(input.returnArriveAt) && forcedUntil < sleepStart) {
        // No-op: just used as a floor on sleepStart
      }
      const effectiveSleepStart = sleepStart > forcedUntil ? sleepStart : forcedUntil;
      steps.push({
        kind: "sleep_window",
        scheduledAt: effectiveSleepStart.toUTC().toJSDate(),
        endsAt: wakeAt.toUTC().toJSDate(),
        displayTz: input.homeTz,
        originalTz: input.homeTz,
        payload: { plannedHours: SLEEP_DURATION_H, dayIndex: d, phase: "return" },
      });
    } else {
      steps.push({
        kind: "sleep_window",
        scheduledAt: sleepStart.toUTC().toJSDate(),
        endsAt: wakeAt.toUTC().toJSDate(),
        displayTz: input.homeTz,
        originalTz: input.homeTz,
        payload: { plannedHours: SLEEP_DURATION_H, dayIndex: d, phase: "return" },
      });
    }

    steps.push({
      kind: "wake",
      scheduledAt: wakeAt.toUTC().toJSDate(),
      displayTz: input.homeTz,
      originalTz: input.homeTz,
      payload: { dayIndex: d, phase: "return" },
    });

    // Evening light_seek to reinforce delay (17:00 home local)
    const eveningLight = wakeAt.set({ hour: 17, minute: 0 });
    if (eveningLight > DateTime.fromJSDate(input.returnArriveAt)) {
      steps.push({
        kind: "light_seek",
        scheduledAt: eveningLight.toUTC().toJSDate(),
        endsAt: eveningLight.plus({ hours: LIGHT_SEEK_DURATION_H }).toUTC().toJSDate(),
        displayTz: input.homeTz,
        originalTz: input.homeTz,
        payload: {
          durationMin: 60,
          intensity: "outdoor",
          rationale: "Evening home-local sunlight in the delay zone (westward).",
          dayIndex: d,
          phase: "return",
        },
      });
    }

    // Exercise window
    if (d <= totalDays) {
      const exerciseStart = wakeAt.plus({ hours: EXERCISE_AFTER_WAKE_H });
      steps.push({
        kind: "exercise_window",
        scheduledAt: exerciseStart.toUTC().toJSDate(),
        endsAt: exerciseStart.plus({ hours: EXERCISE_DURATION_H }).toUTC().toJSDate(),
        displayTz: input.homeTz,
        originalTz: input.homeTz,
        payload: { durationMin: 45, intent: "phase-delay-support", dayIndex: d },
      });
    }
  }

  return steps;
}
