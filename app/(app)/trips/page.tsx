import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { trips } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateInZone } from "@/lib/time";

export default async function TripsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const rows = await db.query.trips.findMany({
    where: eq(trips.userId, userId),
    orderBy: desc(trips.departAt),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Trips</h1>
        <Button asChild>
          <Link href="/trips/new">New trip</Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No trips yet. <Link href="/trips/new" className="text-primary underline">Create one</Link>.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rows.map((t) => (
            <Card key={t.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg">
                    <Link href={`/trips/${t.id}`} className="hover:underline">
                      {t.label}
                    </Link>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {formatDateInZone(t.departAt, t.originTz)} → {formatDateInZone(t.arriveAt, t.destTz)}
                  </CardDescription>
                </div>
                <Badge variant={t.direction === "east" ? "east" : t.direction === "west" ? "west" : "muted"}>
                  {t.direction.toUpperCase()} {t.shiftHours > 0 ? "+" : ""}{t.shiftHours}h
                </Badge>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t.originTz} → {t.destTz}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
