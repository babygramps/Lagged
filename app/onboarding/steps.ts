export const ONBOARDING_STEPS = [
  "bedtime",
  "wake",
  "sex",
  "melatonin",
  "melatonin-info", // shown only after melatonin = yes
  "home",
  "ntfy",
  "done",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export function nextStep(current: OnboardingStep, picked?: string): OnboardingStep {
  const idx = ONBOARDING_STEPS.indexOf(current);
  // Skip melatonin-info if the user said no
  if (current === "melatonin" && picked === "no") {
    return "home";
  }
  return ONBOARDING_STEPS[Math.min(idx + 1, ONBOARDING_STEPS.length - 1)];
}

export function prevStep(current: OnboardingStep): OnboardingStep | null {
  const idx = ONBOARDING_STEPS.indexOf(current);
  if (idx <= 0) return null;
  return ONBOARDING_STEPS[idx - 1];
}
