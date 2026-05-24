import { DateTime } from "luxon";
import {
  CBT_MIN_BEFORE_WAKE_H,
  CHRONOTYPE_OFFSET_MIN,
  DLMO_BEFORE_BED_H,
  SHIFT_RATE_EAST_H_PER_DAY,
  SHIFT_RATE_WEST_H_PER_DAY,
} from "./constants";
import type { Chronotype, ProtocolInput } from "./types";
import { dtInZoneOnDate, isoDateInZone } from "./util";

export interface Baseline {
  cbtMin: DateTime; // UTC instant
  dlmo: DateTime;
}

/**
 * Burgess & Eastman 2005:
 *   CBTmin ≈ habitualWake − 2.5h
 *   DLMO   ≈ habitualBedtime − 2h
 *
 * Chronotype adjusts both markers by ±30 min.
 *
 * Anchor: the calendar day in homeTz one week before departure — far enough
 * back that no pre-flight adjustments have started yet. We pick the wake on
 * that anchor date, then place the prior bedtime on the previous calendar day
 * (since bedtime 23:00 + wake 07:00 means bedtime is the evening before).
 */
export function baselineMarkers(input: ProtocolInput): Baseline {
  const anchorDate = isoDateInZone(
    new Date(input.departAt.getTime() - 7 * 86400_000),
    input.homeTz,
  );
  const offsetMin = CHRONOTYPE_OFFSET_MIN[input.chronotype];

  const wake = dtInZoneOnDate(anchorDate, input.habitualWakeLocal, input.homeTz);

  // Bedtime: same calendar day if late-evening (e.g. 23:00), else previous day
  // The rule: if bedtime hour < 12 (e.g. 01:00), treat as same-day post-midnight.
  // Otherwise treat bedtime as the evening of the previous day relative to wake.
  const bedHour = Number(input.habitualBedtimeLocal.slice(0, input.habitualBedtimeLocal.indexOf(":")));
  const bedAnchorOffset = bedHour >= 18 ? -1 : 0;
  const bedDate = isoDateInZone(
    new Date(wake.toJSDate().getTime() + bedAnchorOffset * 86400_000),
    input.homeTz,
  );
  const bed = dtInZoneOnDate(bedDate, input.habitualBedtimeLocal, input.homeTz);

  const cbtMin = wake.minus({ hours: CBT_MIN_BEFORE_WAKE_H }).plus({ minutes: offsetMin }).toUTC();
  const dlmo = bed.minus({ hours: DLMO_BEFORE_BED_H }).plus({ minutes: offsetMin }).toUTC();

  return { cbtMin, dlmo };
}

/**
 * Determine direction and signed shift hours from origin tz to destination tz
 * at the time of departure. Positive = east (advance the clock).
 *
 * Implementation: compute the wall-clock offset difference at `departAt` so DST
 * is respected.
 */
export function shiftAtInstant(originTz: string, destTz: string, at: Date): {
  shiftHours: number;
  direction: "east" | "west" | "none";
} {
  const o = DateTime.fromJSDate(at, { zone: originTz }).offset; // minutes from UTC
  const d = DateTime.fromJSDate(at, { zone: destTz }).offset;
  const diffMin = d - o;
  // Choose the shorter circle: ±12h is the boundary.
  let signed = diffMin;
  if (signed > 12 * 60) signed -= 24 * 60;
  if (signed < -12 * 60) signed += 24 * 60;
  const shiftHours = signed / 60;
  const direction = shiftHours > 0 ? "east" : shiftHours < 0 ? "west" : "none";
  return { shiftHours, direction };
}

/**
 * Project the baseline CBTmin (anchored to some pre-trip date) onto the
 * destination calendar day of `arrivalAt`, preserving the destination
 * wall-clock HH:MM. This is the "Day 0" CBTmin — the body clock hasn't moved
 * yet, but we render it in the destination timezone.
 */
export function projectBaselineToArrivalDay(
  baselineCbtMin: DateTime,
  destTz: string,
  arrivalAt: Date,
): DateTime {
  const baselineInDest = baselineCbtMin.setZone(destTz);
  const arrivalInDest = DateTime.fromJSDate(arrivalAt, { zone: destTz });
  return DateTime.fromObject(
    {
      year: arrivalInDest.year,
      month: arrivalInDest.month,
      day: arrivalInDest.day,
      hour: baselineInDest.hour,
      minute: baselineInDest.minute,
    },
    { zone: destTz },
  );
}

/**
 * Per-day cumulative shifted CBTmin during adaptation in destination.
 *
 * Eastward advance = subtract `rate * dayIndex` hours from the day-0 CBTmin.
 * Westward delay = add. Caps at target shift magnitude.
 *
 * `dayZeroCbtMin` must already be projected to the destination calendar day
 * of arrival via projectBaselineToArrivalDay().
 */
export function shiftedCbtMin(
  dayZeroCbtMin: DateTime,
  dayIndex: number,
  direction: "east" | "west",
  targetShiftHours: number, // signed
): DateTime {
  const rate = direction === "east" ? SHIFT_RATE_EAST_H_PER_DAY : SHIFT_RATE_WEST_H_PER_DAY;
  const target = Math.abs(targetShiftHours);
  const magnitude = Math.min(rate * dayIndex, target);
  const dayShifted = dayZeroCbtMin.plus({ days: dayIndex });
  return direction === "east"
    ? dayShifted.minus({ hours: magnitude })
    : dayShifted.plus({ hours: magnitude });
}

/** Days needed to fully shift to target. */
export function daysToAdapt(direction: "east" | "west", targetShiftHours: number): number {
  if (direction === "east") return Math.ceil(Math.abs(targetShiftHours) / SHIFT_RATE_EAST_H_PER_DAY);
  return Math.ceil(Math.abs(targetShiftHours) / SHIFT_RATE_WEST_H_PER_DAY);
}

export type { Chronotype };
