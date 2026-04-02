import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createDefaultMuscleRatings,
  normalizeMuscleRatings,
  type MuscleRatings,
} from '$lib/muscleGroups';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../data');
const dbPath = path.join(dataDir, 'workout.db');

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

async function initDb() {
  if (!SQL) {
    SQL = await initSqlJs();
  }

  if (!db) {
    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Load existing database or create new one
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    initializeSchema();
  }

  return db;
}

function saveDb() {
  if (db && fs.existsSync(dataDir)) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export async function getDb() {
  return await initDb();
}

function initializeSchema() {
  if (!db) return;

  // Exercises table
  db.run(`
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      tip TEXT,
      focus_areas TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Backfill tip column for existing databases.
  try {
    db.run('ALTER TABLE exercises ADD COLUMN tip TEXT');
  } catch {
    // Column already exists.
  }

  // Workouts table (planned combination of exercises)
  db.run(`
    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Workout Exercises table (exercises in a workout)
  db.run(`
    CREATE TABLE IF NOT EXISTS workout_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      sets INTEGER NOT NULL DEFAULT 1,
      target_reps INTEGER NOT NULL,
      target_weight REAL,
      target_unit TEXT NOT NULL DEFAULT 'kg',
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
    )
  `);

  // Backfill target_unit for existing databases.
  try {
    db.run("ALTER TABLE workout_exercises ADD COLUMN target_unit TEXT NOT NULL DEFAULT 'kg'");
  } catch {
    // Column already exists.
  }

  saveDb();
}

function dbGet(query: string, params: any[] = []) {
  if (!db) throw new Error('Database not initialized');
  try {
    const stmt = db.prepare(query);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  } catch (error) {
    console.error('DB Error:', error, query, params);
    throw error;
  }
}

function dbAll(query: string, params: any[] = []) {
  if (!db) throw new Error('Database not initialized');
  try {
    const results: any[] = [];
    const stmt = db.prepare(query);
    stmt.bind(params);
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (error) {
    console.error('DB Error:', error, query, params);
    throw error;
  }
}

function dbRun(query: string, params: any[] = []) {
  if (!db) throw new Error('Database not initialized');
  try {
    db.run(query, params);
    saveDb();
  } catch (error) {
    console.error('DB Error:', error, query, params);
    throw error;
  }
}

// Helper functions for exercises
function parseExerciseData(exercise: any) {
  if (exercise && exercise.focus_areas) {
    try {
      const parsedFocusAreas = JSON.parse(exercise.focus_areas);

      // Backward compatibility for old array-based focus areas.
      if (Array.isArray(parsedFocusAreas)) {
        const baseRatings = createDefaultMuscleRatings();
        for (const group of parsedFocusAreas) {
          if (typeof group === 'string' && group in baseRatings) {
            baseRatings[group] = 1;
          }
        }
        exercise.focus_areas = baseRatings;
      } else {
        exercise.focus_areas = normalizeMuscleRatings(parsedFocusAreas);
      }
    } catch (e) {
      exercise.focus_areas = createDefaultMuscleRatings();
    }
  } else if (exercise) {
    exercise.focus_areas = createDefaultMuscleRatings();
  }

  if (exercise && typeof exercise.tip !== 'string') {
    exercise.tip = '';
  }

  return exercise;
}

export async function createExercise(
  name: string,
  description?: string,
  tip?: string,
  focusAreas?: MuscleRatings
) {
  await initDb();
  const focusAreasJson = focusAreas ? JSON.stringify(focusAreas) : null;
  dbRun('INSERT INTO exercises (name, description, tip, focus_areas) VALUES (?, ?, ?, ?)', [
    name,
    description || null,
    tip || null,
    focusAreasJson,
  ]);
}

export async function getAllExercises() {
  await initDb();
  const exercises = dbAll('SELECT * FROM exercises ORDER BY name');
  return exercises.map(parseExerciseData);
}

export async function getExercise(id: number) {
  await initDb();
  const exercise = dbGet('SELECT * FROM exercises WHERE id = ?', [id]);
  return parseExerciseData(exercise);
}

export async function updateExercise(
  id: number,
  name: string,
  description?: string,
  tip?: string,
  focusAreas?: MuscleRatings
) {
  await initDb();
  const focusAreasJson = focusAreas ? JSON.stringify(focusAreas) : null;
  dbRun('UPDATE exercises SET name = ?, description = ?, tip = ?, focus_areas = ? WHERE id = ?', [
    name,
    description || null,
    tip || null,
    focusAreasJson,
    id,
  ]);
}

export async function deleteExercise(id: number) {
  await initDb();
  dbRun('DELETE FROM exercises WHERE id = ?', [id]);
}

// Helper functions for workouts
export async function createWorkout(name: string, description?: string) {
  await initDb();
  dbRun('INSERT INTO workouts (name, description) VALUES (?, ?)', [name, description || null]);
}

export async function getAllWorkouts() {
  await initDb();
  return dbAll('SELECT * FROM workouts ORDER BY created_at DESC');
}

export async function getWorkout(id: number) {
  await initDb();
  return dbGet('SELECT * FROM workouts WHERE id = ?', [id]);
}

export async function getWorkoutWithExercises(id: number) {
  await initDb();
  const workout = await getWorkout(id);
  if (!workout) return null;

  const exercises = dbAll(
    `SELECT
      we.id,
      we.exercise_id,
      e.name as exercise_name,
      e.focus_areas,
      we.sets,
      we.target_reps,
      we.target_weight,
      we.target_unit,
      we.order_index
    FROM workout_exercises we
    LEFT JOIN exercises e ON we.exercise_id = e.id
    WHERE we.workout_id = ?
    ORDER BY we.order_index ASC, we.id ASC`,
    [id]
  );

  return {
    ...workout,
    exercises: exercises.map((ex: any) => ({
      ...ex,
      focus_areas: ex.focus_areas ? normalizeMuscleRatings(JSON.parse(ex.focus_areas)) : createDefaultMuscleRatings()
    }))
  };
}

export async function deleteWorkout(id: number) {
  await initDb();
  dbRun('DELETE FROM workouts WHERE id = ?', [id]);
}

export async function updateWorkout(id: number, name: string, description?: string) {
  await initDb();
  dbRun('UPDATE workouts SET name = ?, description = ? WHERE id = ?', [name, description || null, id]);
}

// Helper functions for workout exercises
export async function addWorkoutExercise(
  workoutId: number,
  exerciseId: number,
  sets: number,
  targetReps: number,
  targetWeight: number,
  targetUnit: 'kg' | 's' = 'kg'
) {
  await initDb();
  const row = dbGet('SELECT COALESCE(MAX(order_index), -1) as max_order FROM workout_exercises WHERE workout_id = ?', [
    workoutId,
  ]) as { max_order?: number } | null;
  const nextOrderIndex = Number((row?.max_order ?? -1)) + 1;

  dbRun(
    'INSERT INTO workout_exercises (workout_id, exercise_id, sets, target_reps, target_weight, target_unit, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [workoutId, exerciseId, sets, targetReps, targetWeight, targetUnit, nextOrderIndex]
  );
}

export async function updateWorkoutExercise(
  exerciseId: number,
  sets: number,
  targetReps: number,
  targetWeight: number,
  targetUnit: 'kg' | 's' = 'kg'
) {
  await initDb();
  dbRun(
    'UPDATE workout_exercises SET sets = ?, target_reps = ?, target_weight = ?, target_unit = ? WHERE id = ?',
    [sets, targetReps, targetWeight, targetUnit, exerciseId]
  );
}

export async function deleteWorkoutExercise(id: number) {
  await initDb();
  dbRun('DELETE FROM workout_exercises WHERE id = ?', [id]);
}

export async function reorderWorkoutExercises(workoutId: number, exerciseIds: number[]) {
  await initDb();
  exerciseIds.forEach((id, index) => {
    dbRun('UPDATE workout_exercises SET order_index = ? WHERE id = ? AND workout_id = ?', [index, id, workoutId]);
  });
}

// Helper functions for workout sessions
export async function createWorkoutSession(workoutId: number, sessionDate: string, dayOfWeek: string) {
  await initDb();
  dbRun('INSERT INTO workout_sessions (workout_id, session_date, day_of_week) VALUES (?, ?, ?)', [
    workoutId,
    sessionDate,
    dayOfWeek,
  ]);
}

export async function logSessionSet(
  sessionId: number,
  workoutExerciseId: number,
  exerciseId: number,
  completedReps?: number,
  completedWeight?: number
) {
  await initDb();
  dbRun(
    'INSERT INTO session_sets (session_id, workout_exercise_id, exercise_id, completed_reps, completed_weight) VALUES (?, ?, ?, ?, ?)',
    [sessionId, workoutExerciseId, exerciseId, completedReps || null, completedWeight || null]
  );
}

export async function getSessionSets(sessionId: number) {
  await initDb();
  return dbAll(
    `SELECT ss.*, e.name as exercise_name, we.target_reps, we.target_weight, we.target_unit
    FROM session_sets ss
    JOIN exercises e ON ss.exercise_id = e.id
    LEFT JOIN workout_exercises we ON ss.workout_exercise_id = we.id
    WHERE ss.session_id = ?
    ORDER BY e.name`,
    [sessionId]
  );
}
