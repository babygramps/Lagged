import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { steps } from "@/lib/db/schema";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; stepId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id, stepId } = await params;
  const existing = await db.query.steps.findFirst({
    where: and(eq(steps.id, stepId), eq(steps.tripId, id), eq(steps.userId, session.user.id)),
  });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const next = existing.completedAt ? null : new Date();
  await db.update(steps).set({ completedAt: next }).where(eq(steps.id, stepId));
  return NextResponse.json({ completedAt: next });
}
