import { cn } from "@/lib/utils";
import type { MuscleRatings } from "@/types";
import {
  MUSCLE_GROUP_CATEGORIES,
  ALL_MUSCLE_GROUPS,
  MAX_MUSCLE_POINTS,
  getMuscleGroupLabel,
  totalMusclePoints,
} from "@/lib/muscleGroups";
import { Button } from "@/components/ui/button";
import { Minus, Plus, RotateCcw } from "lucide-react";

interface MuscleGroupSelectorProps {
  value: MuscleRatings;
  onChange: (ratings: MuscleRatings) => void;
}

export function MuscleGroupSelector({ value, onChange }: MuscleGroupSelectorProps) {
  const total = totalMusclePoints(value);
  const remaining = MAX_MUSCLE_POINTS - total;

  const increment = (group: string) => {
    if (value[group] < 5 && remaining > 0) {
      onChange({ ...value, [group]: value[group] + 1 });
    }
  };

  const decrement = (group: string) => {
    if (value[group] > 0) {
      onChange({ ...value, [group]: value[group] - 1 });
    }
  };

  const reset = () => {
    const cleared: MuscleRatings = {};
    for (const g of ALL_MUSCLE_GROUPS) cleared[g] = 0;
    onChange(cleared);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Points: <span className="font-medium text-foreground">{total}</span> / {MAX_MUSCLE_POINTS}
        </div>
        <Button variant="ghost" size="xs" onClick={reset}>
          <RotateCcw className="size-3" />
          Reset
        </Button>
      </div>
      <div className="h-1.5 rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            remaining === 0 ? "bg-primary" : "bg-primary/70"
          )}
          style={{ width: `${(total / MAX_MUSCLE_POINTS) * 100}%` }}
        />
      </div>
      {Object.entries(MUSCLE_GROUP_CATEGORIES).map(([category, groups]) => (
        <div key={category} className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {category}
          </h4>
          <div className="grid gap-1.5">
            {groups.map((group) => (
              <div
                key={group}
                className="flex items-center justify-between rounded-md border border-border/50 px-2 py-1"
              >
                <span className="text-sm">{getMuscleGroupLabel(group)}</span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => decrement(group)}
                    disabled={value[group] === 0}
                  >
                    <Minus className="size-3" />
                  </Button>
                  <span
                    className={cn(
                      "w-5 text-center text-sm font-medium tabular-nums",
                      value[group] > 0 ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {value[group]}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => increment(group)}
                    disabled={value[group] >= 5 || remaining <= 0}
                  >
                    <Plus className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
