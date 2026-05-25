"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, MessageCircle } from "lucide-react";

export function OnboardingHeader({ backHref }: { backHref?: string }) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between px-6 pt-12 pb-4">
      {backHref ? (
        <Link href={backHref} className="text-[#1a1d22]/60 hover:text-[#1a1d22]" aria-label="Back">
          <ChevronLeft className="h-7 w-7" />
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => router.back()}
          className="text-[#1a1d22]/60 hover:text-[#1a1d22]"
          aria-label="Back"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
      )}
      <Link href="/trips" className="text-[#1a1d22]/40 hover:text-[#1a1d22]" aria-label="Skip">
        <MessageCircle className="h-6 w-6" />
      </Link>
    </div>
  );
}
