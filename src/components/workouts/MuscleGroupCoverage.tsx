import { cn } from "@/lib/utils";
import type { MuscleRatings } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  MUSCLE_GROUP_CATEGORIES,
  getMuscleGroupLabel,
  ratedMuscleGroups,
} from "@/lib/muscleGroups";

interface MuscleGroupCoverageProps {
  ratings: MuscleRatings;
  compact?: boolean;
}

export function MuscleGroupCoverage({ ratings, compact = false }: MuscleGroupCoverageProps) {
  const rated = ratedMuscleGroups(ratings);

  if (rated.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">No muscle groups rated</span>
    );
  }

  if (compact) {
    const top = Object.entries(ratings)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return (
      <div className="flex flex-wrap gap-1">
        {top.map(([group, value]) => (
          <Badge key={group} variant="secondary" className="text-xs">
            {getMuscleGroupLabel(group)} ({value})
          </Badge>
        ))}
        {rated.length > 5 && (
          <Badge variant="outline" className="text-xs">
            +{rated.length - 5}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Object.entries(MUSCLE_GROUP_CATEGORIES).map(([category, groups]) => {
        const hasAny = groups.some((g) => ratings[g] > 0);
        if (!hasAny) return null;
        return (
          <div key={category} className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {category}
            </span>
            <div className="space-y-1">
              {groups
                .filter((g) => ratings[g] > 0)
                .map((group) => (
                  <div key={group} className="flex items-center gap-2">
                    <span className="w-28 text-xs truncate">
                      {getMuscleGroupLabel(group)}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full bg-primary")}
                        style={{ width: `${(ratings[group] / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground w-3">
                      {ratings[group]}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
