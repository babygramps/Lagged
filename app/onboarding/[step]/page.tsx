import { notFound } from "next/navigation";
import { BEDTIME_OPTIONS, WAKE_OPTIONS } from "@/lib/engine/categorical";
import { QuestionScreen } from "@/components/onboarding/question-screen";
import { selectAnswer } from "../actions";
import { ONBOARDING_STEPS, type OnboardingStep } from "../steps";
import { MelatoninInfo } from "@/components/onboarding/melatonin-info";
import { HomeTzScreen } from "@/components/onboarding/home-tz-screen";
import { NtfyScreen } from "@/components/onboarding/ntfy-screen";

type Params = { params: Promise<{ step: string }> };

export default async function OnboardingStepPage({ params }: Params) {
  const { step } = await params;
  if (!ONBOARDING_STEPS.includes(step as OnboardingStep)) notFound();
  const s = step as OnboardingStep;

  if (s === "bedtime") {
    return (
      <QuestionScreen
        step={s}
        question={"When do you normally\nfall asleep?"}
        hint={{ label: "Why only whole hours?" }}
        options={BEDTIME_OPTIONS.map((o) => ({ id: o.id, label: o.label, outlier: o.outlier }))}
        selectAction={selectAnswer}
      />
    );
  }
  if (s === "wake") {
    return (
      <QuestionScreen
        step={s}
        question={"When do you normally\nwake up?"}
        hint={{ label: "Why only whole hours?" }}
        options={WAKE_OPTIONS.map((o) => ({ id: o.id, label: o.label, outlier: o.outlier }))}
        selectAction={selectAnswer}
      />
    );
  }
  if (s === "sex") {
    return (
      <QuestionScreen
        step={s}
        question={"What's your sex?"}
        hint={{ label: "Why are you asking?" }}
        options={[
          { id: "female", label: "Female" },
          { id: "male", label: "Male" },
          { id: "other", label: "Other" },
        ]}
        selectAction={selectAnswer}
      />
    );
  }
  if (s === "melatonin") {
    return (
      <QuestionScreen
        step={s}
        question={"Would you like to\nuse melatonin to\ntimeshift faster?"}
        hint={{ label: "Tell me more about melatonin" }}
        options={[
          { id: "yes", label: "Yes, please" },
          { id: "no", label: "No, thanks", outlier: true },
        ]}
        selectAction={selectAnswer}
      />
    );
  }
  if (s === "melatonin-info") {
    return <MelatoninInfo selectAction={selectAnswer} />;
  }
  if (s === "home") {
    return <HomeTzScreen selectAction={selectAnswer} />;
  }
  if (s === "ntfy") {
    return <NtfyScreen selectAction={selectAnswer} />;
  }
  return null;
}
