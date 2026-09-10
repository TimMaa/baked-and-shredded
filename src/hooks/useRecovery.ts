import { useState, useEffect, useCallback } from "react";
import * as db from "@/lib/db";
import { ALL_MUSCLE_GROUPS } from "@/lib/muscleGroups";

export interface MuscleRecovery {
  group: string;
  hoursSinceWorked: number | null;
  intensity: number;
  status: "fresh" | "recovering" | "fatigued";
}

function getStatus(hours: number | null, intensity: number): "fresh" | "recovering" | "fatigued" {
  if (hours === null) return "fresh";
  const freshThreshold = 72 * (intensity / 5);
  const fatiguedThreshold = 24 * (intensity / 5);
  if (hours >= freshThreshold) return "fresh";
  if (hours >= fatiguedThreshold) return "recovering";
  return "fatigued";
}

export function useRecovery() {
  const [recovery, setRecovery] = useState<MuscleRecovery[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const now = Date.now();
    const oneWeekAgo = now - 7 * 86400000;

    const [allSessions, allSets, allExercises, allActivities] = await Promise.all([
      db.getAllSessions(),
      db.getAllSessionSets(),
      db.getAllExercises(),
      db.getAllActivities(),
    ]);

    const recentSessions = allSessions.filter(
      (s) => s.completedAt && new Date(s.completedAt).getTime() >= oneWeekAgo
    );
    const recentSessionIds = new Set(recentSessions.map((s) => s.id));
    const recentSets = allSets.filter((ss) => recentSessionIds.has(ss.sessionId));

    const exerciseMap = new Map(allExercises.map((e) => [e.id!, e]));

    const muscleLastWorked = new Map<string, { time: number; intensity: number }>();

    for (const set of recentSets) {
      const exercise = exerciseMap.get(set.exerciseId);
      if (!exercise) continue;
      const setTime = new Date(set.completedAt).getTime();

      for (const [group, rating] of Object.entries(exercise.focusAreas)) {
        if (rating <= 0) continue;
        const current = muscleLastWorked.get(group);
        if (!current || setTime > current.time) {
          muscleLastWorked.set(group, { time: setTime, intensity: rating });
        }
      }
    }

    const recentActivities = allActivities.filter(
      (a) => new Date(a.performedAt).getTime() >= oneWeekAgo
    );
    for (const activity of recentActivities) {
      const activityTime = new Date(activity.performedAt).getTime();
      for (const [group, rating] of Object.entries(activity.muscleGroups)) {
        if (rating <= 0) continue;
        const current = muscleLastWorked.get(group);
        if (!current || activityTime > current.time) {
          muscleLastWorked.set(group, { time: activityTime, intensity: rating });
        }
      }
    }

    const result: MuscleRecovery[] = ALL_MUSCLE_GROUPS.map((group) => {
      const data = muscleLastWorked.get(group);
      const hoursSinceWorked = data ? (now - data.time) / 3600000 : null;
      return {
        group,
        hoursSinceWorked,
        intensity: data?.intensity ?? 0,
        status: getStatus(hoursSinceWorked, data?.intensity ?? 0),
      };
    });

    setRecovery(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { recovery, loading, refresh };
}
