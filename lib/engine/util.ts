import { DateTime } from "luxon";

export function parseHHMM(value: string): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) throw new Error(`Invalid HH:MM string: ${value}`);
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`Out-of-range HH:MM: ${value}`);
  }
  return { hour, minute };
}

export function dtInZoneOnDate(
  isoDate: string, // "2026-05-17"
  hhmm: string,
  zone: string,
): DateTime {
  const { hour, minute } = parseHHMM(hhmm);
  return DateTime.fromObject({ year: yearOf(isoDate), month: monthOf(isoDate), day: dayOf(isoDate), hour, minute }, { zone });
}

function yearOf(s: string) { return Number(s.slice(0, 4)); }
function monthOf(s: string) { return Number(s.slice(5, 7)); }
function dayOf(s: string) { return Number(s.slice(8, 10)); }

export function isoDateInZone(d: Date, zone: string): string {
  return DateTime.fromJSDate(d, { zone }).toFormat("yyyy-LL-dd");
}

export function diffInHours(later: DateTime, earlier: DateTime): number {
  return later.diff(earlier, "hours").hours;
}

export function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}
