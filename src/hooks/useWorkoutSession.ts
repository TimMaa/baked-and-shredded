import { useState, useCallback, useRef, useEffect } from "react";
import type { WorkoutExercise, SessionSet } from "@/types";
import * as db from "@/lib/db";

interface ExerciseProgress {
  exerciseId: number;
  workoutExerciseId: number;
  exerciseName: string;
  totalSets: number;
  completedSets: number;
  targetReps: number;
  targetWeight: number | null;
  targetUnit: "kg" | "s";
}

interface ActiveSet {
  workoutExerciseId: number;
  exerciseId: number;
  exerciseName: string;
  setNumber: number;
  targetReps: number;
  targetWeight: number | null;
  targetUnit: "kg" | "s";
}

function computeNextSet(
  progress: ExerciseProgress[],
  currentWorkoutExerciseId: number | null
): ActiveSet | null {
  const currentIdx = currentWorkoutExerciseId
    ? progress.findIndex((ep) => ep.workoutExerciseId === currentWorkoutExerciseId)
    : -1;

  const current = currentIdx >= 0 ? progress[currentIdx] : null;
  if (current && current.completedSets < current.totalSets) {
    return {
      workoutExerciseId: current.workoutExerciseId,
      exerciseId: current.exerciseId,
      exerciseName: current.exerciseName,
      setNumber: current.completedSets + 1,
      targetReps: current.targetReps,
      targetWeight: current.targetWeight,
      targetUnit: current.targetUnit,
    };
  }

  const remaining = progress.filter((ep) => ep.completedSets < ep.totalSets);
  if (remaining.length === 0) return null;

  const next = remaining[0];
  return {
    workoutExerciseId: next.workoutExerciseId,
    exerciseId: next.exerciseId,
    exerciseName: next.exerciseName,
    setNumber: next.completedSets + 1,
    targetReps: next.targetReps,
    targetWeight: next.targetWeight,
    targetUnit: next.targetUnit,
  };
}

