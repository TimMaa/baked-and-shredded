import type { capSQLiteVersionUpgrade } from '@capacitor-community/sqlite';

export const APP_DATABASE_NAME = 'baked_and_shredded';
export const APP_DATABASE_VERSION = 1;

export const APP_DATABASE_UPGRADES: capSQLiteVersionUpgrade[] = [
  {
    toVersion: 1,
    statements: [
      `
        CREATE TABLE IF NOT EXISTS exercises (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          external_id TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          tip TEXT,
          focus_areas TEXT NOT NULL DEFAULT '{}',
          sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict')),
          deleted_at DATETIME,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS workouts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          external_id TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          description TEXT,
          sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict')),
          deleted_at DATETIME,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS workout_exercises (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          external_id TEXT NOT NULL UNIQUE,
          workout_id INTEGER NOT NULL,
          exercise_id INTEGER NOT NULL,
          sets INTEGER NOT NULL DEFAULT 1,
          target_reps INTEGER NOT NULL,
          target_weight REAL,
          target_unit TEXT NOT NULL DEFAULT 'kg',
          order_index INTEGER NOT NULL DEFAULT 0,
          sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict')),
          deleted_at DATETIME,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
          FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS workout_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          external_id TEXT NOT NULL UNIQUE,
          workout_id INTEGER NOT NULL,
          total_sets_planned INTEGER NOT NULL DEFAULT 0,
          started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME,
          sets_completed INTEGER NOT NULL DEFAULT 0,
          sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict')),
          deleted_at DATETIME,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS session_sets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          external_id TEXT NOT NULL UNIQUE,
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
          sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict')),
          deleted_at DATETIME,
          completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
          FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE,
          FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
        );
      `,
      `CREATE INDEX IF NOT EXISTS idx_exercises_external_id ON exercises(external_id);`,
      `CREATE INDEX IF NOT EXISTS idx_exercises_sync_status ON exercises(sync_status);`,
      `CREATE INDEX IF NOT EXISTS idx_workouts_external_id ON workouts(external_id);`,
      `CREATE INDEX IF NOT EXISTS idx_workouts_sync_status ON workouts(sync_status);`,
      `CREATE INDEX IF NOT EXISTS idx_workout_exercises_external_id ON workout_exercises(external_id);`,
      `CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);`,
      `CREATE INDEX IF NOT EXISTS idx_workout_exercises_sync_status ON workout_exercises(sync_status);`,
      `CREATE INDEX IF NOT EXISTS idx_workout_sessions_external_id ON workout_sessions(external_id);`,
      `CREATE INDEX IF NOT EXISTS idx_workout_sessions_workout_id ON workout_sessions(workout_id);`,
      `CREATE INDEX IF NOT EXISTS idx_workout_sessions_sync_status ON workout_sessions(sync_status);`,
      `CREATE INDEX IF NOT EXISTS idx_session_sets_external_id ON session_sets(external_id);`,
      `CREATE INDEX IF NOT EXISTS idx_session_sets_session_id ON session_sets(session_id);`,
      `CREATE INDEX IF NOT EXISTS idx_session_sets_status ON session_sets(status);`,
      `CREATE INDEX IF NOT EXISTS idx_session_sets_sync_status ON session_sets(sync_status);`
    ]
  }
];