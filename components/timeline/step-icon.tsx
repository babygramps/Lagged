import {
  Sun,
  Moon,
  Pill,
  Coffee,
  BedDouble,
  AlarmClock,
  Dumbbell,
  Watch,
  Eye,
  EyeOff,
  Sunrise,
} from "lucide-react";
import type { StepKind } from "@/lib/engine/types";

export function StepIcon({ kind, className }: { kind: StepKind; className?: string }) {
  switch (kind) {
    case "light_seek": return <Sun className={className} />;
    case "light_avoid_start": return <EyeOff className={className} />;
    case "light_avoid_end": return <Eye className={className} />;
    case "melatonin_dose": return <Pill className={className} />;
    case "caffeine_cutoff": return <Coffee className={className} />;
    case "sleep_window": return <BedDouble className={className} />;
    case "wake": return <AlarmClock className={className} />;
    case "exercise_window": return <Dumbbell className={className} />;
    case "watch_set": return <Watch className={className} />;
    case "mask_on": return <Moon className={className} />;
    case "mask_off": return <Sunrise className={className} />;
  }
}

export function stepColorClass(kind: StepKind): string {
  switch (kind) {
    case "light_seek":
    case "light_avoid_end":
    case "mask_off":
    case "wake":
      return "step-light";
    case "light_avoid_start":
    case "mask_on":
      return "step-dark";
    case "melatonin_dose":
      return "step-melatonin";
    case "sleep_window":
      return "step-sleep";
    case "exercise_window":
      return "step-exercise";
    case "caffeine_cutoff":
      return "step-caffeine";
    case "watch_set":
      return "";
  }
}
