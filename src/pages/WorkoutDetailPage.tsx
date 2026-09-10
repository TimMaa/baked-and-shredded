import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useWorkoutDetail } from "@/hooks/useWorkoutDetail";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MuscleGroupCoverage } from "@/components/workouts/MuscleGroupCoverage";
import { ExerciseSelector } from "@/components/workouts/ExerciseSelector";
import { formatTargetWeight } from "@/lib/utils";
import type { Exercise } from "@/types";
import { ArrowLeft, Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Pencil, Check, X, ArrowLeftRight } from "lucide-react";

export function WorkoutDetailPage() {
  const { id } = useParams();
  const workoutId = id ? Number(id) : undefined;
  const {
    workout, exercises, allExercises, focusAreas, loading,
    updateWorkout, addExercise, removeExercise, replaceExercise, updateExerciseParams, reorder,
  } = useWorkoutDetail(workoutId);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState<"kg" | "s">("kg");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [editingExId, setEditingExId] = useState<number | null>(null);
  const [editSets, setEditSets] = useState("");
  const [editReps, setEditReps] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editUnit, setEditUnit] = useState<"kg" | "s">("kg");
  const [replacingExId, setReplacingExId] = useState<number | null>(null);

  if (loading || !workout) {
    return <div className="text-center text-muted-foreground">Loading...</div>;
  }

  const startEdit = () => {
    setEditName(workout.name);
    setEditDesc(workout.description || "");
    setEditing(true);
  };

  const saveEdit = async () => {
    await updateWorkout(editName.trim(), editDesc.trim() || null);
    setEditing(false);
  };

  const handleAddExercise = async () => {
    if (!selectedExercise) return;
    await addExercise(
      selectedExercise.id!,
      Number(sets) || 3,
      unit === "s" ? 1 : Number(reps) || 10,
      weight ? Number(weight) : null,
      unit
    );
    setSelectedExercise(null);
    setSets("3");
    setReps("10");
    setWeight("");
    setUnit("kg");
    setShowAdd(false);
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const ids = exercises.map((e) => e.id!);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    await reorder(ids);
  };

  const moveDown = async (index: number) => {
    if (index >= exercises.length - 1) return;
    const ids = exercises.map((e) => e.id!);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    await reorder(ids);
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = async (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) return;
    const ids = exercises.map((e) => e.id!);
    const [moved] = ids.splice(dragIndex, 1);
    ids.splice(dropIndex, 0, moved);
    setDragIndex(null);
    await reorder(ids);
  };

  const startEditExercise = (we: typeof exercises[0]) => {
    setEditingExId(we.id!);
    setEditSets(String(we.sets));
    setEditReps(String(we.targetReps));
    setEditWeight(we.targetWeight != null ? String(we.targetWeight) : "");
    setEditUnit(we.targetUnit);
  };

  const saveEditExercise = async () => {
    if (editingExId === null) return;
    await updateExerciseParams(
      editingExId,
      Number(editSets) || 3,
      editUnit === "s" ? 1 : Number(editReps) || 10,
      editWeight ? Number(editWeight) : null,
      editUnit
    );
    setEditingExId(null);
  };

  const handleReplace = async (weId: number, newExercise: Exercise) => {
    await replaceExercise(weId, newExercise.id!);
    setReplacingExId(null);
  };

  return (
    <div className="space-y-6">
      <Link to="/library" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Library
      </Link>

      {editing ? (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
            />
            <div className="flex gap-2">
              <Button onClick={saveEdit} className="flex-1">Save</Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{workout.name}</h1>
            {workout.description && (
              <p className="text-sm text-muted-foreground">{workout.description}</p>
            )}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={startEdit}>
            <Pencil className="size-4" />
          </Button>
        </div>
      )}

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm">Muscle Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <MuscleGroupCoverage ratings={focusAreas} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Exercises ({exercises.length})</h2>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="size-3.5" /> Add
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <ExerciseSelector
              exercises={allExercises}
              excludeIds={exercises.map((e) => e.exerciseId)}
              onSelect={setSelectedExercise}
            />
            {selectedExercise && (
              <>
                <p className="text-sm font-medium">
                  Selected: {selectedExercise.name}
                </p>
                {selectedExercise.unilateral && (
                  <p className="text-xs text-muted-foreground">
                    Unilateral — a set is one rep on each side.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Sets</label>
                    <Input value={sets} onChange={(e) => setSets(e.target.value)} type="number" />
                  </div>
                  {unit === "kg" && (
                    <div>
                      <label className="text-xs text-muted-foreground">Reps</label>
                      <Input value={reps} onChange={(e) => setReps(e.target.value)} type="number" />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-muted-foreground">
                      {unit === "kg" ? "Weight (kg)" : "Time (s)"}
                    </label>
                    <Input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Unit</label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as "kg" | "s")}
                      className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                    >
                      <option value="kg">Weight (kg)</option>
                      <option value="s">Time (s)</option>
                    </select>
                  </div>
                </div>
              </>
            )}
            <div className="flex gap-2">
              <Button onClick={handleAddExercise} disabled={!selectedExercise} className="flex-1">
                Add Exercise
              </Button>
              <Button variant="ghost" onClick={() => { setShowAdd(false); setSelectedExercise(null); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {exercises.map((we, i) => (
          <div
            key={we.id}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(i)}
            className="rounded-lg border bg-card p-3 transition-shadow hover:shadow-sm"
          >
            <div className="flex items-center gap-2">
              <GripVertical className="size-4 text-muted-foreground cursor-grab" />
              <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{we.exerciseName}</p>
                {editingExId !== we.id && (
                  <p className="text-xs text-muted-foreground">
                    {we.sets} sets &times;{" "}
                    {we.targetUnit === "s"
                      ? `${we.targetWeight ?? 0}s`
                      : `${we.targetReps} reps ${we.targetWeight == null ? "· " : "@ "}${formatTargetWeight(we.targetWeight)}`}
                    {we.unilateral && " · each side"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                {editingExId !== we.id && replacingExId !== we.id && (
                  <>
                    <Button variant="ghost" size="icon-xs" onClick={() => setReplacingExId(we.id!)}>
                      <ArrowLeftRight className="size-3" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => startEditExercise(we)}>
                      <Pencil className="size-3" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => moveUp(i)} disabled={i === 0}>
                      <ChevronUp className="size-3" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" onClick={() => moveDown(i)} disabled={i === exercises.length - 1}>
                      <ChevronDown className="size-3" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon-xs"
                      onClick={() => { if (confirm("Remove?")) removeExercise(we.id!); }}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {replacingExId === we.id && (
              <div className="mt-2 ml-11 space-y-2">
                <p className="text-xs text-muted-foreground">Replace with:</p>
                <ExerciseSelector
                  exercises={allExercises}
                  excludeIds={exercises.map((e) => e.exerciseId)}
                  onSelect={(ex) => handleReplace(we.id!, ex)}
                />
                <Button size="sm" variant="ghost" onClick={() => setReplacingExId(null)}>
                  Cancel
                </Button>
              </div>
            )}

            {editingExId === we.id && (
              <div className="mt-2 ml-11 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Sets</label>
                    <Input value={editSets} onChange={(e) => setEditSets(e.target.value)} type="number" />
                  </div>
                  {editUnit === "kg" && (
                    <div>
                      <label className="text-xs text-muted-foreground">Reps</label>
                      <Input value={editReps} onChange={(e) => setEditReps(e.target.value)} type="number" />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-muted-foreground">
                      {editUnit === "kg" ? "Weight (kg)" : "Time (s)"}
                    </label>
                    <Input value={editWeight} onChange={(e) => setEditWeight(e.target.value)} type="number" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Unit</label>
                    <select
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value as "kg" | "s")}
                      className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                    >
                      <option value="kg">Weight (kg)</option>
                      <option value="s">Time (s)</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEditExercise} className="flex-1">
                    <Check className="size-3" /> Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingExId(null)}>
                    <X className="size-3" /> Cancel
                  </Button>
                </div>
              </div>
            )}

            {editingExId !== we.id && replacingExId !== we.id && (
              <div className="mt-2 ml-11">
                <MuscleGroupCoverage ratings={we.focusAreas} compact />
              </div>
            )}
          </div>
        ))}
        {exercises.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No exercises added yet.
          </p>
        )}
      </div>
    </div>
  );
}
