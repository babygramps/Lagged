import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";
import { StepIcon, stepColorClass } from "./step-icon";
import { stepToNtfyMessage } from "@/lib/ntfy/format";
import type { StepKind } from "@/lib/engine/types";

interface ServerStep {
  id: string;
  kind: StepKind;
  scheduledAt: Date;
  endsAt: Date | null;
  displayTz: string;
  originalTz: string;
  payload: Record<string, unknown>;
  completedAt: Date | null;
}

export function Timeline({ steps, destTz }: { steps: ServerStep[]; destTz: string }) {
  // Group by destination calendar day
  const groups = new Map<string, ServerStep[]>();
  for (const s of steps) {
    const day = DateTime.fromJSDate(s.scheduledAt, { zone: destTz }).toFormat("yyyy-LL-dd (ccc LLL d)");
    const arr = groups.get(day) ?? [];
    arr.push(s);
    groups.set(day, arr);
  }
  const days = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      {days.map(([day, rows]) => (
        <section key={day}>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{day}</h3>
          <ul className="space-y-2">
            {rows.map((s) => {
              const msg = stepToNtfyMessage({
                kind: s.kind,
                scheduledAt: s.scheduledAt,
                endsAt: s.endsAt ?? undefined,
                displayTz: s.displayTz,
                payload: s.payload,
              });
              const localHHMM = DateTime.fromJSDate(s.scheduledAt, { zone: destTz }).toFormat("HH:mm");
              const localEnd = s.endsAt ? DateTime.fromJSDate(s.endsAt, { zone: destTz }).toFormat("HH:mm") : null;
              return (
                <li
                  key={s.id}
                  className={`flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 ${stepColorClass(s.kind)} ${s.completedAt ? "opacity-50" : ""}`}
                >
                  <span className="font-mono text-sm tabular-nums w-24 text-muted-foreground">
                    {localHHMM}{localEnd ? `-${localEnd}` : ""}
                  </span>
                  <StepIcon kind={s.kind} className="h-4 w-4 shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{msg.title}</div>
                    <div className="text-xs text-muted-foreground">{msg.body}</div>
                  </div>
                  {s.completedAt && <Badge variant="muted">done</Badge>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
