"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function TestNotificationButton({ disabled }: { disabled: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  async function send() {
    setState("sending");
    const res = await fetch("/api/ntfy/test", { method: "POST" });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean };
    setState(res.ok && json.ok ? "sent" : "failed");
    setTimeout(() => setState("idle"), 4000);
  }
  const label =
    state === "sending" ? "Sending…" :
    state === "sent" ? "Sent ✓" :
    state === "failed" ? "Failed — check topic" :
    "Send test notification";
  return (
    <Button type="button" variant="outline" onClick={send} disabled={disabled || state === "sending"}>
      {label}
    </Button>
  );
}
