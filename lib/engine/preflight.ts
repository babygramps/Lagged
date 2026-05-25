import { DateTime } from "luxon";
import {
  CAFFEINE_CUTOFF_BEFORE_SLEEP_H,
  EXERCISE_AFTER_WAKE_H,
  EXERCISE_DURATION_H,
  LIGHT_SEEK_DURATION_H,
  MELATONIN_DOSE_MG,
  PREFLIGHT_DAYS,
  PREFLIGHT_WAKE_ADVANCE_CAP_H,
  SLEEP_DURATION_H,
} from "./constants";
import type { Baseline } from "./circadian";
import type { ProtocolInput, Step } from "./types";

/**
 * Eastward pre-flight: progressively earlier wake (capped), morning outdoor
 * light, afternoon exercise, evening melatonin. Westward: skipped — passive
 * delay only.
 */
export function emitPreflightSteps(
  input: ProtocolInput,
  baseline: Baseline,
  direction: "east" | "west",
): Step[] {
  if (direction !== "east") return [];
  const steps: Step[] = [];

  const departDay = DateTime.fromJSDate(input.departAt, { zone: input.homeTz }).startOf("day");

  for (let i = PREFLIGHT_DAYS; i >= 1; i--) {
    const day = departDay.minus({ days: i });
    const advance = Math.min(i, PREFLIGHT_WAKE_ADVANCE_CAP_H);
    // Shift wake/bedtime earlier each day (capped at PREFLIGHT_WAKE_ADVANCE_CAP_H)
    const shiftH = PREFLIGHT_DAYS - i + 1; // 1, 2, 3
    const effectiveShift = Math.min(shiftH, PREFLIGHT_WAKE_ADVANCE_CAP_H);

    const wakeAt = DateTime.fromObject(
      {
        year: day.year,
        month: day.month,
        day: day.day,
        hour: baseline.cbtMin.setZone(input.homeTz).hour,
        minute: baseline.cbtMin.setZone(input.homeTz).minute,
      },
      { zone: input.homeTz },
    )
      .plus({ hours: 2, minutes: 30 }) // back to wake from CBTmin
      .minus({ hours: effectiveShift });

    const sleepStart = wakeAt.minus({ hours: SLEEP_DURATION_H });

    steps.push({
      kind: "wake",
      scheduledAt: wakeAt.toUTC().toJSDate(),
      displayTz: input.homeTz,
      originalTz: input.homeTz,
      payload: { dayIndex: -i, phase: "preflight" },
    });

    // Morning outdoor light immediately after wake
    steps.push({
      kind: "light_seek",
      scheduledAt: wakeAt.toUTC().toJSDate(),
      endsAt: wakeAt.plus({ hours: LIGHT_SEEK_DURATION_H }).toUTC().toJSDate(),
      displayTz: input.homeTz,
      originalTz: input.homeTz,
      payload: {
        durationMin: 30,
        intensity: "outdoor",
        rationale: "Morning outdoor light begins the phase advance (Eastman 2005).",
        dayIndex: -i,
        phase: "preflight",
      },
    });

    // Afternoon exercise (advance support; Youngstedt 2019)
    const exerciseStart = wakeAt.plus({ hours: EXERCISE_AFTER_WAKE_H });
    steps.push({
      kind: "exercise_window",
      scheduledAt: exerciseStart.toUTC().toJSDate(),
      endsAt: exerciseStart.plus({ hours: EXERCISE_DURATION_H }).toUTC().toJSDate(),
      displayTz: input.homeTz,
      originalTz: input.homeTz,
      payload: {
        durationMin: 45,
        intent: "phase-advance-support",
        dayIndex: -i,
      },
    });

    // Caffeine cutoff
    const caffeineCutoff = sleepStart.plus({ hours: 24 - CAFFEINE_CUTOFF_BEFORE_SLEEP_H });
    // Caffeine cutoff = sleepStart - 8h
    const caffeineAt = sleepStart.minus({ hours: CAFFEINE_CUTOFF_BEFORE_SLEEP_H });
    steps.push({
      kind: "caffeine_cutoff",
      scheduledAt: caffeineAt.toUTC().toJSDate(),
      displayTz: input.homeTz,
      originalTz: input.homeTz,
      payload: {
        rationale: `No caffeine within ${CAFFEINE_CUTOFF_BEFORE_SLEEP_H}h of planned sleep.`,
        dayIndex: -i,
      },
    });
    void caffeineCutoff;
    void advance;

    // Melatonin on Day -1 always; Days -2 and -3 if heavy shift (handled in caller via shiftHours).
    // Skipped entirely when the user has opted out.
    if (i === 1 && input.usesMelatonin !== false) {
      const melAt = sleepStart.minus({ hours: 5 });
      steps.push({
        kind: "melatonin_dose",
        scheduledAt: melAt.toUTC().toJSDate(),
        displayTz: input.homeTz,
        originalTz: input.homeTz,
        payload: {
          doseMg: MELATONIN_DOSE_MG,
          predictedDlmoUtc: baseline.dlmo.toISO() ?? "",
          dayIndex: -i,
          phase: "preflight",
          rationale: "Pre-flight melatonin pulls DLMO earlier (Burgess 2010).",
        },
      });
    }

    // Sleep window
    steps.push({
      kind: "sleep_window",
      scheduledAt: sleepStart.toUTC().toJSDate(),
      endsAt: wakeAt.toUTC().toJSDate(),
      displayTz: input.homeTz,
      originalTz: input.homeTz,
      payload: { plannedHours: SLEEP_DURATION_H, dayIndex: -i, phase: "preflight" },
    });
  }

  return steps;
}
