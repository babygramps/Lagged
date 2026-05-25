import { describe, expect, it } from "vitest";
import { generateProtocol } from "@/lib/engine";
import type { ProtocolInput } from "@/lib/engine/types";

const BASE: Omit<ProtocolInput, "sex" | "usesMelatonin"> = {
  homeTz: "America/Los_Angeles",
  destTz: "Europe/London",
  habitualBedtimeLocal: "23:00",
  habitualWakeLocal: "07:00",
  chronotype: "neutral",
  departAt: new Date("2026-05-17T22:30:00-07:00"),
  arriveAt: new Date("2026-05-18T14:00:00+01:00"),
};

describe("Personalization fields actually change engine output", () => {
  it("usesMelatonin=false suppresses every melatonin_dose step (preflight + arrival)", () => {
    const on = generateProtocol({ ...BASE, usesMelatonin: true });
    const off = generateProtocol({ ...BASE, usesMelatonin: false });
    const onDoses = on.steps.filter((s) => s.kind === "melatonin_dose").length;
    const offDoses = off.steps.filter((s) => s.kind === "melatonin_dose").length;
    expect(onDoses).toBeGreaterThan(0);
    expect(offDoses).toBe(0);
  });

  it("sex modifier shifts CBTmin trajectory: female advances slightly faster than male (Duffy 2011)", () => {
    const female = generateProtocol({ ...BASE, sex: "female" });
    const male = generateProtocol({ ...BASE, sex: "male" });

    // Compare the Day 3 light_seek (arrival, phase=arrival, dayIndex=3) which
    // anchors to that day's CBTmin. A faster east rate moves CBTmin earlier
    // (smaller hour value).
    const dayThree = (r: ReturnType<typeof generateProtocol>) =>
      r.steps.find(
        (s) =>
          s.kind === "light_seek" &&
          (s.payload as { phase?: string; dayIndex?: number }).phase === "arrival" &&
          (s.payload as { dayIndex?: number }).dayIndex === 3,
      )!;

    const f3 = dayThree(female).scheduledAt.getTime();
    const m3 = dayThree(male).scheduledAt.getTime();
    expect(f3).toBeLessThan(m3); // female reaches earlier CBTmin sooner
  });

  it("sex='other' or unset yields the baseline literature-average rate", () => {
    const noSex = generateProtocol(BASE);
    const other = generateProtocol({ ...BASE, sex: "other" });
    const noSexDay3 = noSex.steps.find(
      (s) =>
        s.kind === "light_seek" &&
        (s.payload as { phase?: string; dayIndex?: number }).phase === "arrival" &&
        (s.payload as { dayIndex?: number }).dayIndex === 3,
    )!;
    const otherDay3 = other.steps.find(
      (s) =>
        s.kind === "light_seek" &&
        (s.payload as { phase?: string; dayIndex?: number }).phase === "arrival" &&
        (s.payload as { dayIndex?: number }).dayIndex === 3,
    )!;
    expect(noSexDay3.scheduledAt.getTime()).toBe(otherDay3.scheduledAt.getTime());
  });
});
