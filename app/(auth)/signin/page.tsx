import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignInPage() {
  const devLoginEnabled = process.env.ALLOW_DEV_LOGIN === "1";

  async function signInAction(formData: FormData) {
    "use server";
    const email = formData.get("email")?.toString();
    if (!email) return;
    await signIn("resend", { email, redirectTo: "/trips" });
  }

  async function devSignInAction(formData: FormData) {
    "use server";
    const email = formData.get("email")?.toString();
    if (!email) return;
    await signIn("credentials", { email, redirectTo: "/trips" });
  }

  return (
    <main className="container max-w-md py-20">
      <Card>
        <CardHeader>
          <CardTitle>Sign in to Lagged</CardTitle>
          <CardDescription>We&apos;ll email a magic link.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form action={signInAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <Button type="submit" className="w-full">Send link</Button>
          </form>
          {devLoginEnabled && (
            <form action={devSignInAction} className="space-y-3 border-t pt-5">
              <div className="space-y-2">
                <Label htmlFor="dev-email">Dev login (no email sent)</Label>
                <Input
                  id="dev-email"
                  name="email"
                  type="email"
                  required
                  defaultValue="dev@lagged.local"
                />
              </div>
              <Button type="submit" variant="secondary" className="w-full">
                Continue as this user
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
