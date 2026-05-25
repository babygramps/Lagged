"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

const Schema = z.object({
  chronotype: z.enum(["early", "neutral", "late"]),
  habitualBedtimeLocal: z.string().regex(/^\d{2}:\d{2}$/),
  habitualWakeLocal: z.string().regex(/^\d{2}:\d{2}$/),
  homeTz: z.string().min(3),
  sex: z.enum(["female", "male", "other"]).nullable().optional(),
  usesMelatonin: z.boolean(),
  ntfyTopic: z.string().regex(/^[a-zA-Z0-9_-]{6,64}$/).nullable().optional(),
});

export async function saveProfile(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const sexRaw = formData.get("sex")?.toString() || null;
  const parsed = Schema.parse({
    chronotype: formData.get("chronotype"),
    habitualBedtimeLocal: formData.get("habitualBedtimeLocal"),
    habitualWakeLocal: formData.get("habitualWakeLocal"),
    homeTz: formData.get("homeTz"),
    sex: sexRaw === "female" || sexRaw === "male" || sexRaw === "other" ? sexRaw : null,
    usesMelatonin: formData.get("usesMelatonin") === "on" || formData.get("usesMelatonin") === "true",
    ntfyTopic: (formData.get("ntfyTopic")?.toString() || null) as string | null,
  });

  await db
    .insert(profiles)
    .values({
      userId: session.user.id,
      chronotype: parsed.chronotype,
      habitualBedtimeLocal: parsed.habitualBedtimeLocal,
      habitualWakeLocal: parsed.habitualWakeLocal,
      homeTz: parsed.homeTz,
      sex: parsed.sex ?? null,
      usesMelatonin: parsed.usesMelatonin,
      ntfyTopic: parsed.ntfyTopic ?? null,
      onboardedAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        chronotype: parsed.chronotype,
        habitualBedtimeLocal: parsed.habitualBedtimeLocal,
        habitualWakeLocal: parsed.habitualWakeLocal,
        homeTz: parsed.homeTz,
        sex: parsed.sex ?? null,
        usesMelatonin: parsed.usesMelatonin,
        ntfyTopic: parsed.ntfyTopic ?? null,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/settings");
}

export async function profileQrDataUrl(topic: string): Promise<string> {
  const QRCode = await import("qrcode");
  const base = process.env.NTFY_BASE_URL ?? "https://ntfy.sh";
  return QRCode.toDataURL(`${base}/${topic}`, { width: 192, margin: 1 });
}
