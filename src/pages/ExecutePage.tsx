import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useWorkoutSession } from "@/hooks/useWorkoutSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SessionStopwatch, formatStopwatchTime } from "@/components/sessions/SessionStopwatch";
import * as db from "@/lib/db";
import type { Workout, WorkoutExercise, Exercise } from "@/types";
import { Play, Square, ChevronRight, Check, AlertTriangle, BarChart3 } from "lucide-react";

interface WorkoutOption extends Workout {
  exercises: (WorkoutExercise & { exerciseName: string })[];
}

export function ExecutePage() {
  const [workouts, setWorkouts] = useState<WorkoutOption[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(null);
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);
  const [showDeviation, setShowDeviation] = useState(false);
  const [deviationReps, setDeviationReps] = useState("");
  const [deviationWeight, setDeviationWeight] = useState("");

  const {
    sessionId, activeSet, completedSets,
    totalSetsPlanned, startedAt, isComplete, remainingExercises,
    stopwatchMs, stopwatchRunning,
    startSession, confirmExpected, recordDeviation, selectNextSet, endSession,
    startStopwatch, pauseStopwatch, resetStopwatch,
  } = useWorkoutSession();

  const loadWorkouts = useCallback(async () => {
    const allWorkouts = await db.getAllWorkouts();
    const allExercises = await db.getAllExercises();
    const options: WorkoutOption[] = await Promise.all(
      allWorkouts.map(async (w) => {
        const wes = await db.getWorkoutExercises(w.id!);
        return {
          ...w,
          exercises: wes.map((we) => {
            const ex = allExercises.find((e: Exercise) => e.id === we.exerciseId);
            return { ...we, exerciseName: ex?.name || "Unknown" };
          }),
        };
      })
    );
    setWorkouts(options.filter((w) => w.exercises.length > 0));
    setLoadingWorkouts(false);
  }, []);

  useEffect(() => { loadWorkouts(); }, [loadWorkouts]);

  const handleStart = async () => {
    const w = workouts.find((w) => w.id === selectedWorkoutId);
    if (!w) return;
    await startSession(w.id!, w.exercises);
  };

  const handleConfirmExpected = async () => {
    await confirmExpected();
    setShowDeviation(false);
  };

  const handleDeviation = async () => {
    const reps = Number(deviationReps) || activeSet!.targetReps;
    const weight = deviationWeight ? Number(deviationWeight) : activeSet!.targetWeight;
    await recordDeviation(reps, weight);
    setShowDeviation(false);
    setDeviationReps("");
    setDeviationWeight("");
  };

  const handleStopwatchComplete = async () => {
    const seconds = Math.round(stopwatchMs / 1000);
    await recordDeviation(1, seconds);
    setShowDeviation(false);
  };

  // Pre-session state
  if (!sessionId) {
    if (loadingWorkouts) {
      return <div className="text-center text-muted-foreground">Loading...</div>;
    }
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Execute Workout</h1>
          <Link to="/history" className="text-sm text-muted-foreground hover:text-foreground">
            <BarChart3 className="inline size-4 mr-1" />History
          </Link>
        </div>
        <Card>
          <CardHeader><CardTitle>Select Workout</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {workouts.map((w) => (
              <label
                key={w.id}
                className="flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <input
                  type="radio"
                  name="workout"
                  checked={selectedWorkoutId === w.id}
                  onChange={() => setSelectedWorkoutId(w.id!)}
                  className="accent-primary"
                />
                <div>
                  <p className="font-medium">{w.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.exercises.length} exercises
                  </p>
                </div>
              </label>
            ))}
            {workouts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No workouts with exercises. <Link to="/workouts" className="text-primary">Create one</Link>
              </p>
            )}
          </CardContent>
        </Card>
        <Button
          onClick={handleStart}
          disabled={!selectedWorkoutId}
          className="w-full"
          size="lg"
        >
          <Play className="size-4" /> Start Workout
        </Button>
      </div>
    );
  }

  // Active session
  const setsCompleted = completedSets.length;
  const progressPct = totalSetsPlanned > 0 ? (setsCompleted / totalSetsPlanned) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">
            {setsCompleted} / {totalSetsPlanned} sets
          </h1>
          {startedAt && (
            <p className="text-xs text-muted-foreground">
              Started {new Date(startedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button variant="destructive" size="sm" onClick={endSession}>
          <Square className="size-3" /> End
        </Button>
      </div>

      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {isComplete && (
        <Card className="border-success/50 bg-success/10">
          <CardContent className="py-4 text-center">
            <Check className="mx-auto size-8 text-success" />
            <p className="mt-2 font-medium text-success">Workout Complete!</p>
          </CardContent>
        </Card>
      )}

      {activeSet && (
        <Card className="border-primary/50">
          <CardContent className="space-y-3 pt-4">
            <div className="text-center">
              <p className="text-lg font-bold">{activeSet.exerciseName}</p>
              <p className="text-sm text-muted-foreground">
                Set {activeSet.setNumber}
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Badge variant="secondary">
                {activeSet.targetUnit === "s"
                  ? `${activeSet.targetWeight}s`
                  : `${activeSet.targetReps} reps`}
              </Badge>
              {activeSet.targetUnit === "kg" && activeSet.targetWeight && (
                <Badge variant="secondary">{activeSet.targetWeight} kg</Badge>
              )}
            </div>

            {activeSet.targetUnit === "s" && (
              <SessionStopwatch
                ms={stopwatchMs}
                running={stopwatchRunning}
                onStart={startStopwatch}
                onPause={pauseStopwatch}
                onReset={resetStopwatch}
              />
            )}

            <div className="flex gap-2">
              <Button onClick={handleConfirmExpected} className="flex-1">
                <Check className="size-3.5" /> Confirm Expected
              </Button>
              {activeSet.targetUnit === "s" && stopwatchMs > 0 && (
                <Button variant="secondary" onClick={handleStopwatchComplete}>
                  {formatStopwatchTime(stopwatchMs)}
                </Button>
              )}
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowDeviation(!showDeviation)}
            >
              <AlertTriangle className="size-3.5" /> Record Deviation
            </Button>

            {showDeviation && (
              <div className="space-y-2 rounded-md border p-3">
                {activeSet.targetUnit === "kg" && (
                  <div>
                    <label className="text-xs text-muted-foreground">Actual Reps</label>
                    <Input
                      type="number"
                      placeholder={String(activeSet.targetReps)}
                      value={deviationReps}
                      onChange={(e) => setDeviationReps(e.target.value)}
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs text-muted-foreground">
                    Actual {activeSet.targetUnit === "s" ? "Time (s)" : "Weight (kg)"}
                  </label>
                  <Input
                    type="number"
                    placeholder={String(activeSet.targetWeight || "")}
                    value={deviationWeight}
                    onChange={(e) => setDeviationWeight(e.target.value)}
                  />
                </div>
                <Button onClick={handleDeviation} className="w-full" size="sm">
                  Save Deviation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!activeSet && !isComplete && remainingExercises.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Next Set</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {remainingExercises.map((ep) => (
              <button
                key={ep.workoutExerciseId}
                onClick={() => selectNextSet(ep.workoutExerciseId)}
                className="flex w-full items-center justify-between rounded-md border p-2.5 text-left transition-colors hover:bg-accent"
              >
                <div>
                  <p className="text-sm font-medium">{ep.exerciseName}</p>
                  <p className="text-xs text-muted-foreground">
                    {ep.completedSets}/{ep.totalSets} sets done
                  </p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {completedSets.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-sm font-medium text-muted-foreground">Recent</h3>
          {completedSets.slice(0, 5).map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span>{s.exerciseName} — Set {s.setNumber}</span>
              <Badge variant={s.status === "expected" ? "secondary" : "outline"}>
                {s.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
