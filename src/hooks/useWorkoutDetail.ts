import { useState, useEffect, useCallback } from "react";
import type { Workout, WorkoutExercise, Exercise, MuscleRatings } from "@/types";
import * as db from "@/lib/db";
import { createDefaultMuscleRatings } from "@/lib/muscleGroups";

export interface WorkoutExerciseEnriched extends WorkoutExercise {
  exerciseName: string;
  focusAreas: MuscleRatings;
  unilateral: boolean;
}

export function useWorkoutDetail(id: number | undefined) {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<WorkoutExerciseEnriched[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusAreas, setFocusAreas] = useState<MuscleRatings>(
    createDefaultMuscleRatings()
  );

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [w, wExercises, allEx] = await Promise.all([
      db.getWorkout(id),
      db.getWorkoutExercises(id),
      db.getAllExercises(),
    ]);
    setWorkout(w || null);
    setAllExercises(allEx);

    const enriched: WorkoutExerciseEnriched[] = wExercises.map((we) => {
      const ex = allEx.find((e) => e.id === we.exerciseId);
      return {
        ...we,
        exerciseName: ex?.name || "Unknown",
        focusAreas: ex?.focusAreas || createDefaultMuscleRatings(),
        unilateral: ex?.unilateral ?? false,
      };
    });
    setExercises(enriched);

    const aggregated = createDefaultMuscleRatings();
    for (const e of enriched) {
      for (const [group, value] of Object.entries(e.focusAreas)) {
        aggregated[group] = Math.max(aggregated[group] || 0, value);
      }
    }
    setFocusAreas(aggregated);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateWorkout = useCallback(
    async (name: string, description: string | null) => {
      if (!workout) return;
      await db.updateWorkout({ ...workout, name, description });
      await refresh();
    },
    [workout, refresh]
  );

  const addExercise = useCallback(
    async (
      exerciseId: number,
      sets: number,
      targetReps: number,
      targetWeight: number | null,
      targetUnit: "kg" | "s"
    ) => {
      if (!id) return;
      const orderIndex = exercises.length;
      await db.addWorkoutExercise({
        workoutId: id,
        exerciseId,
        sets,
        targetReps: targetUnit === "s" ? 1 : targetReps,
        targetWeight,
        targetUnit,
        orderIndex,
      });
      await refresh();
    },
    [id, exercises.length, refresh]
  );

  const removeExercise = useCallback(
    async (weId: number) => {
      await db.deleteWorkoutExercise(weId);
      await refresh();
    },
    [refresh]
  );

  const updateExerciseParams = useCallback(
    async (
      weId: number,
      sets: number,
      targetReps: number,
      targetWeight: number | null,
      targetUnit: "kg" | "s"
    ) => {
      const existing = exercises.find((e) => e.id === weId);
      if (!existing) return;
      await db.updateWorkoutExercise({
        ...existing,
        sets,
        targetReps,
        targetWeight,
        targetUnit,
      });
      await refresh();
    },
    [exercises, refresh]
  );

  const replaceExercise = useCallback(
    async (weId: number, newExerciseId: number) => {
      const existing = exercises.find((e) => e.id === weId);
      if (!existing) return;
      await db.updateWorkoutExercise({ ...existing, exerciseId: newExerciseId });
      await refresh();
    },
    [exercises, refresh]
  );

  const reorder = useCallback(
    async (orderedIds: number[]) => {
      if (!id) return;
      await db.reorderWorkoutExercises(id, orderedIds);
      await refresh();
    },
    [id, refresh]
  );

  return {
    workout,
    exercises,
    allExercises,
    focusAreas,
    loading,
    refresh,
    updateWorkout,
    addExercise,
    removeExercise,
    replaceExercise,
    updateExerciseParams,
    reorder,
  };
}
