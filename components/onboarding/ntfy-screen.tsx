import { OnboardingHeader } from "./header";

function generateRandomTopic(): string {
  // Server-rendered random topic so the placeholder is unique per request
  const id = Math.random().toString(36).slice(2, 12);
  return `lagged-${id}`;
}

export function NtfyScreen({ selectAction }: { selectAction: (fd: FormData) => Promise<void> }) {
  const suggested = generateRandomTopic();
  return (
    <>
      <OnboardingHeader />
      <div className="flex flex-col flex-1">
        <section className="px-8 pt-6 pb-10 text-center">
          <h1 className="text-[2rem] leading-[1.15] font-medium tracking-tight whitespace-pre-line">
            {"Where should we send\nyour notifications?"}
          </h1>
          <p className="mt-4 text-[1rem] text-[#1a1d22]/60 px-2 leading-relaxed">
            Pick a unique ntfy topic. Install the ntfy app, subscribe to this topic, and you&apos;ll
            get a push at each step (melatonin, sunglasses, sleep, wake).
          </p>
        </section>

        <section className="bg-white flex-1 flex flex-col px-8 py-8">
          <form action={selectAction} className="space-y-6">
            <input type="hidden" name="step" value="ntfy" />
            <input
              name="value"
              defaultValue={suggested}
              pattern="[a-zA-Z0-9_\-]{6,64}"
              required
              minLength={6}
              maxLength={64}
              className="block w-full rounded-lg border-2 border-[#1a1d22]/10 bg-white px-4 py-4 font-mono text-lg focus:border-[#3FB89A] focus:outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-[#3FB89A] py-4 text-center text-[1.4rem] font-medium text-white hover:bg-[#3FB89A]/90"
            >
              Finish
            </button>
          </form>
          <form action={selectAction} className="mt-4">
            <input type="hidden" name="step" value="ntfy" />
            <input type="hidden" name="value" value="" />
            <button
              type="submit"
              className="w-full py-3 text-center text-[1.1rem] text-[#E89485] hover:bg-black/[0.02] rounded-lg"
            >
              Skip notifications for now
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
