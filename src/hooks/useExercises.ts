import { useState, useEffect, useCallback } from "react";
import type { Exercise } from "@/types";
import * as db from "@/lib/db";

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await db.getAllExercises();
    setExercises(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (exercise: Omit<Exercise, "id" | "createdAt">) => {
      await db.createExercise(exercise);
      await refresh();
    },
    [refresh]
  );

  const update = useCallback(
    async (exercise: Exercise) => {
      await db.updateExercise(exercise);
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: number) => {
      await db.deleteExercise(id);
      await refresh();
    },
    [refresh]
  );

  return { exercises, loading, refresh, create, update, remove };
}
