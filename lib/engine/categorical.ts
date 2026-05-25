import type { Chronotype } from "./types";

/**
 * Timeshifter-style categorical answers for habitual fall-asleep time. These
 * map to wall-clock HH:MM in the user's home tz. Outliers ("before 9pm",
 * "after 2am") are clamped to a sensible representative value.
 */
export const BEDTIME_OPTIONS = [
  { id: "before-9pm", label: "Before 9pm", hhmm: "20:00", outlier: true },
  { id: "9pm",        label: "9pm",         hhmm: "21:00", outlier: false },
  { id: "10pm",       label: "10pm",        hhmm: "22:00", outlier: false },
  { id: "11pm",       label: "11pm",        hhmm: "23:00", outlier: false },
  { id: "12am",       label: "12am",        hhmm: "00:00", outlier: false },
  { id: "1am",        label: "1am",         hhmm: "01:00", outlier: false },
  { id: "2am",        label: "2am",         hhmm: "02:00", outlier: false },
  { id: "after-2am",  label: "After 2am",   hhmm: "03:00", outlier: true },
] as const;

export const WAKE_OPTIONS = [
  { id: "before-6am", label: "Before 6am", hhmm: "05:00", outlier: true },
  { id: "6am",        label: "6am",         hhmm: "06:00", outlier: false },
  { id: "7am",        label: "7am",         hhmm: "07:00", outlier: false },
  { id: "8am",        label: "8am",         hhmm: "08:00", outlier: false },
  { id: "after-8am",  label: "After 8am",   hhmm: "09:00", outlier: true },
] as const;

export type BedtimeId = (typeof BEDTIME_OPTIONS)[number]["id"];
export type WakeId = (typeof WAKE_OPTIONS)[number]["id"];

export function bedtimeIdToHhmm(id: BedtimeId): string {
  return BEDTIME_OPTIONS.find((o) => o.id === id)!.hhmm;
}
export function wakeIdToHhmm(id: WakeId): string {
  return WAKE_OPTIONS.find((o) => o.id === id)!.hhmm;
}

/**
 * Infer chronotype from the categorical bedtime + wake times.
 * Larks (early): early bedtime AND early wake.
 * Owls (late): late bedtime AND late wake.
 * Everyone else: neutral.
 */
export function inferChronotype(bedtimeId: BedtimeId, wakeId: WakeId): Chronotype {
  const earlyBed = bedtimeId === "before-9pm" || bedtimeId === "9pm" || bedtimeId === "10pm";
  const earlyWake = wakeId === "before-6am" || wakeId === "6am";
  const lateBed = bedtimeId === "1am" || bedtimeId === "2am" || bedtimeId === "after-2am";
  const lateWake = wakeId === "after-8am";

  if (earlyBed && earlyWake) return "early";
  if (lateBed && lateWake) return "late";
  if (earlyBed || earlyWake) return "early";
  if (lateBed || lateWake) return "late";
  return "neutral";
}

/** Reverse lookup: HH:MM → categorical id (used to re-render existing answers). */
export function hhmmToBedtimeId(hhmm: string): BedtimeId | undefined {
  return BEDTIME_OPTIONS.find((o) => o.hhmm === hhmm)?.id;
}
export function hhmmToWakeId(hhmm: string): WakeId | undefined {
  return WAKE_OPTIONS.find((o) => o.hhmm === hhmm)?.id;
}
