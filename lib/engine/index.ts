import { DateTime } from "luxon";
import { baselineMarkers, shiftAtInstant } from "./circadian";
import {
  ENGINE_VERSION,
  MIN_SHIFT_HOURS_FOR_PROTOCOL,
  MIN_STAY_DAYS_FOR_ADAPTATION,
} from "./constants";
import { emitArrivalSteps } from "./arrival";
import { emitInflightSteps } from "./inflight";
import { emitPreflightSteps } from "./preflight";
import { emitReturnSteps } from "./return";
import type { GeneratedProtocol, ProtocolInput, Step } from "./types";

export { ENGINE_VERSION } from "./constants";
export type * from "./types";

/**
 * Pure, deterministic protocol generator. No I/O. Same input → same output.
 *
 * Direction and shift are computed from the actual IANA tz offsets at
 * departure, not from the city pair — so DST is handled and the engine works
 * for any origin/destination combination.
 */
export function generateProtocol(input: ProtocolInput): GeneratedProtocol {
  const { shiftHours, direction } = shiftAtInstant(input.homeTz, input.destTz, input.departAt);
  const baseline = baselineMarkers(input);

  const stayMs = input.arriveAt.getTime();
  const stayEndMs = (input.returnDepartAt ?? new Date(input.arriveAt.getTime() + 7 * 86400_000)).getTime();
  const stayDays = Math.max(1, Math.ceil((stayEndMs - stayMs) / 86400_000));
  const stayOnOriginTime = stayDays < MIN_STAY_DAYS_FOR_ADAPTATION;

  // Below-threshold shift: emit no protocol
  if (Math.abs(shiftHours) < MIN_SHIFT_HOURS_FOR_PROTOCOL) {
    return {
      steps: [],
      baselineCbtMinUtc: baseline.cbtMin.toJSDate(),
      baselineDlmoUtc: baseline.dlmo.toJSDate(),
      direction,
      shiftHours,
      stayDays,
      stayOnOriginTime: true,
      engineVersion: ENGINE_VERSION,
    };
  }

  const steps: Step[] = [];

  // Pre-flight (eastward only)
  steps.push(...emitPreflightSteps(input, baseline, direction === "none" ? "east" : direction));

  // In-flight
  if (direction !== "none") {
    steps.push(...emitInflightSteps(input, baseline, direction, shiftHours));
  }

  // Arrival adaptation — skipped if dest stay too short
  if (!stayOnOriginTime && direction !== "none") {
    const stayEnd = DateTime.fromMillis(stayEndMs).toUTC();
    steps.push(...emitArrivalSteps(input, baseline, direction, shiftHours, stayEnd));
  }

  // Return leg
  if (input.returnDepartAt && input.returnArriveAt) {
    steps.push(...emitReturnSteps(input, baseline));
  }

  // Sort by scheduledAt
  steps.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  return {
    steps,
    baselineCbtMinUtc: baseline.cbtMin.toJSDate(),
    baselineDlmoUtc: baseline.dlmo.toJSDate(),
    direction,
    shiftHours,
    stayDays,
    stayOnOriginTime,
    engineVersion: ENGINE_VERSION,
  };
}
