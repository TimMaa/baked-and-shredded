import { useState, useEffect, useCallback } from "react";
import type { Workout, WorkoutExercise, MuscleRatings } from "@/types";
import * as db from "@/lib/db";
import { createDefaultMuscleRatings } from "@/lib/muscleGroups";

export interface EnrichedWorkout extends Workout {
  exerciseCount: number;
  focusAreas: MuscleRatings;
}

export function useWorkouts() {
  const [workouts, setWorkouts] = useState<EnrichedWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const allWorkouts = await db.getAllWorkouts();
    const allExercises = await db.getAllExercises();

    const enriched: EnrichedWorkout[] = await Promise.all(
      allWorkouts.map(async (w) => {
        const wExercises = await db.getWorkoutExercises(w.id!);
        const focusAreas = aggregateMuscleRatings(wExercises, allExercises);
        return { ...w, exerciseCount: wExercises.length, focusAreas };
      })
    );

    setWorkouts(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (workout: Omit<Workout, "id" | "createdAt">) => {
      await db.createWorkout(workout);
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: number) => {
      await db.deleteWorkout(id);
      await refresh();
    },
    [refresh]
  );

  return { workouts, loading, refresh, create, remove };
}

function aggregateMuscleRatings(
  wExercises: WorkoutExercise[],
  allExercises: { id?: number; focusAreas: MuscleRatings }[]
): MuscleRatings {
  const result = createDefaultMuscleRatings();
  for (const we of wExercises) {
    const ex = allExercises.find((e) => e.id === we.exerciseId);
    if (!ex) continue;
    for (const [group, value] of Object.entries(ex.focusAreas)) {
      result[group] = Math.max(result[group] || 0, value);
    }
  }
  return result;
}
