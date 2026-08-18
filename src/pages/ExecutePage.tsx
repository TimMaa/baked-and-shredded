import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useWorkoutSession } from "@/hooks/useWorkoutSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SessionStopwatch, formatStopwatchTime } from "@/components/sessions/SessionStopwatch";
import * as db from "@/lib/db";
import * as gemini from "@/lib/gemini";
import type { Workout, WorkoutExercise, Exercise } from "@/types";
import { ratedMuscleGroups } from "@/lib/muscleGroups";
import { Play, Square, Check, AlertTriangle, BarChart3, Shuffle, Sparkles } from "lucide-react";

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
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [recommendation, setRecommendation] = useState<{ workoutId: number; reason: string } | null>(null);
  const [loadingRec, setLoadingRec] = useState(false);

  const {
    sessionId, activeSet, completedSets,
    totalSetsPlanned, startedAt, isComplete, isResuming, remainingExercises,
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
    setShowExercisePicker(false);
  };

  const handleDeviation = async () => {
    const reps = Number(deviationReps) || activeSet!.targetReps;
    const weight = deviationWeight ? Number(deviationWeight) : activeSet!.targetWeight;
    await recordDeviation(reps, weight);
    setShowDeviation(false);
    setShowExercisePicker(false);
    setDeviationReps("");
    setDeviationWeight("");
  };

  const handleStopwatchComplete = async () => {
    const seconds = Math.round(stopwatchMs / 1000);
    await recordDeviation(1, seconds);
    setShowDeviation(false);
    setShowExercisePicker(false);
  };

  const handleEndSession = async () => {
    await endSession();
    setShowEndConfirm(false);
  };

  const handleSwitchExercise = (workoutExerciseId: number) => {
    selectNextSet(workoutExerciseId);
    setShowExercisePicker(false);
  };

  const handleGetRecommendation = async () => {
    if (workouts.length === 0) return;
    setLoadingRec(true);
    try {
      const allExercises = await db.getAllExercises();
      const allSessions = await db.getAllSessions();
      const allWorkouts = await db.getAllWorkouts();

      const workoutInputs = await Promise.all(
        workouts.map(async (w) => {
          const wes = await db.getWorkoutExercises(w.id!);
          const muscleGroups = [...new Set(
            wes.flatMap((we) => {
              const ex = allExercises.find((e) => e.id === we.exerciseId);
              return ex ? ratedMuscleGroups(ex.focusAreas) : [];
            })
          )];
          return { id: w.id!, name: w.name, muscleGroups };
        })
      );

      const now = Date.now();
      const recentSessions = allSessions
        .filter((s) => s.completedAt)
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
        .slice(0, 10)
        .map((s) => ({
          workoutName: allWorkouts.find((w) => w.id === s.workoutId)?.name || "Unknown",
          daysAgo: Math.round((now - new Date(s.startedAt).getTime()) / 86400000),
        }));

      const rec = await gemini.suggestNextWorkout({ workouts: workoutInputs, recentSessions });
      setRecommendation(rec);
      setSelectedWorkoutId(rec.workoutId);
    } catch {
      // silently fail
    }
    setLoadingRec(false);
  };

  // Loading / resuming state
  if (isResuming) {
    return <div className="text-center text-muted-foreground py-8">Resuming session...</div>;
  }

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
            {gemini.isConfigured() && workouts.length > 0 && (
              <div className="mb-3">
                {recommendation ? (
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                      <Sparkles className="size-3" /> AI Recommendation
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{recommendation.reason}</p>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleGetRecommendation}
                    disabled={loadingRec}
                  >
                    <Sparkles className="size-3.5" />
                    {loadingRec ? "Thinking..." : "What should I train?"}
                  </Button>
                )}
              </div>
            )}
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
        <Button variant="destructive" size="sm" onClick={isComplete ? handleEndSession : () => setShowEndConfirm(true)}>
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
                <Check className="size-3.5" /> Confirm
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

            {/* Switch exercise — only show if there are other exercises to pick */}
            {remainingExercises.length > 1 && (
              <button
                onClick={() => setShowExercisePicker(!showExercisePicker)}
                className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                <Shuffle className="size-3" /> Switch exercise
              </button>
            )}

            {showExercisePicker && (
              <div className="flex flex-wrap gap-1.5">
                {remainingExercises
                  .filter((ep) => ep.workoutExerciseId !== activeSet.workoutExerciseId)
                  .map((ep) => (
                    <button
                      key={ep.workoutExerciseId}
                      onClick={() => handleSwitchExercise(ep.workoutExerciseId)}
                      className="rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-accent hover:border-primary"
                    >
                      {ep.exerciseName} ({ep.completedSets}/{ep.totalSets})
                    </button>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fallback picker when no active set and not complete */}
      {!activeSet && !isComplete && remainingExercises.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Choose Next Exercise</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {remainingExercises.map((ep) => (
              <button
                key={ep.workoutExerciseId}
                onClick={() => selectNextSet(ep.workoutExerciseId)}
                className="rounded-full border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:border-primary"
              >
                {ep.exerciseName} ({ep.completedSets}/{ep.totalSets})
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

      {/* End session confirmation dialog */}
      <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>End Session?</DialogTitle>
            <DialogDescription>
              You've completed {setsCompleted} of {totalSetsPlanned} sets.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndConfirm(false)}>
              Continue Training
            </Button>
            <Button variant="destructive" onClick={handleEndSession}>
              End Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
