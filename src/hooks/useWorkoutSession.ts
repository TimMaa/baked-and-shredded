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

export function useWorkoutSession() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress[]>([]);
  const [activeSet, setActiveSet] = useState<ActiveSet | null>(null);
  const [completedSets, setCompletedSets] = useState<(SessionSet & { exerciseName: string })[]>([]);
  const [totalSetsPlanned, setTotalSetsPlanned] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);

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

      if (progress.length > 0) {
        setActiveSet({
          workoutExerciseId: progress[0].workoutExerciseId,
          exerciseId: progress[0].exerciseId,
          exerciseName: progress[0].exerciseName,
          setNumber: 1,
          targetReps: progress[0].targetReps,
          targetWeight: progress[0].targetWeight,
          targetUnit: progress[0].targetUnit,
        });
      }
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
    setExerciseProgress((prev) =>
      prev.map((ep) =>
        ep.workoutExerciseId === activeSet.workoutExerciseId
          ? { ...ep, completedSets: ep.completedSets + 1 }
          : ep
      )
    );
    setActiveSet(null);
    resetStopwatch();
  }, [sessionId, activeSet, resetStopwatch]);

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
      setExerciseProgress((prev) =>
        prev.map((ep) =>
          ep.workoutExerciseId === activeSet.workoutExerciseId
            ? { ...ep, completedSets: ep.completedSets + 1 }
            : ep
        )
      );
      setActiveSet(null);
      resetStopwatch();
    },
    [sessionId, activeSet, resetStopwatch]
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
    remainingExercises,
    stopwatchMs,
    stopwatchRunning,
    startSession,
    confirmExpected,
    recordDeviation,
    selectNextSet,
    endSession,
    startStopwatch,
    pauseStopwatch,
    resetStopwatch,
  };
}
