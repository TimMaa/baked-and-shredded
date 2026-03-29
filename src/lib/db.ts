import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
      focus_areas TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Training Plans table
  db.run(`
    CREATE TABLE IF NOT EXISTS training_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Plan Days table (each day of the week)
  db.run(`
    CREATE TABLE IF NOT EXISTS plan_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      day_of_week TEXT NOT NULL,
      FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE CASCADE,
      UNIQUE(plan_id, day_of_week)
    )
  `);

  // Plan Workouts table (workouts assigned to a day)
  db.run(`
    CREATE TABLE IF NOT EXISTS plan_workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_day_id INTEGER NOT NULL,
      workout_id INTEGER NOT NULL,
      target_reps INTEGER NOT NULL,
      target_weight REAL,
      order_index INTEGER DEFAULT 0,
      FOREIGN KEY (plan_day_id) REFERENCES plan_days(id) ON DELETE CASCADE,
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
    )
  `);

  // Workout Sessions table (actual workout executions)
  db.run(`
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      session_date DATE NOT NULL,
      day_of_week TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE CASCADE
    )
  `);

  // Session Sets table (reps and weight logged during a session)
  db.run(`
    CREATE TABLE IF NOT EXISTS session_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      plan_workout_id INTEGER NOT NULL,
      workout_id INTEGER NOT NULL,
      completed_reps INTEGER,
      completed_weight REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_workout_id) REFERENCES plan_workouts(id),
      FOREIGN KEY (workout_id) REFERENCES workouts(id)
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
function parseFocusAreas(workout: any) {
  if (workout && workout.focus_areas) {
    try {
      workout.focus_areas = JSON.parse(workout.focus_areas);
    } catch (e) {
      workout.focus_areas = [];
    }
  } else if (workout) {
    workout.focus_areas = [];
  }
  return workout;
}

export async function createWorkout(name: string, description?: string, focusAreas?: string[]) {
  await initDb();
  const focusAreasJson = focusAreas ? JSON.stringify(focusAreas) : null;
  dbRun('INSERT INTO workouts (name, description, focus_areas) VALUES (?, ?, ?)', [name, description || null, focusAreasJson]);
}

export async function getAllWorkouts() {
  await initDb();
  const workouts = dbAll('SELECT * FROM workouts ORDER BY name');
  return workouts.map(parseFocusAreas);
}

export async function getWorkout(id: number) {
  await initDb();
  const workout = dbGet('SELECT * FROM workouts WHERE id = ?', [id]);
  return parseFocusAreas(workout);
}

export async function updateWorkout(id: number, name: string, description?: string, focusAreas?: string[]) {
  await initDb();
  const focusAreasJson = focusAreas ? JSON.stringify(focusAreas) : null;
  dbRun('UPDATE workouts SET name = ?, description = ?, focus_areas = ? WHERE id = ?', [name, description || null, focusAreasJson, id]);
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

export async function getTrainingPlanWithWorkouts(id: number) {
  await initDb();
  const plan = await getTrainingPlan(id);
  if (!plan) return null;

  const days = dbAll(
    `SELECT
      pd.id,
      pd.day_of_week,
      GROUP_CONCAT(json_object(
        'id', pw.id,
        'workoutId', pw.workout_id,
        'workoutName', w.name,
        'targetReps', pw.target_reps,
        'targetWeight', pw.target_weight,
        'orderIndex', pw.order_index
      )) as workouts
    FROM plan_days pd
    LEFT JOIN plan_workouts pw ON pd.id = pw.plan_day_id
    LEFT JOIN workouts w ON pw.workout_id = w.id
    WHERE pd.plan_id = ?
    GROUP BY pd.id, pd.day_of_week`,
    [id]
  );

  return { ...plan, days };
}

export async function deleteTrainingPlan(id: number) {
  await initDb();
  dbRun('DELETE FROM training_plans WHERE id = ?', [id]);
}

export async function updateTrainingPlan(id: number, name: string, description?: string) {
  await initDb();
  dbRun('UPDATE training_plans SET name = ?, description = ? WHERE id = ?', [name, description || null, id]);
}

// Helper functions for plan days
export async function addPlanDay(planId: number, dayOfWeek: string) {
  await initDb();
  dbRun('INSERT INTO plan_days (plan_id, day_of_week) VALUES (?, ?)', [planId, dayOfWeek]);
}

// Helper functions for plan workouts
export async function addPlanWorkout(
  planDayId: number,
  workoutId: number,
  targetReps: number,
  targetWeight?: number,
  orderIndex: number = 0
) {
  await initDb();
  dbRun(
    'INSERT INTO plan_workouts (plan_day_id, workout_id, target_reps, target_weight, order_index) VALUES (?, ?, ?, ?, ?)',
    [planDayId, workoutId, targetReps, targetWeight || null, orderIndex]
  );
}

export async function deletePlanWorkout(id: number) {
  await initDb();
  dbRun('DELETE FROM plan_workouts WHERE id = ?', [id]);
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
