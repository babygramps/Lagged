import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignInPage() {
  async function signInAction(formData: FormData) {
    "use server";
    const email = formData.get("email")?.toString();
    if (!email) return;
    await signIn("resend", { email, redirectTo: "/trips" });
  }

  return (
    <main className="container max-w-md py-20">
      <Card>
        <CardHeader>
          <CardTitle>Sign in to Lagged</CardTitle>
          <CardDescription>We&apos;ll email a magic link.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signInAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <Button type="submit" className="w-full">Send link</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
