import { useState, useRef } from "react";
import { useExercises } from "@/hooks/useExercises";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MuscleGroupSelector } from "@/components/workouts/MuscleGroupSelector";
import { MuscleGroupCoverage } from "@/components/workouts/MuscleGroupCoverage";
import { createDefaultMuscleRatings } from "@/lib/muscleGroups";
import * as gemini from "@/lib/gemini";
import type { Exercise, MuscleRatings } from "@/types";
import { Plus, Pencil, Trash2, Upload, Sparkles, RefreshCw, ListPlus, ChevronDown, Loader2 } from "lucide-react";

export function ExercisesPage() {
  const { exercises, loading, create, update, remove } = useExercises();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tip, setTip] = useState("");
  const [muscleRatings, setMuscleRatings] = useState<MuscleRatings>(createDefaultMuscleRatings());
  const [classifying, setClassifying] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalyzeProgress, setReanalyzeProgress] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showBatchAdd, setShowBatchAdd] = useState(false);
  const [batchText, setBatchText] = useState("");
  const [batchProgress, setBatchProgress] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleQuickAdd = async () => {
    if (!name.trim()) return;
    setClassifying(true);

    let desc: string | null = null;
    let exTip: string | null = null;
    let focusAreas = createDefaultMuscleRatings();

    if (gemini.isConfigured()) {
      try {
        const result = await gemini.classifyExercise(name.trim());
        desc = result.description;
        exTip = result.tip;
        focusAreas = result.focusAreas;
      } catch {
        // proceed without AI
      }
    }

    await create({
      name: name.trim(),
      description: desc,
      tip: exTip,
      focusAreas,
      equipment: null,
    });

    setName("");
    setClassifying(false);
  };

  const handleBatchAdd = async () => {
    const names = batchText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (names.length === 0) return;

    setClassifying(true);
    const BATCH_SIZE = 5;

    for (let i = 0; i < names.length; i += BATCH_SIZE) {
      const batch = names.slice(i, i + BATCH_SIZE);
      setBatchProgress(`Adding ${i + 1}–${Math.min(i + BATCH_SIZE, names.length)} of ${names.length}...`);

      if (gemini.isConfigured()) {
        try {
          const result = await gemini.reanalyzeExercises(
            batch.map((n, idx) => ({ id: -(i + idx), name: n }))
          );
          for (const analyzed of result.exercises) {
            await create({
              name: analyzed.name,
              description: analyzed.description || null,
              tip: analyzed.tip || null,
              focusAreas: analyzed.focusAreas,
              equipment: null,
            });
          }
          continue;
        } catch {
          // fall through to manual create
        }
      }

      for (const n of batch) {
        await create({
          name: n,
          description: null,
          tip: null,
          focusAreas: createDefaultMuscleRatings(),
          equipment: null,
        });
      }
    }

    setBatchText("");
    setBatchProgress("");
    setShowBatchAdd(false);
    setClassifying(false);
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setTip("");
    setMuscleRatings(createDefaultMuscleRatings());
    setEditingId(null);
    setShowAdvanced(false);
  };

  const handleEditSubmit = async () => {
    if (!name.trim() || !editingId) return;
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
    resetForm();
  };

  const startEdit = (ex: Exercise) => {
    setEditingId(ex.id!);
    setName(ex.name);
    setDescription(ex.description || "");
    setTip(ex.tip || "");
    setMuscleRatings(ex.focusAreas);
    setShowAdvanced(true);
  };

  const handleAiFill = async () => {
    if (!name.trim() || !gemini.isConfigured()) return;
    setClassifying(true);
    try {
      const result = await gemini.classifyExercise(name.trim());
      setDescription(result.description);
      setTip(result.tip);
      setMuscleRatings(result.focusAreas);
    } catch {
      // silently fail
    }
    setClassifying(false);
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
          equipment: null,
        });
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleReanalyzeAll = async () => {
    if (exercises.length === 0 || !gemini.isConfigured()) return;
    setReanalyzing(true);
    setReanalyzeProgress(`Analyzing ${exercises.length} exercises...`);
    try {
      const BATCH_SIZE = 10;
      for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
        const batch = exercises.slice(i, i + BATCH_SIZE);
        setReanalyzeProgress(`Analyzing ${i + 1}–${Math.min(i + BATCH_SIZE, exercises.length)} of ${exercises.length}...`);
        const result = await gemini.reanalyzeExercises(batch.map((e) => ({ id: e.id!, name: e.name })));
        for (const analyzed of result.exercises) {
          const match = batch.find((e) => e.name === analyzed.name);
          if (match) {
            await update({
              ...match,
              description: analyzed.description || match.description,
              tip: analyzed.tip || match.tip,
              focusAreas: analyzed.focusAreas,
            });
          }
        }
      }
      setReanalyzeProgress("");
    } catch {
      setReanalyzeProgress("Analysis failed");
      setTimeout(() => setReanalyzeProgress(""), 3000);
    }
    setReanalyzing(false);
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{exercises.length} exercises</p>
        <Button variant="outline" size="sm" onClick={() => setShowBatchAdd(!showBatchAdd)}>
          <ListPlus className="size-3.5" />
          Batch Add
        </Button>
      </div>

      {/* Quick add — name-first, AI auto-classifies */}
      {!editingId && (
        <div className="flex gap-2">
          <Input
            placeholder="Exercise name — add & auto-classify"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd(); }}
            className="flex-1"
          />
          <Button onClick={handleQuickAdd} disabled={!name.trim() || classifying} size="sm">
            {classifying ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Add
          </Button>
        </div>
      )}

      {/* Batch add */}
      {showBatchAdd && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-1.5">
              <ListPlus className="size-3.5" /> Quick Add Multiple
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              placeholder={"One exercise per line, e.g.:\nBench Press\nBarbell Row\nLateral Raise"}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              rows={4}
            />
            {batchProgress && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" /> {batchProgress}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleBatchAdd}
                disabled={!batchText.trim() || classifying}
                className="flex-1"
                size="sm"
              >
                <Sparkles className="size-3.5" />
                {classifying ? "Adding..." : "Add & Classify All"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowBatchAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit form */}
      {editingId && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Exercise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
              {gemini.isConfigured() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAiFill}
                  disabled={!name.trim() || classifying}
                  className="shrink-0"
                >
                  <Sparkles className="size-3.5" />
                  {classifying ? "..." : "AI Fill"}
                </Button>
              )}
            </div>
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
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <ChevronDown className={`size-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
              Muscle Groups
            </button>
            {showAdvanced && <MuscleGroupSelector value={muscleRatings} onChange={setMuscleRatings} />}
            <div className="flex gap-2">
              <Button onClick={handleEditSubmit} className="flex-1">Update</Button>
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions row */}
      <div className="flex gap-2 overflow-hidden">
        <label className="flex-1 min-w-0">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleCsvImport}
            className="w-full text-sm file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-xs file:font-medium file:text-primary"
          />
        </label>
        <Upload className="size-4 text-muted-foreground shrink-0 self-center" />
      </div>

      {gemini.isConfigured() && exercises.length > 0 && (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleReanalyzeAll}
          disabled={reanalyzing}
          size="sm"
        >
          <RefreshCw className={`size-3.5 ${reanalyzing ? "animate-spin" : ""}`} />
          {reanalyzeProgress || "AI Reanalyze All"}
        </Button>
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
                <div className="flex gap-3">
                  <Button variant="ghost" size="icon" className="min-w-11 min-h-11" onClick={() => startEdit(ex)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="min-w-11 min-h-11"
                    onClick={() => { if (confirm("Delete this exercise?")) remove(ex.id!); }}
                  >
                    <Trash2 className="size-4" />
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
