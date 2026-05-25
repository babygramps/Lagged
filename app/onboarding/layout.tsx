import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  return (
    <div className="fixed inset-0 flex flex-col bg-[#F5EFEA] text-[#1a1d22] overflow-y-auto">
      {children}
    </div>
  );
}
