"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import {
  bedtimeIdToHhmm,
  inferChronotype,
  wakeIdToHhmm,
  type BedtimeId,
  type WakeId,
} from "@/lib/engine/categorical";
import { nextStep, type OnboardingStep } from "./steps";

async function ensureProfile(userId: string) {
  await db
    .insert(profiles)
    .values({ userId })
    .onConflictDoNothing();
}

async function getProfile(userId: string) {
  return db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
}

export async function selectAnswer(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  const userId = session.user.id;
  await ensureProfile(userId);

  const step = formData.get("step") as OnboardingStep;
  const value = formData.get("value")?.toString() ?? "";

  switch (step) {
    case "bedtime": {
      const hhmm = bedtimeIdToHhmm(value as BedtimeId);
      const profile = await getProfile(userId);
      const wakeId = profile ? hhmmToWakeIdReverse(profile.habitualWakeLocal) : undefined;
      const chronotype = wakeId
        ? inferChronotype(value as BedtimeId, wakeId)
        : profile?.chronotype ?? "neutral";
      await db.update(profiles).set({ habitualBedtimeLocal: hhmm, chronotype, updatedAt: new Date() }).where(eq(profiles.userId, userId));
      break;
    }
    case "wake": {
      const hhmm = wakeIdToHhmm(value as WakeId);
      const profile = await getProfile(userId);
      const bedId = profile ? hhmmToBedtimeIdReverse(profile.habitualBedtimeLocal) : undefined;
      const chronotype = bedId
        ? inferChronotype(bedId, value as WakeId)
        : profile?.chronotype ?? "neutral";
      await db.update(profiles).set({ habitualWakeLocal: hhmm, chronotype, updatedAt: new Date() }).where(eq(profiles.userId, userId));
      break;
    }
    case "sex": {
      const sex = value === "female" || value === "male" || value === "other" ? value : null;
      await db.update(profiles).set({ sex, updatedAt: new Date() }).where(eq(profiles.userId, userId));
      break;
    }
    case "melatonin": {
      const usesMelatonin = value === "yes";
      await db.update(profiles).set({ usesMelatonin, updatedAt: new Date() }).where(eq(profiles.userId, userId));
      break;
    }
    case "melatonin-info":
      // Just an acknowledgment; advances on either button
      break;
    case "home": {
      await db.update(profiles).set({ homeTz: value, updatedAt: new Date() }).where(eq(profiles.userId, userId));
      break;
    }
    case "ntfy": {
      const ntfyTopic = value && /^[a-zA-Z0-9_-]{6,64}$/.test(value) ? value : null;
      await db.update(profiles).set({ ntfyTopic, onboardedAt: new Date(), updatedAt: new Date() }).where(eq(profiles.userId, userId));
      break;
    }
  }

  const next = nextStep(step, value);
  if (next === "done") {
    redirect("/trips");
  }
  redirect(`/onboarding/${next}`);
}

// Reverse maps duplicated here to avoid circular import noise
function hhmmToBedtimeIdReverse(hhmm: string): BedtimeId | undefined {
  const map: Record<string, BedtimeId> = {
    "20:00": "before-9pm", "21:00": "9pm", "22:00": "10pm", "23:00": "11pm",
    "00:00": "12am", "01:00": "1am", "02:00": "2am", "03:00": "after-2am",
  };
  return map[hhmm];
}
function hhmmToWakeIdReverse(hhmm: string): WakeId | undefined {
  const map: Record<string, WakeId> = {
    "05:00": "before-6am", "06:00": "6am", "07:00": "7am", "08:00": "8am", "09:00": "after-8am",
  };
  return map[hhmm];
}
