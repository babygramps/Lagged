import { DateTime } from "luxon";
import type { StepKind } from "@/lib/engine/types";

interface NtfyMessage {
  title: string;
  body: string;
  tags: string[];
  priority: 1 | 2 | 3 | 4 | 5;
}

export interface FormattableStep {
  kind: StepKind;
  scheduledAt: Date;
  endsAt?: Date;
  displayTz: string;
  payload: Record<string, unknown>;
}

const KIND_META: Record<StepKind, { title: string; tags: string[]; priority: 1 | 2 | 3 | 4 | 5 }> = {
  light_seek: { title: "Bright light now", tags: ["sun", "sunny"], priority: 4 },
  light_avoid_start: { title: "Sunglasses on", tags: ["dark_sunglasses"], priority: 4 },
  light_avoid_end: { title: "Sunglasses off", tags: ["eyes"], priority: 3 },
  melatonin_dose: { title: "Melatonin 0.5 mg", tags: ["pill"], priority: 5 },
  caffeine_cutoff: { title: "No more caffeine", tags: ["coffee", "no_entry"], priority: 2 },
  sleep_window: { title: "Time to sleep", tags: ["sleeping_bed"], priority: 4 },
  wake: { title: "Wake up", tags: ["alarm_clock"], priority: 5 },
  exercise_window: { title: "Move — 30 min", tags: ["running"], priority: 3 },
  watch_set: { title: "Set watch to destination tz", tags: ["watch"], priority: 3 },
  mask_on: { title: "Eye mask on", tags: ["sleeping_bed"], priority: 3 },
  mask_off: { title: "Mask off — light now", tags: ["sunrise"], priority: 4 },
};

export function stepToNtfyMessage(step: FormattableStep): NtfyMessage {
  const meta = KIND_META[step.kind];
  return { ...meta, body: bodyFor(step) };
}

function bodyFor(step: FormattableStep): string {
  const p = step.payload;
  const localTime = DateTime.fromJSDate(step.scheduledAt, { zone: step.displayTz }).toFormat("HH:mm");
  switch (step.kind) {
    case "light_seek":
      return `${(p as { durationMin?: number }).durationMin ?? 60} min ${(p as { intensity?: string }).intensity ?? "outdoor"}. ${(p as { rationale?: string }).rationale ?? ""}`.trim();
    case "light_avoid_start":
      return `Wear dark sunglasses. Avoid bright light until CBTmin (~${windowEndStr(step)}).`;
    case "light_avoid_end":
      return `CBTmin has passed. Light now advances the clock.`;
    case "melatonin_dose":
      return `${(p as { doseMg?: number }).doseMg ?? 0.5} mg fast-release. ${(p as { rationale?: string }).rationale ?? ""}`.trim();
    case "caffeine_cutoff":
      return `${(p as { rationale?: string }).rationale ?? ""}`;
    case "sleep_window":
      return `~${(p as { plannedHours?: number }).plannedHours ?? 8}h. Blackout dark, ${localTime} start.`;
    case "wake":
      return `Up at ${localTime}. Open blinds.`;
    case "exercise_window":
      return `${(p as { durationMin?: number }).durationMin ?? 45} min — ${(p as { intent?: string }).intent ?? "general"}.`;
    case "watch_set":
      return `From ${(p as { fromTz?: string }).fromTz} → ${(p as { toTz?: string }).toTz}.`;
    case "mask_on":
      return `Through cabin lighting. ${(p as { rationale?: string }).rationale ?? ""}`.trim();
    case "mask_off":
      return `Embrace cabin/window light.`;
    default:
      return "";
  }
}

function windowEndStr(step: FormattableStep): string {
  if (!step.endsAt) return "soon";
  return DateTime.fromJSDate(step.endsAt, { zone: step.displayTz }).toFormat("HH:mm");
}
