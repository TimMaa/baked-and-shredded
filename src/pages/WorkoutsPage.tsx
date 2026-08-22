import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWorkouts } from "@/hooks/useWorkouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MuscleGroupCoverage } from "@/components/workouts/MuscleGroupCoverage";
import * as gemini from "@/lib/gemini";
import * as db from "@/lib/db";
import { ratedMuscleGroups } from "@/lib/muscleGroups";
import type { Session } from "@/types";
import { Plus, Trash2, Sparkles, Loader2 } from "lucide-react";

export function WorkoutsPage() {
  const { workouts, loading, create, remove, refresh } = useWorkouts();
  const navigate = useNavigate();
  const [showManualForm, setShowManualForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    db.getAllSessions().then(setSessions);
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await create({ name: name.trim(), description: description.trim() || null });
    setName("");
    setDescription("");
    setShowManualForm(false);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingAi(true);
    try {
      const allExercises = await db.getAllExercises();
      const availableExercises = allExercises.map((e) => ({
        id: e.id!,
        name: e.name,
        muscleGroups: ratedMuscleGroups(e.focusAreas),
      }));

      const prefs = await db.getUserPreferences();

      const result = await gemini.generateWorkout({
        prompt: aiPrompt.trim(),
        availableExercises,
        availableEquipment: prefs.availableEquipment || undefined,
      });

      const resolvedExercises: { exerciseId: number; sets: number; targetReps: number; targetWeight: number | null; targetUnit: "kg" | "s" }[] = [];

      for (const ex of result.exercises) {
        if (ex.existingId) {
          resolvedExercises.push({
            exerciseId: ex.existingId,
            sets: ex.sets,
            targetReps: ex.targetReps,
            targetWeight: ex.targetWeight,
            targetUnit: ex.targetUnit,
          });
        } else if (ex.newExercise) {
          try {
            const newId = await db.createExercise({
              name: ex.newExercise.name,
              description: ex.newExercise.description || null,
              tip: ex.newExercise.tip || null,
              focusAreas: ex.newExercise.focusAreas,
              equipment: ex.newExercise.equipment,
            });
            resolvedExercises.push({
              exerciseId: newId,
              sets: ex.sets,
              targetReps: ex.targetReps,
              targetWeight: ex.targetWeight,
              targetUnit: ex.targetUnit,
            });
          } catch {
            // skip exercises that fail to create
          }
        }
      }

      if (resolvedExercises.length === 0) {
        alert("Workout generation failed — no exercises could be resolved. Try again.");
        setGeneratingAi(false);
        return;
      }

      const workoutId = await db.createWorkout({
        name: result.name,
        description: result.description || null,
      });

      for (let i = 0; i < resolvedExercises.length; i++) {
        const ex = resolvedExercises[i];
        await db.addWorkoutExercise({
          workoutId,
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          targetReps: ex.targetReps,
          targetWeight: ex.targetWeight,
          targetUnit: ex.targetUnit,
          orderIndex: i,
        });
      }

      setAiPrompt("");
      await refresh();
      navigate(`/library/workout/${workoutId}`);
    } catch {
      alert("Workout generation failed. Please try again.");
    }
    setGeneratingAi(false);
  };

  const getLastTrained = (workoutId: number): string | null => {
    const workoutSessions = sessions
      .filter((s) => s.workoutId === workoutId && s.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
    if (workoutSessions.length === 0) return null;
    const days = Math.round((Date.now() - new Date(workoutSessions[0].completedAt!).getTime()) / 86400000);
    if (days === 0) return "today";
    return `${days}d ago`;
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{workouts.length} workouts</p>
        <Button variant="outline" size="sm" onClick={() => setShowManualForm(!showManualForm)}>
          <Plus className="size-3.5" />
          Manual
        </Button>
      </div>

      {/* AI Builder — default/prominent */}
      {gemini.isConfigured() && (
        <Card className="border-primary/30">
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="size-3.5 text-primary" /> Describe your workout
            </div>
            <textarea
              placeholder={"e.g. \"Upper body push day, 45 minutes, focus on chest and shoulders\""}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
            />
            <Button
              onClick={handleAiGenerate}
              disabled={!aiPrompt.trim() || generatingAi}
              className="w-full"
              size="sm"
            >
              {generatingAi ? (
                <><Loader2 className="size-3.5 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="size-3.5" /> Generate Workout</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Manual create — secondary */}
      {showManualForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">New Workout (Manual)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Workout name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
            />
            <div className="flex gap-2">
              <Button onClick={handleCreate} className="flex-1" size="sm">Create</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowManualForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {workouts.map((w) => {
          const lastTrained = getLastTrained(w.id!);
          return (
            <Link key={w.id} to={`/library/workout/${w.id}`} className="block no-underline">
              <Card size="sm" className="transition-colors hover:border-primary/50">
                <CardContent className="space-y-2 pt-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">{w.name}</h3>
                      {w.description && (
                        <p className="text-xs text-muted-foreground">{w.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {w.exerciseCount} exercises
                        {lastTrained && <> · last trained {lastTrained}</>}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const hasSessions = sessions.some((s) => s.workoutId === w.id);
                        const msg = hasSessions
                          ? "Archive this workout? It will be hidden but your training history is preserved."
                          : "Delete this workout?";
                        if (confirm(msg)) remove(w.id!);
                      }}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                  <MuscleGroupCoverage ratings={w.focusAreas} compact />
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {workouts.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No workouts yet. Describe what you want above to get started.
          </p>
        )}
      </div>
    </div>
  );
}
