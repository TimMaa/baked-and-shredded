/**
 * Export data from the old SQLite database to a JSON file compatible with
 * the new IndexedDB-based app's import format.
 *
 * Usage: node scripts/export-sqlite.mjs <path-to-workout.db>
 *
 * Requires: npm install sql.js (already in old deps)
 */

import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";

const dbPath = process.argv[2];
if (!dbPath) {
  console.error("Usage: node scripts/export-sqlite.mjs <path-to-workout.db>");
  process.exit(1);
}

if (!fs.existsSync(dbPath)) {
  console.error(`File not found: ${dbPath}`);
  process.exit(1);
}

const SQL = await initSqlJs();
const buffer = fs.readFileSync(dbPath);
const db = new SQL.Database(buffer);

function all(query) {
  const results = [];
  const stmt = db.prepare(query);
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

// Map exercises
const rawExercises = all("SELECT * FROM exercises ORDER BY id");
const exercises = rawExercises.map((e) => ({
  id: e.id,
  name: e.name,
  description: e.description || null,
  tip: e.tip || null,
  focusAreas: parseFocusAreas(e.focus_areas),
  createdAt: e.created_at || new Date().toISOString(),
}));

function parseFocusAreas(raw) {
  const ALL_GROUPS = [
    "Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms",
    "Abs", "Lower_Back", "Glutes", "Quads", "Hamstrings", "Calves", "Adductors_Abductors",
  ];
  const defaults = Object.fromEntries(ALL_GROUPS.map((g) => [g, 0]));
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const g of parsed) if (g in defaults) defaults[g] = 1;
      return defaults;
    }
    for (const g of ALL_GROUPS) {
      const v = Number(parsed[g]);
      if (Number.isInteger(v) && v >= 0 && v <= 5) defaults[g] = v;
    }
    return defaults;
  } catch {
    return defaults;
  }
}

// Map workouts
const rawWorkouts = all("SELECT * FROM workouts ORDER BY id");
const workouts = rawWorkouts.map((w) => ({
  id: w.id,
  name: w.name,
  description: w.description || null,
  createdAt: w.created_at || new Date().toISOString(),
}));

// Map workout exercises
const rawWE = all("SELECT * FROM workout_exercises ORDER BY id");
const workoutExercises = rawWE.map((we) => ({
  id: we.id,
  workoutId: we.workout_id,
  exerciseId: we.exercise_id,
  sets: we.sets,
  targetReps: we.target_reps,
  targetWeight: we.target_weight || null,
  targetUnit: we.target_unit || "kg",
  orderIndex: we.order_index || 0,
  createdAt: we.created_at || new Date().toISOString(),
}));

// Map sessions
const rawSessions = all("SELECT * FROM workout_sessions ORDER BY id");
const sessions = rawSessions.map((s) => ({
  id: s.id,
  workoutId: s.workout_id,
  totalSetsPlanned: s.total_sets_planned || 0,
  setsCompleted: s.sets_completed || 0,
  startedAt: s.started_at || new Date().toISOString(),
  completedAt: s.completed_at || null,
}));

// Map session sets
const rawSets = all("SELECT * FROM session_sets ORDER BY id");
const sessionSets = rawSets.map((ss) => ({
  id: ss.id,
  sessionId: ss.session_id,
  workoutExerciseId: ss.workout_exercise_id,
  exerciseId: ss.exercise_id,
  setNumber: ss.set_number,
  targetReps: ss.target_reps,
  targetWeight: ss.target_weight || null,
  targetUnit: ss.target_unit || "kg",
  actualReps: ss.actual_reps,
  actualWeight: ss.actual_weight || null,
  status: ss.status,
  completedAt: ss.completed_at || new Date().toISOString(),
}));

const output = {
  version: 1,
  exportedAt: new Date().toISOString(),
  data: { exercises, workouts, workoutExercises, sessions, sessionSets },
};

const outPath = path.join(path.dirname(dbPath), "baked-and-shredded-export.json");
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

console.log(`Exported to: ${outPath}`);
console.log(`  ${exercises.length} exercises`);
console.log(`  ${workouts.length} workouts`);
console.log(`  ${workoutExercises.length} workout exercises`);
console.log(`  ${sessions.length} sessions`);
console.log(`  ${sessionSets.length} session sets`);
