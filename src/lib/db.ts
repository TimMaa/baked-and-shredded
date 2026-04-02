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

  // Workout Sessions table (one entry per execution run)
  db.run(`
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL,
      execution_style TEXT NOT NULL DEFAULT 'staggered',
      total_sets_planned INTEGER NOT NULL DEFAULT 0,
      started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      sets_completed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
    )
  `);

  // Backfill columns for existing databases.
  try {
    db.run("ALTER TABLE workout_sessions ADD COLUMN execution_style TEXT NOT NULL DEFAULT 'staggered'");
  } catch {
    // Column already exists.
  }

  try {
    db.run('ALTER TABLE workout_sessions ADD COLUMN total_sets_planned INTEGER NOT NULL DEFAULT 0');
  } catch {
    // Column already exists.
  }

  try {
    db.run('ALTER TABLE workout_sessions ADD COLUMN started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
  } catch {
    // Column already exists.
  }

  try {
    db.run('ALTER TABLE workout_sessions ADD COLUMN completed_at DATETIME');
  } catch {
    // Column already exists.
  }

  try {
    db.run('ALTER TABLE workout_sessions ADD COLUMN sets_completed INTEGER NOT NULL DEFAULT 0');
  } catch {
    // Column already exists.
  }

  // Session Sets table (one entry per completed set)
  db.run(`
    CREATE TABLE IF NOT EXISTS session_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      workout_exercise_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      set_number INTEGER NOT NULL,
      target_reps INTEGER NOT NULL,
      target_weight REAL,
      target_unit TEXT NOT NULL DEFAULT 'kg',
      actual_reps INTEGER NOT NULL,
      actual_weight REAL,
      status TEXT NOT NULL CHECK (status IN ('expected', 'deviation')),
      completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
    )
  `);

  // Helpful indexes for success/history queries.
  db.run('CREATE INDEX IF NOT EXISTS idx_workout_sessions_workout_id ON workout_sessions(workout_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_session_sets_session_id ON session_sets(session_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_session_sets_status ON session_sets(status)');

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
  const normalizedTargetUnit: 'kg' | 's' = targetUnit === 's' ? 's' : 'kg';
  const normalizedTargetReps = normalizedTargetUnit === 's' ? 1 : targetReps;
  const normalizedTargetWeight = targetWeight;

  const row = dbGet('SELECT COALESCE(MAX(order_index), -1) as max_order FROM workout_exercises WHERE workout_id = ?', [
    workoutId,
  ]) as { max_order?: number } | null;
  const nextOrderIndex = Number((row?.max_order ?? -1)) + 1;

  dbRun(
    'INSERT INTO workout_exercises (workout_id, exercise_id, sets, target_reps, target_weight, target_unit, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      workoutId,
      exerciseId,
      sets,
      normalizedTargetReps,
      normalizedTargetWeight,
      normalizedTargetUnit,
      nextOrderIndex,
    ]
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
  const normalizedTargetUnit: 'kg' | 's' = targetUnit === 's' ? 's' : 'kg';
  const normalizedTargetReps = normalizedTargetUnit === 's' ? 1 : targetReps;

  dbRun(
    'UPDATE workout_exercises SET sets = ?, target_reps = ?, target_weight = ?, target_unit = ? WHERE id = ?',
    [sets, normalizedTargetReps, targetWeight, normalizedTargetUnit, exerciseId]
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
export type SessionSetStatus = 'expected' | 'deviation';

export type SessionSetLogInput = {
  sessionId: number;
  workoutExerciseId: number;
  exerciseId: number;
  setNumber: number;
  targetReps: number;
  targetWeight: number | null;
  targetUnit: 'kg' | 's';
  actualReps: number;
  actualWeight: number | null;
  status: SessionSetStatus;
};

export type WorkoutSuccessSummary = {
  session_id: number;
  workout_id: number;
  workout_name: string;
  execution_style: string;
  started_at: string;
  completed_at: string | null;
  total_sets_planned: number;
  sets_completed: number;
  expected_sets: number;
  deviation_sets: number;
  completion_rate_pct: number;
  adherence_rate_pct: number;
};

export type WorkoutHistorySession = WorkoutSuccessSummary & {
  duration_seconds: number;
};

export type WorkoutAggregateAnalytics = {
  workout_id: number;
  workout_name: string;
  sessions_count: number;
  total_sets_logged: number;
  avg_completion_rate_pct: number;
  avg_adherence_rate_pct: number;
  best_adherence_rate_pct: number;
  last_completed_at: string | null;
};

export type ExerciseDeviationAnalytics = {
  exercise_id: number;
  exercise_name: string;
  total_sets_logged: number;
  expected_sets: number;
  deviation_sets: number;
  deviation_rate_pct: number;
  avg_weight_delta: number | null;
  avg_time_delta_seconds: number | null;
};

export async function createWorkoutSession(
  workoutId: number,
  executionStyle: 'byExercise' | 'staggered',
  totalSetsPlanned: number
) {
  await initDb();
  dbRun(
    'INSERT INTO workout_sessions (workout_id, execution_style, total_sets_planned, started_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
    [workoutId, executionStyle, totalSetsPlanned]
  );
  const row = dbGet('SELECT id FROM workout_sessions ORDER BY id DESC LIMIT 1') as
    | { id?: number | string | bigint }
    | null;
  const sessionId = Number(row?.id);

  if (!Number.isFinite(sessionId) || sessionId <= 0) {
    throw new Error('Failed to resolve newly created workout session id.');
  }

  return sessionId;
}

export async function completeWorkoutSession(sessionId: number, setsCompleted: number) {
  await initDb();
  dbRun(
    'UPDATE workout_sessions SET completed_at = CURRENT_TIMESTAMP, sets_completed = ? WHERE id = ?',
    [setsCompleted, sessionId]
  );
}

export async function logSessionSet(input: SessionSetLogInput) {
  await initDb();
  dbRun(
    `INSERT INTO session_sets (
      session_id,
      workout_exercise_id,
      exercise_id,
      set_number,
      target_reps,
      target_weight,
      target_unit,
      actual_reps,
      actual_weight,
      status,
      completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      input.sessionId,
      input.workoutExerciseId,
      input.exerciseId,
      input.setNumber,
      input.targetReps,
      input.targetWeight,
      input.targetUnit,
      input.actualReps,
      input.actualWeight,
      input.status,
    ]
  );
}

export async function getSessionSets(sessionId: number) {
  await initDb();
  return dbAll(
    `SELECT
      ss.*, e.name as exercise_name
    FROM session_sets ss
    JOIN exercises e ON ss.exercise_id = e.id
    WHERE ss.session_id = ?
    ORDER BY ss.id ASC`,
    [sessionId]
  );
}

export async function getWorkoutSuccessSummary(limit = 20): Promise<WorkoutSuccessSummary[]> {
  await initDb();
  return dbAll(
    `SELECT
      ws.id as session_id,
      ws.workout_id,
      w.name as workout_name,
      ws.execution_style,
      ws.started_at,
      ws.completed_at,
      ws.total_sets_planned,
      ws.sets_completed,
      COALESCE(SUM(CASE WHEN ss.status = 'expected' THEN 1 ELSE 0 END), 0) as expected_sets,
      COALESCE(SUM(CASE WHEN ss.status = 'deviation' THEN 1 ELSE 0 END), 0) as deviation_sets,
      CASE
        WHEN ws.total_sets_planned > 0
          THEN ROUND((ws.sets_completed * 100.0) / ws.total_sets_planned, 1)
        ELSE 0
      END as completion_rate_pct,
      CASE
        WHEN ws.sets_completed > 0
          THEN ROUND((COALESCE(SUM(CASE WHEN ss.status = 'expected' THEN 1 ELSE 0 END), 0) * 100.0) / ws.sets_completed, 1)
        ELSE 0
      END as adherence_rate_pct
    FROM workout_sessions ws
    JOIN workouts w ON w.id = ws.workout_id
    LEFT JOIN session_sets ss ON ss.session_id = ws.id
    GROUP BY ws.id
    ORDER BY ws.id DESC
    LIMIT ?`,
    [limit]
  ) as WorkoutSuccessSummary[];
}

export async function getWorkoutSessionHistory(
  limit = 100,
  days: number | null = null
): Promise<WorkoutHistorySession[]> {
  await initDb();
  const whereClause =
    Number.isInteger(days) && Number(days) > 0 ? 'WHERE ws.started_at >= datetime(\'now\', ?)' : '';
  const whereParams = Number.isInteger(days) && Number(days) > 0 ? [`-${Number(days)} days`] : [];

  return dbAll(
    `SELECT
      ws.id as session_id,
      ws.workout_id,
      w.name as workout_name,
      ws.execution_style,
      ws.started_at,
      ws.completed_at,
      ws.total_sets_planned,
      ws.sets_completed,
      COALESCE(SUM(CASE WHEN ss.status = 'expected' THEN 1 ELSE 0 END), 0) as expected_sets,
      COALESCE(SUM(CASE WHEN ss.status = 'deviation' THEN 1 ELSE 0 END), 0) as deviation_sets,
      CASE
        WHEN ws.total_sets_planned > 0
          THEN ROUND((ws.sets_completed * 100.0) / ws.total_sets_planned, 1)
        ELSE 0
      END as completion_rate_pct,
      CASE
        WHEN ws.sets_completed > 0
          THEN ROUND((COALESCE(SUM(CASE WHEN ss.status = 'expected' THEN 1 ELSE 0 END), 0) * 100.0) / ws.sets_completed, 1)
        ELSE 0
      END as adherence_rate_pct,
      CASE
        WHEN ws.completed_at IS NOT NULL
          THEN CAST(strftime('%s', ws.completed_at) - strftime('%s', ws.started_at) AS INTEGER)
        ELSE 0
      END as duration_seconds
    FROM workout_sessions ws
    JOIN workouts w ON w.id = ws.workout_id
    LEFT JOIN session_sets ss ON ss.session_id = ws.id
    ${whereClause}
    GROUP BY ws.id
    ORDER BY ws.id DESC
    LIMIT ?`,
    [...whereParams, limit]
  ) as WorkoutHistorySession[];
}

export async function getWorkoutAggregateAnalytics(
  limit = 50,
  days: number | null = null
): Promise<WorkoutAggregateAnalytics[]> {
  await initDb();
  const whereClause =
    Number.isInteger(days) && Number(days) > 0 ? 'WHERE ws.started_at >= datetime(\'now\', ?)' : '';
  const whereParams = Number.isInteger(days) && Number(days) > 0 ? [`-${Number(days)} days`] : [];

  return dbAll(
    `SELECT
      s.workout_id,
      s.workout_name,
      COUNT(*) as sessions_count,
      SUM(s.sets_completed) as total_sets_logged,
      ROUND(AVG(s.completion_rate_pct), 1) as avg_completion_rate_pct,
      ROUND(AVG(s.adherence_rate_pct), 1) as avg_adherence_rate_pct,
      ROUND(MAX(s.adherence_rate_pct), 1) as best_adherence_rate_pct,
      MAX(s.completed_at) as last_completed_at
    FROM (
      SELECT
        ws.id as session_id,
        ws.workout_id,
        w.name as workout_name,
        ws.completed_at,
        ws.sets_completed,
        CASE
          WHEN ws.total_sets_planned > 0
            THEN (ws.sets_completed * 100.0) / ws.total_sets_planned
          ELSE 0
        END as completion_rate_pct,
        CASE
          WHEN ws.sets_completed > 0
            THEN (COALESCE(SUM(CASE WHEN ss.status = 'expected' THEN 1 ELSE 0 END), 0) * 100.0) / ws.sets_completed
          ELSE 0
        END as adherence_rate_pct
      FROM workout_sessions ws
      JOIN workouts w ON w.id = ws.workout_id
      LEFT JOIN session_sets ss ON ss.session_id = ws.id
      ${whereClause}
      GROUP BY ws.id
    ) s
    GROUP BY s.workout_id
    ORDER BY sessions_count DESC, avg_adherence_rate_pct DESC
    LIMIT ?`,
    [...whereParams, limit]
  ) as WorkoutAggregateAnalytics[];
}

export async function getExerciseDeviationAnalytics(
  limit = 50,
  days: number | null = null
): Promise<ExerciseDeviationAnalytics[]> {
  await initDb();
  const whereClause =
    Number.isInteger(days) && Number(days) > 0 ? 'WHERE ws.started_at >= datetime(\'now\', ?)' : '';
  const whereParams = Number.isInteger(days) && Number(days) > 0 ? [`-${Number(days)} days`] : [];

  return dbAll(
    `SELECT
      ss.exercise_id,
      e.name as exercise_name,
      COUNT(*) as total_sets_logged,
      COALESCE(SUM(CASE WHEN ss.status = 'expected' THEN 1 ELSE 0 END), 0) as expected_sets,
      COALESCE(SUM(CASE WHEN ss.status = 'deviation' THEN 1 ELSE 0 END), 0) as deviation_sets,
      ROUND((COALESCE(SUM(CASE WHEN ss.status = 'deviation' THEN 1 ELSE 0 END), 0) * 100.0) / COUNT(*), 1) as deviation_rate_pct,
      ROUND(AVG(CASE
        WHEN ss.target_unit = 'kg' AND ss.actual_weight IS NOT NULL AND ss.target_weight IS NOT NULL
          THEN ABS(ss.actual_weight - ss.target_weight)
        ELSE NULL
      END), 2) as avg_weight_delta,
      ROUND(AVG(CASE
        WHEN ss.target_unit = 's' AND ss.actual_weight IS NOT NULL AND ss.target_weight IS NOT NULL
          THEN ABS(ss.actual_weight - ss.target_weight)
        ELSE NULL
      END), 2) as avg_time_delta_seconds
    FROM session_sets ss
    JOIN workout_sessions ws ON ws.id = ss.session_id
    JOIN exercises e ON e.id = ss.exercise_id
    ${whereClause}
    GROUP BY ss.exercise_id
    ORDER BY deviation_rate_pct DESC, deviation_sets DESC
    LIMIT ?`,
    [...whereParams, limit]
  ) as ExerciseDeviationAnalytics[];
}
