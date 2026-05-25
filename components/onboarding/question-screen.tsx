import { OnboardingHeader } from "./header";

export interface OnboardingOption {
  id: string;
  label: string;
  outlier?: boolean; // renders in coral instead of teal
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
      <div className="flex flex-col flex-1">
        <section className="px-8 pt-6 pb-10 text-center">
          <h1 className="text-[2rem] leading-[1.15] font-medium tracking-tight whitespace-pre-line">
            {question}
          </h1>
          {hint ? (
            <a
              href={hint.href ?? "#"}
              className="mt-6 inline-block text-[1.05rem] font-medium text-[#3FB89A]"
            >
              {hint.label}
            </a>
          ) : null}
        </section>

        <section className="bg-white flex-1 flex flex-col">
          {options.map((opt, i) => (
            <form key={opt.id} action={selectAction} className="border-b border-black/[0.06] last:border-b-0">
              <input type="hidden" name="step" value={step} />
              <input type="hidden" name="value" value={opt.id} />
              <button
                type="submit"
                className={`w-full py-5 text-center text-[1.6rem] font-medium ${
                  opt.outlier ? "text-[#E89485]" : "text-[#3FB89A]"
                } hover:bg-black/[0.02] transition-colors`}
              >
                {opt.label}
              </button>
              {i === options.length - 1 ? null : null}
            </form>
          ))}
        </section>
      </div>
    </>
  );
}
