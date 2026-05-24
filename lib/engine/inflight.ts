import { DateTime } from "luxon";
import type { Baseline } from "./circadian";
import { projectBaselineToArrivalDay, shiftedCbtMin } from "./circadian";
import type { ProtocolInput, Step } from "./types";

/**
 * In-flight: set watch to dest tz on boarding. Eastward — sleep window through
 * the central block; mask through any cabin "breakfast" lighting until CBTmin
 * has passed (Roach & Sargent 2019 antidromic-prevention).
 */
export function emitInflightSteps(
  input: ProtocolInput,
  baseline: Baseline,
  direction: "east" | "west",
  shiftHours: number,
): Step[] {
  const steps: Step[] = [];

  // Watch-set cue on boarding (use departAt)
  steps.push({
    kind: "watch_set",
    scheduledAt: input.departAt,
    displayTz: input.destTz,
    originalTz: input.homeTz,
    payload: { fromTz: input.homeTz, toTz: input.destTz },
  });

  if (direction === "east") {
    // Sleep central block: 1h after depart through 1h before arrival
    const sleepStart = DateTime.fromJSDate(input.departAt).plus({ hours: 1 });
    const sleepEnd = DateTime.fromJSDate(input.arriveAt).minus({ hours: 1 });

    if (sleepEnd > sleepStart) {
      steps.push({
        kind: "sleep_window",
        scheduledAt: sleepStart.toUTC().toJSDate(),
        endsAt: sleepEnd.toUTC().toJSDate(),
        displayTz: input.destTz,
        originalTz: input.destTz,
        payload: { plannedHours: sleepEnd.diff(sleepStart, "hours").hours, dayIndex: 0, phase: "inflight" },
      });

      // Mask on at sleep start
      steps.push({
        kind: "mask_on",
        scheduledAt: sleepStart.toUTC().toJSDate(),
        displayTz: input.destTz,
        originalTz: input.destTz,
        payload: {
          rationale: "Block cabin lighting through the central sleep block.",
          cbtMinAtUtc: baseline.cbtMin.toISO() ?? "",
        },
      });

      // Mask off at later of (arrival - 1h) or arrival-day CBTmin
      const dayZeroCbtMin = projectBaselineToArrivalDay(baseline.cbtMin, input.destTz, input.arriveAt);
      const arrivalCbtMin = shiftedCbtMin(dayZeroCbtMin, 0, direction, shiftHours);
      const maskOff = sleepEnd > arrivalCbtMin ? sleepEnd : arrivalCbtMin;
      steps.push({
        kind: "mask_off",
        scheduledAt: maskOff.toUTC().toJSDate(),
        displayTz: input.destTz,
        originalTz: input.destTz,
        payload: {
          rationale: "After CBTmin passes, light advances the clock (Khalsa PRC).",
          cbtMinAtUtc: arrivalCbtMin.toISO() ?? "",
        },
      });
    }
  } else if (direction === "west") {
    // Westward: stay awake on the flight, post-landing evening light
    const lightStart = DateTime.fromJSDate(input.arriveAt);
    steps.push({
      kind: "light_seek",
      scheduledAt: lightStart.toUTC().toJSDate(),
      endsAt: lightStart.plus({ hours: 2 }).toUTC().toJSDate(),
      displayTz: input.destTz,
      originalTz: input.destTz,
      payload: {
        durationMin: 60,
        intensity: "outdoor",
        rationale: "Evening landing light delays the clock (westward).",
        dayIndex: 0,
        phase: "arrival",
      },
    });
  }

  return steps;
}
