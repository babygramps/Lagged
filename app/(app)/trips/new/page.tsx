import { eq } from "drizzle-orm";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTimezoneOptions } from "@/lib/time";
import { createTrip } from "./actions";

export default async function NewTripPage() {
  const session = await auth();
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, session!.user!.id!) });
  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Set up your profile first</CardTitle>
          <CardDescription>We need your chronotype and habitual sleep window before computing a protocol.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/settings">Go to settings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const tzList = getTimezoneOptions();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">New trip</h1>
      <p className="text-sm text-muted-foreground">
        Any origin, any destination — the engine computes direction and shift from the IANA timezone offsets at departure.
      </p>

      <Card>
        <CardContent className="pt-6">
          <form action={createTrip} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="label">Trip label</Label>
              <Input id="label" name="label" placeholder="SFO → LHR May 2026" required />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="originTz">Origin timezone</Label>
                <select
                  id="originTz"
                  name="originTz"
                  defaultValue={profile.homeTz}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  required
                >
                  {tzList.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="destTz">Destination timezone</Label>
                <select
                  id="destTz"
                  name="destTz"
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  required
                  defaultValue="Europe/London"
                >
                  {tzList.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="departLocal">Depart (origin local)</Label>
                <Input id="departLocal" name="departLocal" type="datetime-local" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="arriveLocal">Arrive (destination local)</Label>
                <Input id="arriveLocal" name="arriveLocal" type="datetime-local" required />
              </div>
            </div>

            <details className="rounded-md border border-border p-4">
              <summary className="cursor-pointer text-sm font-medium">Return leg (optional)</summary>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="returnDepartLocal">Return depart (destination local)</Label>
                  <Input id="returnDepartLocal" name="returnDepartLocal" type="datetime-local" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="returnArriveLocal">Return arrive (origin local)</Label>
                  <Input id="returnArriveLocal" name="returnArriveLocal" type="datetime-local" />
                </div>
              </div>
            </details>

            <Button type="submit" className="w-full">Generate protocol</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
