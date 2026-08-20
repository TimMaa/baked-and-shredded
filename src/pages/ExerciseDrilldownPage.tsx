import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import * as db from "@/lib/db";
import { getMuscleGroupLabel, ratedMuscleGroups } from "@/lib/muscleGroups";
import type { Exercise, SessionSet } from "@/types";

interface SessionPerformance {
  date: string;
  sets: { setNumber: number; reps: number; weight: number | null }[];
  maxWeight: number | null;
  totalReps: number;
  totalVolume: number;
}

export function ExerciseDrilldownPage() {
  const { id } = useParams<{ id: string }>();
  const exerciseId = Number(id);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [performances, setPerformances] = useState<SessionPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const ex = await db.getExercise(exerciseId);
      if (!ex) {
        setLoading(false);
        return;
      }
      setExercise(ex);

      const allSessions = await db.getAllSessions();
      const allSets = await db.getAllSessionSets();
      const completed = allSessions
        .filter((s) => s.completedAt)
        .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

      const perfs: SessionPerformance[] = [];
      for (const session of completed) {
        const sets = allSets
          .filter((ss: SessionSet) => ss.sessionId === session.id && ss.exerciseId === exerciseId)
          .sort((a, b) => a.setNumber - b.setNumber);
        if (sets.length === 0) continue;

        const mappedSets = sets.map((s) => ({
          setNumber: s.setNumber,
          reps: s.actualReps,
          weight: s.actualWeight,
        }));
        const weights = mappedSets.map((s) => s.weight).filter((w): w is number => w != null);
        const maxWeight = weights.length > 0 ? Math.max(...weights) : null;
        const totalReps = mappedSets.reduce((sum, s) => sum + s.reps, 0);
        const totalVolume = mappedSets.reduce((sum, s) => sum + s.reps * (s.weight ?? 0), 0);

        perfs.push({
          date: session.completedAt!,
          sets: mappedSets,
          maxWeight,
          totalReps,
          totalVolume,
        });
      }

      setPerformances(perfs);
      setLoading(false);
    })();
  }, [exerciseId]);

  if (loading) {
    return <div className="text-center text-muted-foreground py-8">Loading...</div>;
  }

  if (!exercise) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Exercise not found</p>
        <Link to="/progress" className="text-primary text-sm">Back to Progress</Link>
      </div>
    );
  }

  const muscleGroups = ratedMuscleGroups(exercise.focusAreas);
  const maxVolumeAll = performances.length > 0 ? Math.max(...performances.map((p) => p.totalVolume), 1) : 1;

  const trend = performances.length >= 2
    ? performances[0].totalVolume > performances[1].totalVolume
      ? "up"
      : performances[0].totalVolume < performances[1].totalVolume
        ? "down"
        : "flat"
    : null;

  return (
    <div className="space-y-5">
      <div>
        <Link to="/progress" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="size-3.5" /> Back to Progress
        </Link>
        <h1 className="text-xl font-bold">{exercise.name}</h1>
        {exercise.description && (
          <p className="text-sm text-muted-foreground mt-0.5">{exercise.description}</p>
        )}
        <div className="flex flex-wrap gap-1 mt-2">
          {muscleGroups.map((g) => (
            <Badge key={g} variant="secondary" className="text-xs">
              {getMuscleGroupLabel(g)}
            </Badge>
          ))}
        </div>
      </div>

      {performances.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <Card size="sm">
            <CardContent className="pt-3 text-center">
              <p className="text-lg font-bold">{performances.length}</p>
              <p className="text-[10px] text-muted-foreground">Sessions</p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="pt-3 text-center">
              <p className="text-lg font-bold">
                {performances[0].maxWeight != null ? `${performances[0].maxWeight}kg` : `${performances[0].totalReps}r`}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {performances[0].maxWeight != null ? "Best Weight" : "Best Reps"}
              </p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="pt-3 text-center flex flex-col items-center">
              <div className="flex items-center gap-0.5">
                {trend === "up" && <TrendingUp className="size-3.5 text-green-500" />}
                {trend === "down" && <TrendingDown className="size-3.5 text-red-500" />}
                {trend === "flat" && <Minus className="size-3.5 text-muted-foreground" />}
                <p className="text-lg font-bold">{Math.round(performances[0].totalVolume)}</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Last Volume</p>
            </CardContent>
          </Card>
        </div>
      )}

      {performances.length > 1 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Volume Over Time
          </h2>
          <div className="flex items-end gap-1 h-24">
            {performances.slice(0, 20).reverse().map((p, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className={cn(
                    "w-full rounded-t bg-primary/70 min-h-[2px]",
                    i === performances.slice(0, 20).length - 1 && "bg-primary"
                  )}
                  style={{ height: `${(p.totalVolume / maxVolumeAll) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>
              {new Date(performances[Math.min(performances.length - 1, 19)].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
            <span>
              {new Date(performances[0].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          </div>
        </div>
      )}

      {performances.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Session History
          </h2>
          <div className="space-y-2">
            {performances.slice(0, 20).map((p, i) => (
              <Card key={i} size="sm">
                <CardContent className="pt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.date).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2 text-xs">
                      {p.maxWeight != null && (
                        <Badge variant="secondary" className="text-[10px]">{p.maxWeight}kg</Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px]">{p.totalReps} reps</Badge>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    {p.sets.map((s) => (
                      <div key={s.setNumber} className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground w-10">Set {s.setNumber}</span>
                        <span className="tabular-nums">
                          {s.weight != null ? `${s.reps} reps @ ${s.weight}kg` : `${s.reps} reps`}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {performances.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No recorded sets for this exercise yet.
        </p>
      )}
    </div>
  );
}
