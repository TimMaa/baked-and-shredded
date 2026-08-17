import { useState, useMemo } from "react";
import type { Exercise } from "@/types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ratedMuscleGroups, getMuscleGroupLabel } from "@/lib/muscleGroups";
import { Search } from "lucide-react";

interface ExerciseSelectorProps {
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
  excludeIds?: number[];
}

export function ExerciseSelector({ exercises, onSelect, excludeIds = [] }: ExerciseSelectorProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const available = exercises.filter((e) => !excludeIds.includes(e.id!));
    if (!query.trim()) return available;
    const q = query.toLowerCase();
    return available.filter((e) => e.name.toLowerCase().includes(q));
  }, [exercises, query, excludeIds]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search exercises..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="pl-8"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {filtered.map((ex) => {
            const muscles = ratedMuscleGroups(ex.focusAreas).slice(0, 3);
            return (
              <button
                key={ex.id}
                type="button"
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 rounded-sm px-2 py-1.5 text-left text-sm",
                  "hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => {
                  onSelect(ex);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <span className="font-medium">{ex.name}</span>
                {muscles.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {muscles.map(getMuscleGroupLabel).join(", ")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {open && filtered.length === 0 && query.trim() && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-3 text-center text-sm text-muted-foreground shadow-md">
          No exercises found
        </div>
      )}
    </div>
  );
}
