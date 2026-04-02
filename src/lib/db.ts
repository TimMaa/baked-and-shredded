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

  // Workouts table
  db.run(`
    CREATE TABLE IF NOT EXISTS workouts (
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
    db.run('ALTER TABLE workouts ADD COLUMN tip TEXT');
  } catch {
    // Column already exists.
  }

  // Training Plans table (single workout session)
  db.run(`
    CREATE TABLE IF NOT EXISTS training_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Plan Exercises table (exercises in a training plan)
  db.run(`
    CREATE TABLE IF NOT EXISTS plan_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      workout_id INTEGER NOT NULL,
      sets INTEGER NOT NULL DEFAULT 1,
      target_reps INTEGER NOT NULL,
      target_weight REAL,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE CASCADE,
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
    )
  `);

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

// Helper functions for workouts
function parseWorkoutData(workout: any) {
  if (workout && workout.focus_areas) {
    try {
      const parsedFocusAreas = JSON.parse(workout.focus_areas);

      // Backward compatibility for old array-based focus areas.
      if (Array.isArray(parsedFocusAreas)) {
        const baseRatings = createDefaultMuscleRatings();
        for (const group of parsedFocusAreas) {
          if (typeof group === 'string' && group in baseRatings) {
            baseRatings[group] = 1;
          }
        }
        workout.focus_areas = baseRatings;
      } else {
        workout.focus_areas = normalizeMuscleRatings(parsedFocusAreas);
      }
    } catch (e) {
      workout.focus_areas = createDefaultMuscleRatings();
    }
  } else if (workout) {
    workout.focus_areas = createDefaultMuscleRatings();
  }

  if (workout && typeof workout.tip !== 'string') {
    workout.tip = '';
  }

  return workout;
}

export async function createWorkout(
  name: string,
  description?: string,
  tip?: string,
  focusAreas?: MuscleRatings
) {
  await initDb();
  const focusAreasJson = focusAreas ? JSON.stringify(focusAreas) : null;
  dbRun('INSERT INTO workouts (name, description, tip, focus_areas) VALUES (?, ?, ?, ?)', [
    name,
    description || null,
    tip || null,
    focusAreasJson,
  ]);
}

export async function getAllWorkouts() {
  await initDb();
  const workouts = dbAll('SELECT * FROM workouts ORDER BY name');
  return workouts.map(parseWorkoutData);
}

export async function getWorkout(id: number) {
  await initDb();
  const workout = dbGet('SELECT * FROM workouts WHERE id = ?', [id]);
  return parseWorkoutData(workout);
}

export async function updateWorkout(
  id: number,
  name: string,
  description?: string,
  tip?: string,
  focusAreas?: MuscleRatings
) {
  await initDb();
  const focusAreasJson = focusAreas ? JSON.stringify(focusAreas) : null;
  dbRun('UPDATE workouts SET name = ?, description = ?, tip = ?, focus_areas = ? WHERE id = ?', [
    name,
    description || null,
    tip || null,
    focusAreasJson,
    id,
  ]);
}

export async function deleteWorkout(id: number) {
  await initDb();
  dbRun('DELETE FROM workouts WHERE id = ?', [id]);
}

// Helper functions for training plans
export async function createTrainingPlan(name: string, description?: string) {
  await initDb();
  dbRun('INSERT INTO training_plans (name, description) VALUES (?, ?)', [name, description || null]);
}

export async function getAllTrainingPlans() {
  await initDb();
  return dbAll('SELECT * FROM training_plans ORDER BY created_at DESC');
}

export async function getTrainingPlan(id: number) {
  await initDb();
  return dbGet('SELECT * FROM training_plans WHERE id = ?', [id]);
}

export async function getTrainingPlanWithExercises(id: number) {
  await initDb();
  const plan = await getTrainingPlan(id);
  if (!plan) return null;

  const exercises = dbAll(
    `SELECT
      pe.id,
      pe.workout_id,
      w.name as workout_name,
      w.focus_areas,
      pe.sets,
      pe.target_reps,
      pe.target_weight,
      pe.order_index
    FROM plan_exercises pe
    LEFT JOIN workouts w ON pe.workout_id = w.id
    WHERE pe.plan_id = ?
    ORDER BY pe.order_index ASC`,
    [id]
  );

  return {
    ...plan,
    exercises: exercises.map((ex: any) => ({
      ...ex,
      focus_areas: ex.focus_areas ? normalizeMuscleRatings(JSON.parse(ex.focus_areas)) : createDefaultMuscleRatings()
    }))
  };
}

export async function deleteTrainingPlan(id: number) {
  await initDb();
  dbRun('DELETE FROM training_plans WHERE id = ?', [id]);
}

export async function updateTrainingPlan(id: number, name: string, description?: string) {
  await initDb();
  dbRun('UPDATE training_plans SET name = ?, description = ? WHERE id = ?', [name, description || null, id]);
}

// Helper functions for plan exercises
export async function addPlanExercise(
  planId: number,
  workoutId: number,
  sets: number,
  targetReps: number,
  targetWeight?: number,
  orderIndex: number = 0
) {
  await initDb();
  dbRun(
    'INSERT INTO plan_exercises (plan_id, workout_id, sets, target_reps, target_weight, order_index) VALUES (?, ?, ?, ?, ?, ?)',
    [planId, workoutId, sets, targetReps, targetWeight || null, orderIndex]
  );
}

export async function updatePlanExercise(
  exerciseId: number,
  sets: number,
  targetReps: number,
  targetWeight?: number
) {
  await initDb();
  dbRun(
    'UPDATE plan_exercises SET sets = ?, target_reps = ?, target_weight = ? WHERE id = ?',
    [sets, targetReps, targetWeight || null, exerciseId]
  );
}

export async function deletePlanExercise(id: number) {
  await initDb();
  dbRun('DELETE FROM plan_exercises WHERE id = ?', [id]);
}

export async function reorderPlanExercises(planId: number, exerciseIds: number[]) {
  await initDb();
  exerciseIds.forEach((id, index) => {
    dbRun('UPDATE plan_exercises SET order_index = ? WHERE id = ?', [index, id]);
  });
}

// Helper functions for workout sessions
export async function createWorkoutSession(planId: number, sessionDate: string, dayOfWeek: string) {
  await initDb();
  dbRun('INSERT INTO workout_sessions (plan_id, session_date, day_of_week) VALUES (?, ?, ?)', [
    planId,
    sessionDate,
    dayOfWeek,
  ]);
}

export async function logSessionSet(
  sessionId: number,
  planWorkoutId: number,
  workoutId: number,
  completedReps?: number,
  completedWeight?: number
) {
  await initDb();
  dbRun(
    'INSERT INTO session_sets (session_id, plan_workout_id, workout_id, completed_reps, completed_weight) VALUES (?, ?, ?, ?, ?)',
    [sessionId, planWorkoutId, workoutId, completedReps || null, completedWeight || null]
  );
}

export async function getSessionSets(sessionId: number) {
  await initDb();
  return dbAll(
    `SELECT ss.*, w.name as workout_name, pw.target_reps, pw.target_weight
    FROM session_sets ss
    JOIN workouts w ON ss.workout_id = w.id
    LEFT JOIN plan_workouts pw ON ss.plan_workout_id = pw.id
    WHERE ss.session_id = ?
    ORDER BY w.name`,
    [sessionId]
  );
}