export function useWorkoutSession() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress[]>([]);
  const [activeSet, setActiveSet] = useState<ActiveSet | null>(null);
  const [completedSets, setCompletedSets] = useState<(SessionSet & { exerciseName: string })[]>([]);
  const [totalSetsPlanned, setTotalSetsPlanned] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState(true);

  // Stopwatch
  const [stopwatchMs, setStopwatchMs] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const stopwatchRef = useRef<number | null>(null);
  const stopwatchAnchor = useRef<number>(0);

  useEffect(() => {
    if (stopwatchRunning) {
      stopwatchAnchor.current = Date.now() - stopwatchMs;
      const tick = () => {
        setStopwatchMs(Date.now() - stopwatchAnchor.current);
        stopwatchRef.current = requestAnimationFrame(tick);
      };
      stopwatchRef.current = requestAnimationFrame(tick);
    } else if (stopwatchRef.current) {
      cancelAnimationFrame(stopwatchRef.current);
      stopwatchRef.current = null;
    }
    return () => {
      if (stopwatchRef.current) cancelAnimationFrame(stopwatchRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- capture stopwatchMs at effect start
  }, [stopwatchRunning]);

  const startStopwatch = useCallback(() => setStopwatchRunning(true), []);
  const pauseStopwatch = useCallback(() => setStopwatchRunning(false), []);
  const resetStopwatch = useCallback(() => {
    setStopwatchRunning(false);
    setStopwatchMs(0);
  }, []);

  // Resume active session from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const activeSession = await db.getActiveSession();
      if (cancelled || !activeSession) {
        setIsResuming(false);
        return;
      }

      const wes = await db.getWorkoutExercises(activeSession.workoutId);
      const allExercises = await db.getAllExercises();
      const sets = await db.getSessionSets(activeSession.id!);

      const exerciseMap = new Map(allExercises.map((e) => [e.id!, e.name]));

      const progress: ExerciseProgress[] = wes.map((we) => {
        const completedCount = sets.filter(
          (s) => s.workoutExerciseId === we.id
        ).length;
        return {
          exerciseId: we.exerciseId,
          workoutExerciseId: we.id!,
          exerciseName: exerciseMap.get(we.exerciseId) || "Unknown",
          totalSets: we.sets,
          completedSets: completedCount,
          targetReps: we.targetReps,
          targetWeight: we.targetWeight,
          targetUnit: we.targetUnit,
        };
      });

      const enrichedSets = sets
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
        .map((s) => ({
          ...s,
          exerciseName: exerciseMap.get(s.exerciseId) || "Unknown",
        }));

      if (cancelled) return;

      setSessionId(activeSession.id!);
      setTotalSetsPlanned(activeSession.totalSetsPlanned);
      setStartedAt(activeSession.startedAt);
      setExerciseProgress(progress);
      setCompletedSets(enrichedSets);

      const lastSet = enrichedSets[0];
      const nextSet = computeNextSet(
        progress,
        lastSet?.workoutExerciseId ?? null
      );
      setActiveSet(nextSet);
      setIsResuming(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const startSession = useCallback(
    async (
      workoutId: number,
      workoutExercises: (WorkoutExercise & { exerciseName: string })[]
    ) => {
      const total = workoutExercises.reduce((sum, we) => sum + we.sets, 0);
      const id = await db.createSession(workoutId, total);
      setSessionId(id);
      setTotalSetsPlanned(total);
      setStartedAt(new Date().toISOString());
      setCompletedSets([]);

      const progress: ExerciseProgress[] = workoutExercises.map((we) => ({
        exerciseId: we.exerciseId,
        workoutExerciseId: we.id!,
        exerciseName: we.exerciseName,
        totalSets: we.sets,
        completedSets: 0,
        targetReps: we.targetReps,
        targetWeight: we.targetWeight,
        targetUnit: we.targetUnit,
      }));
      setExerciseProgress(progress);

      const next = computeNextSet(progress, null);
      setActiveSet(next);
    },
    []
  );

  const confirmExpected = useCallback(async () => {
    if (!sessionId || !activeSet) return;
    const setId = await db.logSessionSet({
      sessionId,
      workoutExerciseId: activeSet.workoutExerciseId,
      exerciseId: activeSet.exerciseId,
      setNumber: activeSet.setNumber,
      targetReps: activeSet.targetReps,
      targetWeight: activeSet.targetWeight,
      targetUnit: activeSet.targetUnit,
      actualReps: activeSet.targetReps,
      actualWeight: activeSet.targetWeight,
      status: "expected",
    });
    const newCompleted: SessionSet & { exerciseName: string } = {
      id: setId,
      sessionId,
      workoutExerciseId: activeSet.workoutExerciseId,
      exerciseId: activeSet.exerciseId,
      setNumber: activeSet.setNumber,
      targetReps: activeSet.targetReps,
      targetWeight: activeSet.targetWeight,
      targetUnit: activeSet.targetUnit,
      actualReps: activeSet.targetReps,
      actualWeight: activeSet.targetWeight,
      status: "expected",
      completedAt: new Date().toISOString(),
      exerciseName: activeSet.exerciseName,
    };
    setCompletedSets((prev) => [newCompleted, ...prev]);

    const updatedProgress = exerciseProgress.map((ep) =>
      ep.workoutExerciseId === activeSet.workoutExerciseId
        ? { ...ep, completedSets: ep.completedSets + 1 }
        : ep
    );
    setExerciseProgress(updatedProgress);
    setActiveSet(computeNextSet(updatedProgress, activeSet.workoutExerciseId));
    resetStopwatch();
  }, [sessionId, activeSet, exerciseProgress, resetStopwatch]);

  const recordDeviation = useCallback(
    async (actualReps: number, actualWeight: number | null) => {
      if (!sessionId || !activeSet) return;
      const setId = await db.logSessionSet({
        sessionId,
        workoutExerciseId: activeSet.workoutExerciseId,
        exerciseId: activeSet.exerciseId,
        setNumber: activeSet.setNumber,
        targetReps: activeSet.targetReps,
        targetWeight: activeSet.targetWeight,
        targetUnit: activeSet.targetUnit,
        actualReps,
        actualWeight,
        status: "deviation",
      });
      const newCompleted: SessionSet & { exerciseName: string } = {
        id: setId,
        sessionId,
        workoutExerciseId: activeSet.workoutExerciseId,
        exerciseId: activeSet.exerciseId,
        setNumber: activeSet.setNumber,
        targetReps: activeSet.targetReps,
        targetWeight: activeSet.targetWeight,
        targetUnit: activeSet.targetUnit,
        actualReps,
        actualWeight,
        status: "deviation",
        completedAt: new Date().toISOString(),
        exerciseName: activeSet.exerciseName,
      };
      setCompletedSets((prev) => [newCompleted, ...prev]);

      const updatedProgress = exerciseProgress.map((ep) =>
        ep.workoutExerciseId === activeSet.workoutExerciseId
          ? { ...ep, completedSets: ep.completedSets + 1 }
          : ep
      );
      setExerciseProgress(updatedProgress);
      setActiveSet(computeNextSet(updatedProgress, activeSet.workoutExerciseId));
      resetStopwatch();
    },
    [sessionId, activeSet, exerciseProgress, resetStopwatch]
  );

  const selectNextSet = useCallback(
    (workoutExerciseId: number) => {
      const ep = exerciseProgress.find(
        (e) => e.workoutExerciseId === workoutExerciseId
      );
      if (!ep || ep.completedSets >= ep.totalSets) return;
      setActiveSet({
        workoutExerciseId: ep.workoutExerciseId,
        exerciseId: ep.exerciseId,
        exerciseName: ep.exerciseName,
        setNumber: ep.completedSets + 1,
        targetReps: ep.targetReps,
        targetWeight: ep.targetWeight,
        targetUnit: ep.targetUnit,
      });
    },
    [exerciseProgress]
  );

  const clearActiveSet = useCallback(() => setActiveSet(null), []);

  const endSession = useCallback(async () => {
    if (!sessionId) return;
    await db.completeSession(sessionId, completedSets.length);
    setSessionId(null);
    setActiveSet(null);
    setExerciseProgress([]);
    setCompletedSets([]);
    resetStopwatch();
  }, [sessionId, completedSets.length, resetStopwatch]);

  const isComplete = exerciseProgress.length > 0 &&
    exerciseProgress.every((ep) => ep.completedSets >= ep.totalSets);

  const remainingExercises = exerciseProgress.filter(
    (ep) => ep.completedSets < ep.totalSets
  );

  return {
    sessionId,
    activeSet,
    exerciseProgress,
    completedSets,
    totalSetsPlanned,
    startedAt,
    isComplete,
    isResuming,
    remainingExercises,
    stopwatchMs,
    stopwatchRunning,
    startSession,
    confirmExpected,
    recordDeviation,
    selectNextSet,
    clearActiveSet,
    endSession,
    startStopwatch,
    pauseStopwatch,
    resetStopwatch,
  };
}
