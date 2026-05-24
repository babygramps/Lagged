import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { generateProtocol } from "@/lib/engine";
import type { ProtocolInput } from "@/lib/engine/types";

const SFO_LHR_INPUT: ProtocolInput = {
  homeTz: "America/Los_Angeles",
  destTz: "Europe/London",
  habitualBedtimeLocal: "23:00",
  habitualWakeLocal: "07:00",
  chronotype: "neutral",
  departAt: new Date("2026-05-17T22:30:00-07:00"), // SFO Sun 22:30 PDT
  arriveAt: new Date("2026-05-18T14:00:00+01:00"), // LHR Mon 14:00 BST (per doc)
  returnDepartAt: new Date("2026-05-24T10:30:00+01:00"),
  returnArriveAt: new Date("2026-05-24T13:30:00-07:00"),
};

function bst(d: Date): string {
  return DateTime.fromJSDate(d, { zone: "Europe/London" }).toFormat("yyyy-LL-dd HH:mm");
}
function pdt(d: Date): string {
  return DateTime.fromJSDate(d, { zone: "America/Los_Angeles" }).toFormat("yyyy-LL-dd HH:mm");
}

describe("SFO → LHR (8h east) — golden fixture from source doc", () => {
  const result = generateProtocol(SFO_LHR_INPUT);

  it("detects 8-hour eastward shift", () => {
    expect(result.direction).toBe("east");
    expect(result.shiftHours).toBe(8);
  });

  it("computes baseline DLMO ≈ 21:00 PDT and CBTmin ≈ 04:30 PDT", () => {
    expect(pdt(result.baselineDlmoUtc)).toMatch(/21:00$/);
    expect(pdt(result.baselineCbtMinUtc)).toMatch(/04:30$/);
  });

  it("baseline CBTmin = 12:30 BST (the doc's key fact)", () => {
    expect(bst(result.baselineCbtMinUtc)).toMatch(/12:30$/);
  });

  it("uses engine version metadata", () => {
    expect(result.engineVersion).toMatch(/^engine-/);
  });

  it("emits non-zero steps spanning pre-flight, in-flight, arrival, and return", () => {
    expect(result.steps.length).toBeGreaterThan(20);
    const phases = new Set(
      result.steps
        .map((s) => (s.payload as { phase?: string }).phase)
        .filter(Boolean) as string[],
    );
    expect(phases.has("preflight")).toBe(true);
    expect(phases.has("inflight")).toBe(true);
    expect(phases.has("arrival")).toBe(true);
    expect(phases.has("return")).toBe(true);
  });

  it("emits a light_avoid window on arrival day that ends ≤ 12:30 BST (antidromic-prevention)", () => {
    const arrivalAvoidEnds = result.steps.filter(
      (s) => s.kind === "light_avoid_end" && (s.payload as { dayIndex?: number }).dayIndex === 0,
    );
    expect(arrivalAvoidEnds.length).toBeGreaterThan(0);
    const endStr = bst(arrivalAvoidEnds[0].scheduledAt);
    expect(endStr).toMatch(/2026-05-18 12:30$/);
  });

  it("emits 0.5 mg melatonin doses on arrival Days 1–4 only (eastward window)", () => {
    const doses = result.steps.filter((s) => s.kind === "melatonin_dose");
    const arrivalDoses = doses.filter((s) => (s.payload as { phase?: string }).phase === "arrival");
    expect(arrivalDoses.length).toBe(4);
    for (const d of arrivalDoses) {
      expect((d.payload as { doseMg: number }).doseMg).toBe(0.5);
      const day = (d.payload as { dayIndex: number }).dayIndex;
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(4);
    }
  });

  it("places arrival-day light_seek after CBTmin (Khalsa PRC advance zone)", () => {
    const arrivalSeek = result.steps.find(
      (s) => s.kind === "light_seek" && (s.payload as { dayIndex?: number }).dayIndex === 0 && (s.payload as { phase?: string }).phase === "arrival",
    );
    expect(arrivalSeek).toBeDefined();
    // CBTmin on Day 0 ≈ 12:30 BST → seek starts at or after 12:30 BST
    const seekTime = DateTime.fromJSDate(arrivalSeek!.scheduledAt, { zone: "Europe/London" });
    expect(seekTime.hour).toBeGreaterThanOrEqual(12);
  });

  it("CBTmin advances by ~1h/day across arrival Days 1..N", () => {
    // Day 1 CBTmin should be ~11:30 BST, Day 2 ~10:30 BST, etc.
    const seekStarts = result.steps
      .filter((s) => s.kind === "light_seek" && (s.payload as { phase?: string }).phase === "arrival")
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    const hours = seekStarts.slice(0, 5).map((s) =>
      DateTime.fromJSDate(s.scheduledAt, { zone: "Europe/London" }).hour,
    );
    // Day 0 starts at 12:30 → hour 12
    // Day 1 ≈ 11:30 → hour 11
    // Day 2 ≈ 10:30 → hour 10
    // ...
    expect(hours[0]).toBe(12);
    expect(hours[1]).toBe(11);
    expect(hours[2]).toBe(10);
    expect(hours[3]).toBe(9);
  });

  it("emits a pre-flight 0.5 mg melatonin on Day -1", () => {
    const preflightMel = result.steps.find(
      (s) => s.kind === "melatonin_dose" && (s.payload as { phase?: string }).phase === "preflight",
    );
    expect(preflightMel).toBeDefined();
  });

  it("emits watch_set at departAt and at returnDepartAt", () => {
    const watchSets = result.steps.filter((s) => s.kind === "watch_set");
    expect(watchSets.length).toBe(2);
  });

  it("return-leg has zero melatonin doses (westward = no melatonin)", () => {
    const returnDoses = result.steps.filter(
      (s) => s.kind === "melatonin_dose" && (s.payload as { phase?: string }).phase === "return",
    );
    expect(returnDoses.length).toBe(0);
  });

  it("return-leg light_seek is in evening home-local time (delay zone)", () => {
    const returnSeeks = result.steps.filter(
      (s) => s.kind === "light_seek" && (s.payload as { phase?: string }).phase === "return",
    );
    expect(returnSeeks.length).toBeGreaterThan(0);
    for (const s of returnSeeks) {
      const h = DateTime.fromJSDate(s.scheduledAt, { zone: "America/Los_Angeles" }).hour;
      expect(h).toBeGreaterThanOrEqual(15);
      expect(h).toBeLessThanOrEqual(20);
    }
  });
});
