import { NextRequest, NextResponse } from "next/server";
import { and, gte, lte, isNull, sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { steps, profiles, trips } from "@/lib/db/schema";
import { postNtfy } from "@/lib/ntfy/send";
import { stepToNtfyMessage } from "@/lib/ntfy/format";

const MAX_ATTEMPTS = 5;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (expected && provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const upper = new Date(now.getTime() + 5 * 60_000);
  const lower = new Date(now.getTime() - 30 * 60_000);

  const due = await db
    .select({
      step: steps,
      ntfyTopic: profiles.ntfyTopic,
      tripId: trips.id,
      tripLabel: trips.label,
    })
    .from(steps)
    .innerJoin(trips, eq(trips.id, steps.tripId))
    .innerJoin(profiles, eq(profiles.userId, steps.userId))
    .where(
      and(
        isNull(steps.notifiedAt),
        lte(steps.scheduledAt, upper),
        gte(steps.scheduledAt, lower),
        sql`${profiles.ntfyTopic} IS NOT NULL`,
      ),
    )
    .orderBy(steps.scheduledAt)
    .limit(200);

  const host = process.env.AUTH_URL ?? `https://${req.headers.get("host") ?? "lagged.app"}`;

  const results = await Promise.allSettled(
    due.map(async (row) => {
      const msg = stepToNtfyMessage({
        kind: row.step.kind,
        scheduledAt: row.step.scheduledAt,
        endsAt: row.step.endsAt ?? undefined,
        displayTz: row.step.displayTz,
        payload: (row.step.payload ?? {}) as Record<string, unknown>,
      });

      const click = `${host}/trips/${row.tripId}?focus=${row.step.id}`;
      const actions = `view, Mark done, ${host}/api/trips/${row.tripId}/steps/${row.step.id}/complete, method=POST, clear=true`;

      const res = await postNtfy({
        topic: row.ntfyTopic!,
        title: msg.title,
        body: msg.body,
        tags: msg.tags,
        priority: msg.priority,
        click,
        actions,
      });

      if (res.ok) {
        await db
          .update(steps)
          .set({
            notifiedAt: new Date(),
            notifyAttempts: row.step.notifyAttempts + 1,
          })
          .where(eq(steps.id, row.step.id));
        return { id: row.step.id, ok: true };
      }

      const attempts = row.step.notifyAttempts + 1;
      const forceClose = attempts >= MAX_ATTEMPTS;
      await db
        .update(steps)
        .set({
          notifyAttempts: attempts,
          notifiedAt: forceClose ? new Date() : null,
        })
        .where(eq(steps.id, row.step.id));
      if (forceClose) {
        console.error(`ntfy poison: step=${row.step.id} attempts=${attempts}`);
      }
      return { id: row.step.id, ok: false, attempts };
    }),
  );

  const ok = results.filter((r) => r.status === "fulfilled" && (r as PromiseFulfilledResult<{ ok: boolean }>).value.ok).length;
  return NextResponse.json({ scanned: due.length, sent: ok });
}
