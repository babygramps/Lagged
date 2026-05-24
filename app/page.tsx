import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const session = await auth();
  return (
    <main className="container max-w-3xl py-20">
      <h1 className="text-5xl font-bold tracking-tight">Lagged</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        A circadian protocol that follows your itinerary. Built on the Burgess/Khalsa light
        PRC, Burgess 2010 melatonin PRC, and Eastman pre-flight advance — generated
        per-trip, delivered as ntfy notifications at each step.
      </p>

      <div className="mt-10 flex gap-3">
        {session?.user ? (
          <Button asChild>
            <Link href="/trips">Your trips</Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href="/signin">Sign in</Link>
          </Button>
        )}
      </div>

      <section className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3 text-sm">
        <div>
          <h3 className="font-semibold">Itinerary-driven</h3>
          <p className="mt-2 text-muted-foreground">
            Any origin, any destination, any direction. Engine reads your tz pair and
            departure instant — DST and short-circle Pacific crossings handled.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">Antidromic-prevention</h3>
          <p className="mt-2 text-muted-foreground">
            Sunglasses windows on arrival mornings prevent the body clock from drifting
            the wrong direction (Roach & Sargent 2019).
          </p>
        </div>
        <div>
          <h3 className="font-semibold">0.5 mg melatonin, timed</h3>
          <p className="mt-2 text-muted-foreground">
            Doses placed 3h pre-predicted-DLMO, Days 1–4 eastward only. No melatonin on
            westward returns.
          </p>
        </div>
      </section>
    </main>
  );
}
