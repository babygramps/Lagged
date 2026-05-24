import { DateTime } from "luxon";
import {
  CAFFEINE_CUTOFF_BEFORE_SLEEP_H,
  DLMO_TO_CBT_MIN_H,
  EXERCISE_AFTER_WAKE_H,
  EXERCISE_DURATION_H,
  LIGHT_AVOID_BEFORE_CBTMIN_H,
  LIGHT_SEEK_AFTER_CBTMIN_H,
  LIGHT_SEEK_DURATION_H,
  MELATONIN_DAYS_POST_ARRIVAL,
  MELATONIN_DOSE_MG,
  MELATONIN_PRE_DLMO_OFFSET_H,
  SHIFT_RATE_EAST_H_PER_DAY,
  SHIFT_RATE_WEST_H_PER_DAY,
  SLEEP_DURATION_H,
} from "./constants";
import type { Baseline } from "./circadian";
import { projectBaselineToArrivalDay, shiftedCbtMin } from "./circadian";
import type { ProtocolInput, Step } from "./types";

/**
 * Burgess/Khalsa light PRC application during destination adaptation.
 * Emits one cycle's worth of steps per day until target shift is reached,
 * then continues sleep/wake at fully-shifted times for the remainder of the
 * stay.
 */
export function emitArrivalSteps(
  input: ProtocolInput,
  baseline: Baseline,
  direction: "east" | "west",
  shiftHours: number, // signed
  stayEnd: DateTime, // last instant of dest stay (UTC)
): Step[] {
  const steps: Step[] = [];
  const rate = direction === "east" ? SHIFT_RATE_EAST_H_PER_DAY : SHIFT_RATE_WEST_H_PER_DAY;
  const totalDaysToAdapt = Math.ceil(Math.abs(shiftHours) / rate);
  const dayZeroCbtMin = projectBaselineToArrivalDay(baseline.cbtMin, input.destTz, input.arriveAt);

  // For each adaptation day d=0..N, compute markers
  for (let d = 0; d <= totalDaysToAdapt + 10; d++) {
    const cbtMin = shiftedCbtMin(dayZeroCbtMin, d, direction, shiftHours);
    // Day window roughly = [cbtMin - 12h, cbtMin + 12h]; we use cbtMin as anchor
    if (cbtMin.toMillis() > stayEnd.toMillis() + 86400_000) break;

    const dlmo = cbtMin.minus({ hours: DLMO_TO_CBT_MIN_H });
    // Bedtime = DLMO + 2h; Wake = bedtime + 8h
    const bedtime = dlmo.plus({ hours: 2 });
    const wakeTime = bedtime.plus({ hours: SLEEP_DURATION_H });

    if (direction === "east") {
      // Light avoid: cbtMin - 4h .. cbtMin (antidromic delay zone)
      const avoidStart = cbtMin.minus({ hours: LIGHT_AVOID_BEFORE_CBTMIN_H });
      const avoidEnd = cbtMin;
      // On Day 0, sunglasses-from-waking rule: if arrival is before avoidStart,
      // extend the avoid window from arrival until CBTmin.
      const effectiveAvoidStart = d === 0
        ? DateTime.min(avoidStart, DateTime.fromJSDate(input.arriveAt))
        : avoidStart;

      if (effectiveAvoidStart.toMillis() < stayEnd.toMillis() && d <= totalDaysToAdapt) {
        steps.push({
          kind: "light_avoid_start",
          scheduledAt: effectiveAvoidStart.toUTC().toJSDate(),
          displayTz: input.destTz,
          originalTz: input.destTz,
          payload: {
            reason: d === 0 ? "antidromic-am" : "antidromic-am",
            cbtMinAtUtc: cbtMin.toISO() ?? "",
            dayIndex: d,
            phase: "arrival",
          },
        });
        steps.push({
          kind: "light_avoid_end",
          scheduledAt: avoidEnd.toUTC().toJSDate(),
          displayTz: input.destTz,
          originalTz: input.destTz,
          payload: {
            reason: "antidromic-am",
            cbtMinAtUtc: cbtMin.toISO() ?? "",
            dayIndex: d,
            phase: "arrival",
          },
        });
      }
    }

    // Light seek
    const seekStart = direction === "east"
      ? cbtMin.plus({ hours: LIGHT_SEEK_AFTER_CBTMIN_H })
      : cbtMin.plus({ hours: 4 }); // westward: seek light later in subjective evening
    const seekEnd = seekStart.plus({ hours: LIGHT_SEEK_DURATION_H });
    if (seekStart.toMillis() < stayEnd.toMillis() && d <= totalDaysToAdapt) {
      steps.push({
        kind: "light_seek",
        scheduledAt: seekStart.toUTC().toJSDate(),
        endsAt: seekEnd.toUTC().toJSDate(),
        displayTz: input.destTz,
        originalTz: input.destTz,
        payload: {
          durationMin: 60,
          intensity: "outdoor",
          rationale:
            direction === "east"
              ? "Light in the 4h after CBTmin advances the clock (Khalsa PRC)."
              : "Light in the evening delay zone reinforces westward delay.",
          dayIndex: d,
          phase: "arrival",
        },
      });
    }

    // Melatonin (eastward only, Days 1..MELATONIN_DAYS_POST_ARRIVAL)
    if (direction === "east" && d >= 1 && d <= MELATONIN_DAYS_POST_ARRIVAL) {
      const melAt = dlmo.minus({ hours: MELATONIN_PRE_DLMO_OFFSET_H });
      if (melAt.toMillis() < stayEnd.toMillis()) {
        steps.push({
          kind: "melatonin_dose",
          scheduledAt: melAt.toUTC().toJSDate(),
          displayTz: input.destTz,
          originalTz: input.destTz,
          payload: {
            doseMg: MELATONIN_DOSE_MG,
            predictedDlmoUtc: dlmo.toISO() ?? "",
            dayIndex: d,
            phase: "arrival",
            rationale: `0.5 mg taken ${MELATONIN_PRE_DLMO_OFFSET_H}h pre-DLMO (Burgess 2010 advance peak).`,
          },
        });
      }
    }

    // Sleep window
    if (bedtime.toMillis() < stayEnd.toMillis()) {
      steps.push({
        kind: "sleep_window",
        scheduledAt: bedtime.toUTC().toJSDate(),
        endsAt: wakeTime.toUTC().toJSDate(),
        displayTz: input.destTz,
        originalTz: input.destTz,
        payload: { plannedHours: SLEEP_DURATION_H, dayIndex: d, phase: "arrival" },
      });
      steps.push({
        kind: "wake",
        scheduledAt: wakeTime.toUTC().toJSDate(),
        displayTz: input.destTz,
        originalTz: input.destTz,
        payload: { dayIndex: d, phase: "arrival" },
      });
    }

    // Caffeine cutoff = bedtime - 8h
    const caffeineAt = bedtime.minus({ hours: CAFFEINE_CUTOFF_BEFORE_SLEEP_H });
    if (caffeineAt.toMillis() < stayEnd.toMillis() && caffeineAt.toMillis() > input.arriveAt.getTime()) {
      steps.push({
        kind: "caffeine_cutoff",
        scheduledAt: caffeineAt.toUTC().toJSDate(),
        displayTz: input.destTz,
        originalTz: input.destTz,
        payload: {
          rationale: `No caffeine within ${CAFFEINE_CUTOFF_BEFORE_SLEEP_H}h of planned sleep.`,
          dayIndex: d,
        },
      });
    }

    // Exercise window (only while adapting + first stable day)
    if (d <= totalDaysToAdapt + 1) {
      const exerciseStart = wakeTime.plus({ hours: EXERCISE_AFTER_WAKE_H });
      const exerciseEnd = exerciseStart.plus({ hours: EXERCISE_DURATION_H });
      if (exerciseStart.toMillis() < stayEnd.toMillis()) {
        steps.push({
          kind: "exercise_window",
          scheduledAt: exerciseStart.toUTC().toJSDate(),
          endsAt: exerciseEnd.toUTC().toJSDate(),
          displayTz: input.destTz,
          originalTz: input.destTz,
          payload: {
            durationMin: 45,
            intent: direction === "east" ? "phase-advance-support" : "phase-delay-support",
            dayIndex: d,
          },
        });
      }
    }
  }

  return steps;
}
