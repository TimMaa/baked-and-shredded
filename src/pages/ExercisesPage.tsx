import { useState, useRef } from "react";
import { useExercises } from "@/hooks/useExercises";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MuscleGroupSelector } from "@/components/workouts/MuscleGroupSelector";
import { MuscleGroupCoverage } from "@/components/workouts/MuscleGroupCoverage";
import { createDefaultMuscleRatings } from "@/lib/muscleGroups";
import type { Exercise, MuscleRatings } from "@/types";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";

export function ExercisesPage() {
  const { exercises, loading, create, update, remove } = useExercises();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tip, setTip] = useState("");
  const [muscleRatings, setMuscleRatings] = useState<MuscleRatings>(createDefaultMuscleRatings());
  const fileRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setName("");
    setDescription("");
    setTip("");
    setMuscleRatings(createDefaultMuscleRatings());
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (editingId) {
      const existing = exercises.find((e) => e.id === editingId);
      if (existing) {
        await update({
          ...existing,
          name: name.trim(),
          description: description.trim() || null,
          tip: tip.trim() || null,
          focusAreas: muscleRatings,
        });
      }
    } else {
      await create({
        name: name.trim(),
        description: description.trim() || null,
        tip: tip.trim() || null,
        focusAreas: muscleRatings,
      });
    }
    resetForm();
  };

  const startEdit = (ex: Exercise) => {
    setEditingId(ex.id!);
    setName(ex.name);
    setDescription(ex.description || "");
    setTip(ex.tip || "");
    setMuscleRatings(ex.focusAreas);
    setShowForm(true);
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    const header = lines[0].toLowerCase();
    const hasHeader = header.includes("name");
    const dataLines = hasHeader ? lines.slice(1) : lines;

    for (const line of dataLines) {
      const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
      if (parts[0]) {
        await create({
          name: parts[0],
          description: parts[1] || null,
          tip: parts[2] || null,
          focusAreas: createDefaultMuscleRatings(),
        });
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Exercises</h1>
          <p className="text-sm text-muted-foreground">{exercises.length} exercises</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      <Card size="sm">
        <CardContent className="flex items-center gap-2 pt-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleCsvImport}
            className="flex-1 text-sm file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-xs file:font-medium file:text-primary"
          />
          <Upload className="size-4 text-muted-foreground" />
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Exercise" : "New Exercise"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
            />
            <textarea
              placeholder="Tip (optional)"
              value={tip}
              onChange={(e) => setTip(e.target.value)}
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
            />
            <MuscleGroupSelector value={muscleRatings} onChange={setMuscleRatings} />
            <div className="flex gap-2">
              <Button onClick={handleSubmit} className="flex-1">
                {editingId ? "Update" : "Save"}
              </Button>
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {exercises.map((ex) => (
          <Card key={ex.id} size="sm">
            <CardContent className="space-y-2 pt-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{ex.name}</h3>
                  {ex.description && (
                    <p className="text-xs text-muted-foreground">{ex.description}</p>
                  )}
                  {ex.tip && (
                    <p className="text-xs italic text-muted-foreground">Tip: {ex.tip}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-xs" onClick={() => startEdit(ex)}>
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon-xs"
                    onClick={() => { if (confirm("Delete this exercise?")) remove(ex.id!); }}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
              <MuscleGroupCoverage ratings={ex.focusAreas} compact />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
