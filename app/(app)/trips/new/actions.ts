"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles, protocols, steps, trips } from "@/lib/db/schema";
import { generateProtocol } from "@/lib/engine";
import { parseLocalDateTime } from "@/lib/time";

const tzRegex = /^[A-Za-z_]+\/[A-Za-z_\-+0-9/]+$/;

const Schema = z
  .object({
    label: z.string().min(1).max(120),
    originTz: z.string().regex(tzRegex),
    destTz: z.string().regex(tzRegex),
    departLocal: z.string().min(1), // "2026-05-17T22:30"
    arriveLocal: z.string().min(1),
    returnDepartLocal: z.string().optional(),
    returnArriveLocal: z.string().optional(),
  })
  .refine((v) => v.originTz !== v.destTz, { message: "Origin and destination must differ", path: ["destTz"] });

export async function createTrip(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }
  const userId = session!.user!.id!;

  const parsed = Schema.parse({
    label: formData.get("label"),
    originTz: formData.get("originTz"),
    destTz: formData.get("destTz"),
    departLocal: formData.get("departLocal"),
    arriveLocal: formData.get("arriveLocal"),
    returnDepartLocal: formData.get("returnDepartLocal") || undefined,
    returnArriveLocal: formData.get("returnArriveLocal") || undefined,
  });

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  if (!profile) {
    redirect("/settings?missing=profile");
  }

  const departAt = parseLocalDateTime(parsed.departLocal, parsed.originTz);
  const arriveAt = parseLocalDateTime(parsed.arriveLocal, parsed.destTz);
  const returnDepartAt = parsed.returnDepartLocal
    ? parseLocalDateTime(parsed.returnDepartLocal, parsed.destTz)
    : undefined;
  const returnArriveAt = parsed.returnArriveLocal
    ? parseLocalDateTime(parsed.returnArriveLocal, parsed.originTz)
    : undefined;

  const engineResult = generateProtocol({
    homeTz: profile!.homeTz,
    destTz: parsed.destTz,
    habitualBedtimeLocal: profile!.habitualBedtimeLocal,
    habitualWakeLocal: profile!.habitualWakeLocal,
    chronotype: profile!.chronotype,
    departAt,
    arriveAt,
    returnDepartAt,
    returnArriveAt,
  });

  // Force the engine to see "homeTz" as the origin even if the user picked a
  // different originTz (e.g. they live in PDT but happen to depart from JFK).
  // For v1 we just record both tz on the trip and trust the engine's direction.

  const [trip] = await db
    .insert(trips)
    .values({
      userId,
      label: parsed.label,
      originTz: parsed.originTz,
      destTz: parsed.destTz,
      departAt,
      arriveAt,
      returnDepartAt,
      returnArriveAt,
      direction: engineResult.direction,
      shiftHours: Math.round(engineResult.shiftHours),
    })
    .returning({ id: trips.id });

  const [proto] = await db
    .insert(protocols)
    .values({
      tripId: trip.id,
      engineVersion: engineResult.engineVersion,
      plan: engineResult.steps as unknown as object,
      baselineCbtMinUtc: engineResult.baselineCbtMinUtc,
      baselineDlmoUtc: engineResult.baselineDlmoUtc,
    })
    .returning({ id: protocols.id });

  if (engineResult.steps.length > 0) {
    await db.insert(steps).values(
      engineResult.steps.map((s) => ({
        protocolId: proto.id,
        tripId: trip.id,
        userId,
        kind: s.kind,
        scheduledAt: s.scheduledAt,
        endsAt: s.endsAt,
        displayTz: s.displayTz,
        originalTz: s.originalTz,
        payload: s.payload as unknown as object,
      })),
    );
  }

  redirect(`/trips/${trip.id}`);
}
