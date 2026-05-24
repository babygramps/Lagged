import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { steps, trips } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrentStepHero } from "@/components/timeline/current-step-hero";
import { Timeline } from "@/components/timeline/timeline";
import { stepToNtfyMessage } from "@/lib/ntfy/format";
import { formatFullInZone, formatInZone } from "@/lib/time";

type Params = { params: Promise<{ id: string }> };

export default async function TripPage({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user!.id!;

  const trip = await db.query.trips.findFirst({
    where: and(eq(trips.id, id), eq(trips.userId, userId)),
  });
  if (!trip) notFound();

  const stepRows = await db.query.steps.findMany({
    where: eq(steps.tripId, id),
    orderBy: asc(steps.scheduledAt),
  });

  // Pick current/next step
  const now = Date.now();
  const active = stepRows.find((s) => {
    const start = s.scheduledAt.getTime();
    const end = (s.endsAt ?? new Date(start + 30 * 60_000)).getTime();
    return start <= now && now <= end && !s.completedAt;
  });
  const next = active ?? stepRows.find((s) => s.scheduledAt.getTime() > now && !s.completedAt);

  const heroStep = next
    ? (() => {
        const msg = stepToNtfyMessage({
          kind: next.kind,
          scheduledAt: next.scheduledAt,
          endsAt: next.endsAt ?? undefined,
          displayTz: next.displayTz,
          payload: (next.payload ?? {}) as Record<string, unknown>,
        });
        return {
          id: next.id,
          kind: next.kind,
          scheduledAt: next.scheduledAt.toISOString(),
          endsAt: next.endsAt?.toISOString() ?? null,
          displayTime: formatInZone(next.scheduledAt, trip.destTz),
          title: msg.title,
          body: msg.body,
          completedAt: next.completedAt?.toISOString() ?? null,
        };
      })()
    : null;

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{trip.label}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {trip.originTz} → {trip.destTz} · depart {formatFullInZone(trip.departAt, trip.originTz)}
          </p>
        </div>
        <Badge variant={trip.direction === "east" ? "east" : trip.direction === "west" ? "west" : "muted"}>
          {trip.direction.toUpperCase()} {trip.shiftHours > 0 ? "+" : ""}{trip.shiftHours}h
        </Badge>
      </header>

      <CurrentStepHero step={heroStep} tripId={trip.id} isActive={!!active} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All steps (destination time)</CardTitle>
        </CardHeader>
        <CardContent>
          {stepRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No protocol steps were generated — shift too small or stay too short to benefit from adaptation.
            </p>
          ) : (
            <Timeline
              steps={stepRows.map((s) => ({
                id: s.id,
                kind: s.kind,
                scheduledAt: s.scheduledAt,
                endsAt: s.endsAt,
                displayTz: s.displayTz,
                originalTz: s.originalTz,
                payload: (s.payload ?? {}) as Record<string, unknown>,
                completedAt: s.completedAt,
              }))}
              destTz={trip.destTz}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
