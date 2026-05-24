export type Chronotype = "early" | "neutral" | "late";

export type StepKind =
  | "light_seek"
  | "light_avoid_start"
  | "light_avoid_end"
  | "melatonin_dose"
  | "caffeine_cutoff"
  | "sleep_window"
  | "wake"
  | "exercise_window"
  | "watch_set"
  | "mask_on"
  | "mask_off";

export interface ProtocolInput {
  homeTz: string;
  destTz: string;
  habitualBedtimeLocal: string; // "23:00"
  habitualWakeLocal: string; // "07:00"
  chronotype: Chronotype;
  departAt: Date;
  arriveAt: Date;
  returnDepartAt?: Date;
  returnArriveAt?: Date;
}

export interface LightSeekPayload {
  durationMin: number;
  intensity: "outdoor" | "10000lux" | "ambient";
  rationale: string;
  dayIndex: number;
  phase: "preflight" | "arrival" | "return";
}

export interface LightAvoidPayload {
  reason: "antidromic-am" | "antidromic-pm" | "pre-sleep";
  cbtMinAtUtc: string;
  dayIndex: number;
  phase: "preflight" | "arrival" | "return";
}

export interface MelatoninPayload {
  doseMg: number;
  predictedDlmoUtc: string;
  dayIndex: number;
  phase: "preflight" | "inflight" | "arrival";
  rationale: string;
}

export interface SleepPayload {
  plannedHours: number;
  dayIndex: number;
  phase: "preflight" | "inflight" | "arrival" | "return";
}

export interface WakePayload {
  dayIndex: number;
  phase: "preflight" | "arrival" | "return";
}

export interface ExercisePayload {
  durationMin: number;
  intent: "phase-advance-support" | "phase-delay-support" | "general";
  dayIndex: number;
}

export interface CaffeineCutoffPayload {
  rationale: string;
  dayIndex: number;
}

export interface WatchSetPayload {
  fromTz: string;
  toTz: string;
}

export interface MaskPayload {
  rationale: string;
  cbtMinAtUtc: string;
}

export type StepPayload =
  | LightSeekPayload
  | LightAvoidPayload
  | MelatoninPayload
  | SleepPayload
  | WakePayload
  | ExercisePayload
  | CaffeineCutoffPayload
  | WatchSetPayload
  | MaskPayload;

export interface Step {
  kind: StepKind;
  scheduledAt: Date;
  endsAt?: Date;
  displayTz: string;
  originalTz: string;
  payload: StepPayload;
}

export interface GeneratedProtocol {
  steps: Step[];
  baselineCbtMinUtc: Date;
  baselineDlmoUtc: Date;
  direction: "east" | "west" | "none";
  shiftHours: number;
  stayDays: number;
  stayOnOriginTime: boolean;
  engineVersion: string;
}
