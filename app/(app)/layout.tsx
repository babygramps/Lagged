import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  // Send first-time users into the Timeshifter-style onboarding. Onboarding
  // lives outside this layout group, so this redirect runs once and unblocks.
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, session.user.id!) });
  if (!profile?.onboardedAt) {
    redirect("/onboarding/bedtime");
  }

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/trips" className="font-semibold">Lagged</Link>
            <nav className="flex gap-4 text-sm text-muted-foreground">
              <Link href="/trips" className="hover:text-foreground">Trips</Link>
              <Link href="/trips/new" className="hover:text-foreground">New trip</Link>
              <Link href="/settings" className="hover:text-foreground">Settings</Link>
            </nav>
          </div>
          <form action={signOutAction}>
            <Button variant="ghost" size="sm" type="submit">Sign out</Button>
          </form>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
