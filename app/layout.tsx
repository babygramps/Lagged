import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lagged — personalized jet lag protocol",
  description:
    "Itinerary-driven circadian protocol generator with live tracker and ntfy notifications, based on the Burgess/Khalsa light PRC and Burgess 2010 melatonin PRC.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
