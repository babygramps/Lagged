"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StepIcon, stepColorClass } from "./step-icon";
import type { StepKind } from "@/lib/engine/types";

interface HeroStep {
  id: string;
  kind: StepKind;
  scheduledAt: string; // ISO
  endsAt: string | null;
  displayTime: string;
  title: string;
  body: string;
  completedAt: string | null;
}

export function CurrentStepHero({
  step,
  tripId,
  isActive,
}: {
  step: HeroStep | null;
  tripId: string;
  isActive: boolean;
}) {
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (!step) return;
    setPending(true);
    try {
      await fetch(`/api/trips/${tripId}/steps/${step.id}/complete`, { method: "POST" });
      window.location.reload();
    } finally {
      setPending(false);
    }
  }

  if (!step) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No upcoming steps. You&apos;re done.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={stepColorClass(step.kind)}>
      <CardContent className="flex items-center gap-6 py-6">
        <StepIcon kind={step.kind} className="h-12 w-12 shrink-0" />
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {isActive ? "Active now" : "Next up"}
          </div>
          <div className="mt-1 text-2xl font-semibold">{step.title}</div>
          <div className="text-sm text-muted-foreground">{step.body}</div>
          <Countdown to={step.scheduledAt} />
        </div>
        <Button onClick={toggle} disabled={pending} variant={step.completedAt ? "outline" : "default"}>
          {step.completedAt ? "Undo" : "Mark done"}
        </Button>
      </CardContent>
    </Card>
  );
}

function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = new Date(to).getTime() - now;
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const s = Math.floor((abs % 60_000) / 1000);
  return (
    <div className="mt-2 font-mono text-xs text-muted-foreground">
      {diff >= 0 ? "in " : "started "}
      {h.toString().padStart(2, "0")}:{m.toString().padStart(2, "0")}:{s.toString().padStart(2, "0")}
      {diff < 0 ? " ago" : ""}
    </div>
  );
}
