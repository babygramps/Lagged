export const ENGINE_VERSION = "engine-2026-05-24-v1";

// Aschoff 1975 / Eastman & Burgess review averages
export const SHIFT_RATE_EAST_H_PER_DAY = 1.0;
export const SHIFT_RATE_WEST_H_PER_DAY = 1.5;

// Sex-based rate modifier (Duffy et al. 2011 PNAS — women τ ≈ 24.09h vs men ≈ 24.19h:
// shorter intrinsic period → slightly faster east advance, slightly slower west delay).
// Cain et al. 2010 J Biol Rhythms — women show slightly larger melatonin response to light.
// Effects are small but real; magnitudes here are conservative reads of those datasets.
export const SHIFT_RATE_SEX_MODIFIER_H_PER_DAY = {
  female: { east: +0.10, west: -0.10 },
  male:   { east: -0.05, west: +0.05 },
  other:  { east:  0.00, west:  0.00 },
} as const;

// Below this magnitude we do not generate a protocol
export const MIN_SHIFT_HOURS_FOR_PROTOCOL = 3;

// Roach & Sargent 2019: trips shorter than this should stay on origin time
export const MIN_STAY_DAYS_FOR_ADAPTATION = 3;

export const PREFLIGHT_DAYS = 3;
export const PREFLIGHT_WAKE_ADVANCE_CAP_H = 3;

export const MELATONIN_DOSE_MG = 0.5;
export const MELATONIN_DAYS_POST_ARRIVAL = 4;
export const MELATONIN_PRE_DLMO_OFFSET_H = 3; // dose midpoint of 2-4h pre-DLMO window

// Burgess & Eastman 2005 relationships
export const CBT_MIN_BEFORE_WAKE_H = 2.5;
export const DLMO_BEFORE_BED_H = 2;
export const DLMO_TO_CBT_MIN_H = 5; // CBTmin ~5h after DLMO (Burgess 2010)

// Chronotype offsets applied to both DLMO and CBTmin (minutes)
export const CHRONOTYPE_OFFSET_MIN = {
  early: -30,
  neutral: 0,
  late: 30,
} as const;

// Light PRC windows (relative to CBTmin)
export const LIGHT_SEEK_AFTER_CBTMIN_H = 0;
export const LIGHT_SEEK_DURATION_H = 4;
export const LIGHT_AVOID_BEFORE_CBTMIN_H = 4;

// Caffeine cutoff: hours before sleep
export const CAFFEINE_CUTOFF_BEFORE_SLEEP_H = 8;

// Exercise window: hours after wake
export const EXERCISE_AFTER_WAKE_H = 6;
export const EXERCISE_DURATION_H = 2;

// Westward return: forced wakefulness floor (origin-local)
export const RETURN_FORCED_WAKE_UNTIL_LOCAL = "22:30";

// Sleep duration
export const SLEEP_DURATION_H = 8;
