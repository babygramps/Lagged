import Image from "next/image";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTimezoneOptions } from "@/lib/time";
import { profileQrDataUrl, saveProfile } from "./actions";
import { TestNotificationButton } from "./test-button";

export default async function SettingsPage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
  const tzList = getTimezoneOptions();

  const qr = profile?.ntfyTopic ? await profileQrDataUrl(profile.ntfyTopic) : null;
  const ntfyBase = process.env.NTFY_BASE_URL ?? "https://ntfy.sh";

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveProfile} className="space-y-5">
            <div className="space-y-2">
              <Label>Chronotype</Label>
              <div className="flex gap-4 text-sm">
                {(["early", "neutral", "late"] as const).map((c) => (
                  <label key={c} className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="chronotype"
                      value={c}
                      defaultChecked={(profile?.chronotype ?? "neutral") === c}
                      required
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="habitualBedtimeLocal">Habitual bedtime</Label>
                <Input
                  id="habitualBedtimeLocal"
                  name="habitualBedtimeLocal"
                  type="time"
                  defaultValue={profile?.habitualBedtimeLocal ?? "23:00"}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="habitualWakeLocal">Habitual wake</Label>
                <Input
                  id="habitualWakeLocal"
                  name="habitualWakeLocal"
                  type="time"
                  defaultValue={profile?.habitualWakeLocal ?? "07:00"}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sex</Label>
              <div className="flex gap-4 text-sm">
                {(["female", "male", "other"] as const).map((c) => (
                  <label key={c} className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="sex"
                      value={c}
                      defaultChecked={profile?.sex === c}
                    />
                    {c}
                  </label>
                ))}
                <label className="inline-flex items-center gap-2 text-muted-foreground">
                  <input type="radio" name="sex" value="" defaultChecked={!profile?.sex} />
                  prefer not to say
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Small per-day rate modifier (Duffy 2011, Cain 2010). Optional.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Use melatonin</Label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="usesMelatonin"
                  defaultChecked={profile?.usesMelatonin ?? true}
                />
                Emit 0.5 mg melatonin steps eastward
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="homeTz">Home timezone</Label>
              <select
                id="homeTz"
                name="homeTz"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                defaultValue={profile?.homeTz ?? "America/Los_Angeles"}
                required
              >
                {tzList.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ntfyTopic">ntfy topic</Label>
              <Input
                id="ntfyTopic"
                name="ntfyTopic"
                placeholder="rick-jet-lag-x91"
                pattern="[a-zA-Z0-9_\-]{6,64}"
                defaultValue={profile?.ntfyTopic ?? ""}
              />
              <p className="text-xs text-muted-foreground">
                6–64 chars, letters/numbers/_-. Subscribe to <code>{ntfyBase}/{`<topic>`}</code> in
                the ntfy app to receive notifications.&nbsp;
              </p>
            </div>

            <div className="flex gap-3">
              <Button type="submit">Save</Button>
              <TestNotificationButton disabled={!profile?.ntfyTopic} />
            </div>
          </form>
        </CardContent>
      </Card>

      {profile?.ntfyTopic && qr ? (
        <Card>
          <CardHeader>
            <CardTitle>Subscribe on mobile</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <Image src={qr} alt="ntfy subscription QR" width={192} height={192} unoptimized />
            <div className="text-sm space-y-1">
              <div className="font-mono">{ntfyBase}/{profile.ntfyTopic}</div>
              <a
                href={`ntfy://${profile.ntfyTopic}`}
                className="text-primary underline"
              >
                Open in ntfy app
              </a>
              <p className="text-xs text-muted-foreground">
                Install ntfy from your app store, scan the QR, and you&apos;ll start receiving step notifications.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
