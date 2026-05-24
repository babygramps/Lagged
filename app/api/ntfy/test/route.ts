import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { postNtfy } from "@/lib/ntfy/send";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, session.user.id),
  });
  if (!profile?.ntfyTopic) {
    return NextResponse.json({ error: "no_topic" }, { status: 412 });
  }
  const result = await postNtfy({
    topic: profile.ntfyTopic,
    title: "Lagged test",
    body: "Notifications are wired up correctly.",
    tags: ["white_check_mark"],
    priority: 3,
  });
  return NextResponse.json(result);
}
