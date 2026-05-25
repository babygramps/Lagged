import { OnboardingHeader } from "./header";

export interface OnboardingOption {
  id: string;
  label: string;
  outlier?: boolean;
  description?: string;
}

interface Props {
  step: string;
  question: string;
  hint?: { label: string; href?: string };
  options: OnboardingOption[];
  selectAction: (formData: FormData) => Promise<void>;
}

export function QuestionScreen({ step, question, hint, options, selectAction }: Props) {
  return (
    <>
      <OnboardingHeader />
      <section className="flex-[1.3] flex flex-col items-center justify-center px-8 pb-8 text-center">
        <h1 className="text-[2.6rem] leading-[1.1] font-normal tracking-tight whitespace-pre-line">
          {question}
        </h1>
        {hint ? (
          <a
            href={hint.href ?? "#"}
            className="mt-8 inline-block text-[1.05rem] font-medium text-[#3FB89A]"
          >
            {hint.label}
          </a>
        ) : null}
      </section>

      <section className="flex-1 bg-white flex flex-col">
        {options.map((opt) => (
          <form
            key={opt.id}
            action={selectAction}
            className="flex-1 border-b border-black/[0.05] last:border-b-0 flex"
          >
            <input type="hidden" name="step" value={step} />
            <input type="hidden" name="value" value={opt.id} />
            <button
              type="submit"
              className={`flex-1 text-center text-[1.55rem] font-medium tracking-tight ${
                opt.outlier ? "text-[#E89485]" : "text-[#3FB89A]"
              } hover:bg-black/[0.02] active:bg-black/[0.04] transition-colors`}
            >
              {opt.label}
            </button>
          </form>
        ))}
      </section>
    </>
  );
}
