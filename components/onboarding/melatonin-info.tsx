import { OnboardingHeader } from "./header";

export function MelatoninInfo({ selectAction }: { selectAction: (fd: FormData) => Promise<void> }) {
  return (
    <>
      <OnboardingHeader />
      <div className="flex flex-col flex-1">
        <section className="px-8 pt-6 pb-10">
          <p className="text-[1.4rem] leading-[1.3] text-center font-light">
            In the US, melatonin is available over-the-counter, but in some other countries, you need a prescription from your doctor.
          </p>
          <p className="mt-6 text-[1.4rem] leading-[1.3] text-center font-light">
            Lagged uses 0.5 mg fast-release, timed to your predicted DLMO.{" "}
            <span className="text-[#3FB89A]">Why this dose?</span>
          </p>
        </section>

        <section className="bg-white flex-1 flex flex-col">
          <form action={selectAction} className="border-b border-black/[0.06]">
            <input type="hidden" name="step" value="melatonin-info" />
            <input type="hidden" name="value" value="ok" />
            <button
              type="submit"
              className="w-full py-5 text-center text-[1.6rem] font-medium text-[#3FB89A] hover:bg-black/[0.02]"
            >
              Got it!
            </button>
          </form>
          <form action={selectAction}>
            <input type="hidden" name="step" value="melatonin" />
            <input type="hidden" name="value" value="no" />
            <button
              type="submit"
              className="w-full py-5 text-center text-[1.4rem] font-medium text-[#E89485] hover:bg-black/[0.02]"
            >
              Continue without melatonin
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
