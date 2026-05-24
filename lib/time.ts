import { DateTime } from "luxon";

export function formatInZone(d: Date, zone: string, fmt = "HH:mm"): string {
  return DateTime.fromJSDate(d, { zone }).toFormat(fmt);
}

export function formatDateInZone(d: Date, zone: string): string {
  return DateTime.fromJSDate(d, { zone }).toFormat("ccc LLL d");
}

export function formatFullInZone(d: Date, zone: string): string {
  return DateTime.fromJSDate(d, { zone }).toFormat("ccc LLL d, HH:mm ZZZZ");
}

export function isoZoned(d: Date, zone: string): string {
  return DateTime.fromJSDate(d, { zone }).toISO() ?? "";
}

// "2026-05-17T22:30" interpreted in the given zone → UTC Date.
export function parseLocalDateTime(value: string, zone: string): Date {
  const dt = DateTime.fromISO(value, { zone });
  if (!dt.isValid) throw new Error(`Invalid datetime in ${zone}: ${value}`);
  return dt.toUTC().toJSDate();
}

export function getTimezoneOptions(): string[] {
  // Browser/runtime IANA zone list
  if (typeof Intl !== "undefined" && typeof (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf === "function") {
    return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone");
  }
  return COMMON_TZ;
}

const COMMON_TZ = [
  "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York",
  "America/Toronto", "America/Mexico_City", "America/Sao_Paulo", "Europe/London",
  "Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Europe/Rome", "Europe/Athens",
  "Europe/Moscow", "Africa/Cairo", "Africa/Johannesburg", "Asia/Dubai", "Asia/Karachi",
  "Asia/Kolkata", "Asia/Bangkok", "Asia/Singapore", "Asia/Hong_Kong", "Asia/Tokyo",
  "Asia/Seoul", "Australia/Perth", "Australia/Sydney", "Pacific/Auckland", "Pacific/Honolulu",
];
