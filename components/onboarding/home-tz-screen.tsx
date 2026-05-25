import { OnboardingHeader } from "./header";
import { getTimezoneOptions } from "@/lib/time";

export function HomeTzScreen({ selectAction }: { selectAction: (fd: FormData) => Promise<void> }) {
  const tzList = getTimezoneOptions();

  return (
    <>
      <OnboardingHeader />
      <div className="flex flex-col flex-1">
        <section className="px-8 pt-6 pb-10 text-center">
          <h1 className="text-[2rem] leading-[1.15] font-medium tracking-tight whitespace-pre-line">
            {"Where do you\nnormally live?"}
          </h1>
          <p className="mt-4 text-[1rem] text-[#1a1d22]/60">
            We need your home timezone to anchor the baseline circadian clock.
          </p>
        </section>

        <section className="bg-white flex-1 flex flex-col px-8 py-8">
          <form action={selectAction} className="space-y-6">
            <input type="hidden" name="step" value="home" />
            <select
              name="value"
              defaultValue="America/Los_Angeles"
              className="block w-full rounded-lg border-2 border-[#1a1d22]/10 bg-white px-4 py-4 text-lg focus:border-[#3FB89A] focus:outline-none"
            >
              {tzList.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="w-full rounded-lg bg-[#3FB89A] py-4 text-center text-[1.4rem] font-medium text-white hover:bg-[#3FB89A]/90"
            >
              Continue
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
