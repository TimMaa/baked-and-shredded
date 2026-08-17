import { getDb } from "@/lib/db";
import type { Exercise, Workout, WorkoutExercise, Session, SessionSet } from "@/types";

interface ExportData {
  version: 1;
  exportedAt: string;
  data: {
    exercises: Exercise[];
    workouts: Workout[];
    workoutExercises: WorkoutExercise[];
    sessions: Session[];
    sessionSets: SessionSet[];
  };
}

export async function exportAllData(): Promise<void> {
  const db = await getDb();
  const payload: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      exercises: await db.getAll("exercises"),
      workouts: await db.getAll("workouts"),
      workoutExercises: await db.getAll("workoutExercises"),
      sessions: await db.getAll("sessions"),
      sessionSets: await db.getAll("sessionSets"),
    },
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `baked-and-shredded-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importData(file: File): Promise<{ success: boolean; message: string }> {
  try {
    const text = await file.text();
    const payload: ExportData = JSON.parse(text);

    if (!payload.version || !payload.data) {
      return { success: false, message: "Invalid export file format" };
    }

    const db = await getDb();
    const tx = db.transaction(
      ["exercises", "workouts", "workoutExercises", "sessions", "sessionSets"],
      "readwrite"
    );

    // Clear all stores
    await tx.objectStore("sessionSets").clear();
    await tx.objectStore("sessions").clear();
    await tx.objectStore("workoutExercises").clear();
    await tx.objectStore("workouts").clear();
    await tx.objectStore("exercises").clear();

    // Import in order (respecting references)
    for (const item of payload.data.exercises) {
      await tx.objectStore("exercises").put(item);
    }
    for (const item of payload.data.workouts) {
      await tx.objectStore("workouts").put(item);
    }
    for (const item of payload.data.workoutExercises) {
      await tx.objectStore("workoutExercises").put(item);
    }
    for (const item of payload.data.sessions) {
      await tx.objectStore("sessions").put(item);
    }
    for (const item of payload.data.sessionSets) {
      await tx.objectStore("sessionSets").put(item);
    }

    await tx.done;

    const counts = [
      payload.data.exercises.length,
      payload.data.workouts.length,
      payload.data.workoutExercises.length,
      payload.data.sessions.length,
      payload.data.sessionSets.length,
    ];
    return {
      success: true,
      message: `Imported ${counts[0]} exercises, ${counts[1]} workouts, ${counts[3]} sessions`,
    };
  } catch (e) {
    return { success: false, message: `Import failed: ${e instanceof Error ? e.message : "Unknown error"}` };
  }
}
