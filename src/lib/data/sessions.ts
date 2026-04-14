import { queryRows, runStatement } from '$lib/data/sqlite';

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

export async function createWorkoutSessionLocal(workoutId: number, totalSetsPlanned: number) {
  const externalId = crypto.randomUUID();

  await runStatement(
    `INSERT INTO workout_sessions (
      external_id,
      workout_id,
      total_sets_planned,
      started_at,
      sync_status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [externalId, workoutId, totalSetsPlanned]
  );

  const row = await queryRows<{ id: number }>(
    'SELECT id FROM workout_sessions WHERE external_id = ? LIMIT 1',
    [externalId]
  );

  const sessionId = Number(row[0]?.id);
  if (!Number.isFinite(sessionId) || sessionId <= 0) {
    throw new Error('Failed to resolve newly created workout session id.');
  }

  return sessionId;
}

export async function completeWorkoutSessionLocal(sessionId: number, setsCompleted: number) {
  await runStatement(
    `UPDATE workout_sessions
     SET completed_at = CURRENT_TIMESTAMP,
         sets_completed = ?,
         sync_status = 'pending',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [setsCompleted, sessionId]
  );
}

export async function logSessionSetLocal(input: SessionSetLogInput) {
  await runStatement(
    `INSERT INTO session_sets (
      external_id,
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
      sync_status,
      completed_at,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      crypto.randomUUID(),
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

export async function getWorkoutSuccessSummaryLocal(limit = 20): Promise<WorkoutSuccessSummary[]> {
  return queryRows<WorkoutSuccessSummary>(
    `SELECT
      ws.id as session_id,
      ws.workout_id,
      w.name as workout_name,
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
    WHERE ws.deleted_at IS NULL
    GROUP BY ws.id
    ORDER BY ws.id DESC
    LIMIT ?`,
    [limit]
  );
}

export async function deleteWorkoutSessionLocal(sessionId: number) {
  await runStatement('DELETE FROM session_sets WHERE session_id = ?', [sessionId]);
  await runStatement('DELETE FROM workout_sessions WHERE id = ?', [sessionId]);
}

export async function getWorkoutSessionHistoryLocal(
  limit = 100,
  days: number | null = null
): Promise<WorkoutHistorySession[]> {
  const whereClause = Number.isInteger(days) && Number(days) > 0 ? 'AND ws.started_at >= datetime(\'now\', ?)' : '';
  const whereParams = Number.isInteger(days) && Number(days) > 0 ? [`-${Number(days)} days`] : [];

  return queryRows<WorkoutHistorySession>(
    `SELECT
      ws.id as session_id,
      ws.workout_id,
      w.name as workout_name,
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
    WHERE ws.deleted_at IS NULL
      ${whereClause}
    GROUP BY ws.id
    ORDER BY ws.id DESC
    LIMIT ?`,
    [...whereParams, limit]
  );
}

export async function getWorkoutAggregateAnalyticsLocal(
  limit = 50,
  days: number | null = null
): Promise<WorkoutAggregateAnalytics[]> {
  const whereClause = Number.isInteger(days) && Number(days) > 0 ? 'AND ws.started_at >= datetime(\'now\', ?)' : '';
  const whereParams = Number.isInteger(days) && Number(days) > 0 ? [`-${Number(days)} days`] : [];

  return queryRows<WorkoutAggregateAnalytics>(
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
      WHERE ws.deleted_at IS NULL
        ${whereClause}
      GROUP BY ws.id
    ) s
    GROUP BY s.workout_id
    ORDER BY sessions_count DESC, avg_adherence_rate_pct DESC
    LIMIT ?`,
    [...whereParams, limit]
  );
}

export async function getExerciseDeviationAnalyticsLocal(
  limit = 50,
  days: number | null = null
): Promise<ExerciseDeviationAnalytics[]> {
  const whereClause = Number.isInteger(days) && Number(days) > 0 ? 'AND ws.started_at >= datetime(\'now\', ?)' : '';
  const whereParams = Number.isInteger(days) && Number(days) > 0 ? [`-${Number(days)} days`] : [];

  return queryRows<ExerciseDeviationAnalytics>(
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
    WHERE ss.deleted_at IS NULL
      AND ws.deleted_at IS NULL
      ${whereClause}
    GROUP BY ss.exercise_id
    ORDER BY deviation_rate_pct DESC, deviation_sets DESC
    LIMIT ?`,
    [...whereParams, limit]
  );
}
