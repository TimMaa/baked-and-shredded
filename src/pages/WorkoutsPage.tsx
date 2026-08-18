import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWorkouts } from "@/hooks/useWorkouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MuscleGroupCoverage } from "@/components/workouts/MuscleGroupCoverage";
import * as gemini from "@/lib/gemini";
import * as db from "@/lib/db";
import { ratedMuscleGroups } from "@/lib/muscleGroups";
import { Plus, Trash2, Sparkles } from "lucide-react";

export function WorkoutsPage() {
  const { workouts, loading, create, remove, refresh } = useWorkouts();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);
  const [showAiBuilder, setShowAiBuilder] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await create({ name: name.trim(), description: description.trim() || null });
    setName("");
    setDescription("");
    setShowForm(false);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingAi(true);
    try {
      const allExercises = await db.getAllExercises();
      if (allExercises.length === 0) {
        setGeneratingAi(false);
        return;
      }
      const availableExercises = allExercises.map((e) => ({
        id: e.id!,
        name: e.name,
        muscleGroups: ratedMuscleGroups(e.focusAreas),
      }));

      const result = await gemini.generateWorkout({
        prompt: aiPrompt.trim(),
        availableExercises,
      });

      const workoutId = await db.createWorkout({
        name: result.name,
        description: result.description || null,
      });

      for (let i = 0; i < result.exercises.length; i++) {
        const ex = result.exercises[i];
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
      setShowAiBuilder(false);
      await refresh();
      navigate(`/workouts/${workoutId}`);
    } catch {
      // silently fail
    }
    setGeneratingAi(false);
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workouts</h1>
          <p className="text-sm text-muted-foreground">Your workout plans</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="size-4" />
          Create
        </Button>
      </div>

      {gemini.isConfigured() && (
        <div>
          {showAiBuilder ? (
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 text-sm">
                  <Sparkles className="size-3.5" /> AI Workout Builder
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea
                  placeholder="Describe the workout you want, e.g. &quot;Upper body push day, 45 minutes, focus on chest and shoulders&quot;"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleAiGenerate}
                    disabled={!aiPrompt.trim() || generatingAi}
                    className="flex-1"
                  >
                    <Sparkles className="size-3.5" />
                    {generatingAi ? "Generating..." : "Generate Workout"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowAiBuilder(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowAiBuilder(true)}
            >
              <Sparkles className="size-3.5" /> Build with AI
            </Button>
          )}
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Workout</CardTitle>
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
              <Button onClick={handleCreate} className="flex-1">Create</Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {workouts.map((w) => (
          <Link key={w.id} to={`/workouts/${w.id}`} className="block no-underline">
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
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (confirm("Delete this workout?")) remove(w.id!);
                    }}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
                <MuscleGroupCoverage ratings={w.focusAreas} compact />
              </CardContent>
            </Card>
          </Link>
        ))}
        {workouts.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No workouts yet. Create one to get started.
          </p>
        )}
      </div>
    </div>
  );
}
