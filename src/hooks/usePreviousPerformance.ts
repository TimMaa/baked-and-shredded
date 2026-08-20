import { useState, useEffect } from "react";
import * as db from "@/lib/db";

export interface PreviousPerformance {
  sets: { setNumber: number; actualReps: number; actualWeight: number | null }[];
  sessionDate: string;
}

export interface ProgressionSuggestion {
  suggestedWeight: number | null;
  suggestedReps: number;
  reason: string;
}

function computeProgression(
  recentSessions: PreviousPerformance[],
  targetReps: number,
  targetWeight: number | null,
  targetUnit: "kg" | "s"
): ProgressionSuggestion | null {
  if (recentSessions.length < 2) return null;

  const lastTwo = recentSessions.slice(0, 2);
  const allHitTarget = lastTwo.every((session) =>
    session.sets.every((s) => {
      if (targetUnit === "s") {
        return s.actualWeight != null && targetWeight != null && s.actualWeight >= targetWeight;
      }
      return s.actualReps >= targetReps;
    })
  );

  if (!allHitTarget) {
    const anyMissed = lastTwo.some((session) =>
      session.sets.some((s) => {
        if (targetUnit === "s") {
          return s.actualWeight != null && targetWeight != null && s.actualWeight < targetWeight * 0.9;
        }
        return s.actualReps < targetReps * 0.8;
      })
    );

    if (anyMissed) {
      return {
        suggestedReps: targetReps,
        suggestedWeight: targetWeight,
        reason: "Hold steady — still building consistency",
      };
    }
    return null;
  }

  if (targetUnit === "s") {
    const newTime = (targetWeight ?? 30) + 5;
    return {
      suggestedReps: 1,
      suggestedWeight: newTime,
      reason: `Hit target 2 sessions in a row — try ${newTime}s`,
    };
  }

  if (targetWeight != null && targetWeight > 0) {
    const increment = targetWeight >= 20 ? 2.5 : 1;
    return {
      suggestedReps: targetReps,
      suggestedWeight: targetWeight + increment,
      reason: `Hit ${targetReps} reps twice — try +${increment}kg`,
    };
  }

  return {
    suggestedReps: targetReps + 1,
    suggestedWeight: targetWeight,
    reason: `Hit target 2 sessions in a row — try +1 rep`,
  };
}

export function usePreviousPerformance(
  workoutExerciseId: number | null,
  targetReps: number,
  targetWeight: number | null,
  targetUnit: "kg" | "s"
) {
  const [previous, setPrevious] = useState<PreviousPerformance | null>(null);
  const [suggestion, setSuggestion] = useState<ProgressionSuggestion | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!workoutExerciseId) {
      setPrevious(null);
      setSuggestion(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);

      const allSessions = await db.getAllSessions();
      const allSets = await db.getAllSessionSets();

      const completedSessions = allSessions
        .filter((s) => s.completedAt)
        .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

      const recentPerformances: PreviousPerformance[] = [];
      for (const session of completedSessions) {
        const sessionSets = allSets
          .filter((ss) => ss.sessionId === session.id && ss.workoutExerciseId === workoutExerciseId)
          .sort((a, b) => a.setNumber - b.setNumber);

        if (sessionSets.length > 0) {
          recentPerformances.push({
            sets: sessionSets.map((s) => ({
              setNumber: s.setNumber,
              actualReps: s.actualReps,
              actualWeight: s.actualWeight,
            })),
            sessionDate: session.completedAt!,
          });
        }
        if (recentPerformances.length >= 5) break;
      }

      if (cancelled) return;

      setPrevious(recentPerformances[0] ?? null);
      setSuggestion(
        computeProgression(recentPerformances, targetReps, targetWeight, targetUnit)
      );
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [workoutExerciseId, targetReps, targetWeight, targetUnit]);

  return { previous, suggestion, loading };
}
