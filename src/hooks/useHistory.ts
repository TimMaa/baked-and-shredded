import { useState, useEffect, useCallback } from "react";
import type {
  SessionHistory,
  WorkoutAnalytics,
  ExerciseDeviationAnalytics,
} from "@/types";
import * as db from "@/lib/db";

export type DateRange = "all" | "7" | "30" | "90";

export function useHistory(range: DateRange = "all") {
  const [sessions, setSessions] = useState<SessionHistory[]>([]);
  const [workoutAnalytics, setWorkoutAnalytics] = useState<WorkoutAnalytics[]>([]);
  const [exerciseAnalytics, setExerciseAnalytics] = useState<ExerciseDeviationAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [allSessions, allSets, allWorkouts, allExercises] = await Promise.all([
      db.getAllSessions(),
      db.getAllSessionSets(),
      db.getAllWorkouts(),
      db.getAllExercises(),
    ]);

    const cutoff = range === "all" ? null : Date.now() - Number(range) * 86400000;
    const filteredSessions = cutoff
      ? allSessions.filter((s) => new Date(s.startedAt).getTime() >= cutoff)
      : allSessions;

    const sessionHistory: SessionHistory[] = filteredSessions
      .map((s) => {
        const sets = allSets.filter((ss) => ss.sessionId === s.id);
        const workout = allWorkouts.find((w) => w.id === s.workoutId);
        const expectedSets = sets.filter((ss) => ss.status === "expected").length;
        const deviationSets = sets.filter((ss) => ss.status === "deviation").length;
        const completionRatePct =
          s.totalSetsPlanned > 0
            ? Math.round((s.setsCompleted * 1000) / s.totalSetsPlanned) / 10
            : 0;
        const adherenceRatePct =
          s.setsCompleted > 0
            ? Math.round((expectedSets * 1000) / s.setsCompleted) / 10
            : 0;
        const durationSeconds = s.completedAt
          ? Math.round(
              (new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime()) / 1000
            )
          : 0;

        return {
          sessionId: s.id!,
          workoutId: s.workoutId,
          workoutName: workout?.name || "Unknown",
          startedAt: s.startedAt,
          completedAt: s.completedAt,
          totalSetsPlanned: s.totalSetsPlanned,
          setsCompleted: s.setsCompleted,
          expectedSets,
          deviationSets,
          completionRatePct,
          adherenceRatePct,
          durationSeconds,
        };
      })
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    setSessions(sessionHistory);

    // Workout aggregate analytics
    const workoutMap = new Map<number, SessionHistory[]>();
    for (const s of sessionHistory) {
      const arr = workoutMap.get(s.workoutId) || [];
      arr.push(s);
      workoutMap.set(s.workoutId, arr);
    }
    const wAnalytics: WorkoutAnalytics[] = [...workoutMap.entries()].map(
      ([workoutId, sessions]) => ({
        workoutId,
        workoutName: sessions[0].workoutName,
        sessionsCount: sessions.length,
        totalSetsLogged: sessions.reduce((s, sess) => s + sess.setsCompleted, 0),
        avgCompletionRatePct:
          Math.round(
            (sessions.reduce((s, sess) => s + sess.completionRatePct, 0) / sessions.length) * 10
          ) / 10,
        avgAdherenceRatePct:
          Math.round(
            (sessions.reduce((s, sess) => s + sess.adherenceRatePct, 0) / sessions.length) * 10
          ) / 10,
        bestAdherenceRatePct: Math.max(...sessions.map((s) => s.adherenceRatePct)),
        lastCompletedAt: sessions[0].completedAt,
      })
    );
    setWorkoutAnalytics(wAnalytics.sort((a, b) => b.sessionsCount - a.sessionsCount));

    // Exercise deviation analytics
    const filteredSessionIds = new Set(filteredSessions.map((s) => s.id));
    const filteredSets = allSets.filter((ss) => filteredSessionIds.has(ss.sessionId));
    const exerciseMap = new Map<number, typeof filteredSets>();
    for (const ss of filteredSets) {
      const arr = exerciseMap.get(ss.exerciseId) || [];
      arr.push(ss);
      exerciseMap.set(ss.exerciseId, arr);
    }
    const eAnalytics: ExerciseDeviationAnalytics[] = [...exerciseMap.entries()].map(
      ([exerciseId, sets]) => {
        const ex = allExercises.find((e) => e.id === exerciseId);
        const expectedSets = sets.filter((s) => s.status === "expected").length;
        const deviationSets = sets.filter((s) => s.status === "deviation").length;
        const weightDeviations = sets
          .filter((s) => s.targetUnit === "kg" && s.actualWeight != null && s.targetWeight != null)
          .map((s) => Math.abs(s.actualWeight! - s.targetWeight!));
        const timeDeviations = sets
          .filter((s) => s.targetUnit === "s" && s.actualWeight != null && s.targetWeight != null)
          .map((s) => Math.abs(s.actualWeight! - s.targetWeight!));

        return {
          exerciseId,
          exerciseName: ex?.name || "Unknown",
          totalSetsLogged: sets.length,
          expectedSets,
          deviationSets,
          deviationRatePct:
            Math.round((deviationSets * 1000) / sets.length) / 10,
          avgWeightDelta:
            weightDeviations.length > 0
              ? Math.round(
                  (weightDeviations.reduce((a, b) => a + b, 0) / weightDeviations.length) * 100
                ) / 100
              : null,
          avgTimeDeltaSeconds:
            timeDeviations.length > 0
              ? Math.round(
                  (timeDeviations.reduce((a, b) => a + b, 0) / timeDeviations.length) * 100
                ) / 100
              : null,
        };
      }
    );
    setExerciseAnalytics(
      eAnalytics.sort((a, b) => b.deviationRatePct - a.deviationRatePct)
    );
    setLoading(false);
  }, [range]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const removeSession = useCallback(
    async (sessionId: number) => {
      await db.deleteSession(sessionId);
      await refresh();
    },
    [refresh]
  );

  return { sessions, workoutAnalytics, exerciseAnalytics, loading, refresh, removeSession };
}
