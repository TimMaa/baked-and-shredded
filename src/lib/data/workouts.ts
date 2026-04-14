import {
  createDefaultMuscleRatings,
  normalizeMuscleRatings,
  type MuscleRatings,
} from '$lib/muscleGroups';
import { queryFirstRow, queryRows, runStatement } from '$lib/data/sqlite';

type WorkoutRow = {
  id: number;
  external_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type WorkoutExerciseRow = {
  id: number;
  workout_id: number;
  exercise_id: number;
  exercise_name: string | null;
  focus_areas: string | null;
  sets: number;
  target_reps: number;
  target_weight: number | null;
  target_unit: 'kg' | 's' | string;
  order_index: number;
};

export type WorkoutRecord = {
  id: number;
  external_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
};

export type WorkoutExerciseRecord = {
  id: number;
  workout_id: number;
  exercise_id: number;
  exercise_name: string;
  focus_areas: MuscleRatings;
  sets: number;
  target_reps: number;
  target_weight: number | null;
  target_unit: 'kg' | 's';
  order_index: number;
};

export type WorkoutWithExercisesRecord = WorkoutRecord & {
  exercises: WorkoutExerciseRecord[];
};

function mapWorkoutRow(row: WorkoutRow): WorkoutRecord {
  return {
    id: Number(row.id),
    external_id: row.external_id,
    name: row.name,
    description: row.description ?? '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapWorkoutExerciseRow(row: WorkoutExerciseRow): WorkoutExerciseRecord {
  return {
    id: Number(row.id),
    workout_id: Number(row.workout_id),
    exercise_id: Number(row.exercise_id),
    exercise_name: row.exercise_name ?? 'Unknown exercise',
    focus_areas: row.focus_areas
      ? normalizeMuscleRatings(JSON.parse(row.focus_areas))
      : createDefaultMuscleRatings(),
    sets: Number(row.sets),
    target_reps: Number(row.target_reps),
    target_weight: row.target_weight == null ? null : Number(row.target_weight),
    target_unit: row.target_unit === 's' ? 's' : 'kg',
    order_index: Number(row.order_index ?? 0),
  };
}

function normalizeText(value: string | undefined) {
  return (value ?? '').trim();
}

async function ensureUniqueWorkoutName(name: string, currentId?: number) {
  const row = await queryFirstRow<{ id: number }>(
    'SELECT id FROM workouts WHERE lower(name) = lower(?) AND deleted_at IS NULL LIMIT 1',
    [name]
  );

  if (row && Number(row.id) !== currentId) {
    throw new Error('A workout with this name already exists');
  }
}

function validateWorkoutInput(nameInput: string, descriptionInput: string) {
  const name = normalizeText(nameInput);
  const description = normalizeText(descriptionInput);

  if (!name) {
    throw new Error('Workout name is required');
  }

  if (name.length < 2) {
    throw new Error('Workout name must be at least 2 characters');
  }

  if (!description) {
    throw new Error('Description is required');
  }

  if (description.length < 5) {
    throw new Error('Description must be at least 5 characters');
  }

  return { name, description };
}

export async function getAllWorkoutsLocal() {
  const rows = await queryRows<WorkoutRow>(
    `SELECT id, external_id, name, description, created_at, updated_at
     FROM workouts
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC`
  );

  return rows.map(mapWorkoutRow);
}

export async function getWorkoutLocal(id: number) {
  const row = await queryFirstRow<WorkoutRow>(
    `SELECT id, external_id, name, description, created_at, updated_at
     FROM workouts
     WHERE id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [id]
  );

  return row ? mapWorkoutRow(row) : null;
}

export async function getWorkoutWithExercisesLocal(id: number) {
  const workout = await getWorkoutLocal(id);

  if (!workout) {
    return null;
  }

  const rows = await queryRows<WorkoutExerciseRow>(
    `SELECT
      we.id,
      we.workout_id,
      we.exercise_id,
      e.name AS exercise_name,
      e.focus_areas,
      we.sets,
      we.target_reps,
      we.target_weight,
      we.target_unit,
      we.order_index
    FROM workout_exercises we
    LEFT JOIN exercises e ON e.id = we.exercise_id
    WHERE we.workout_id = ?
      AND we.deleted_at IS NULL
      AND e.deleted_at IS NULL
    ORDER BY we.order_index ASC, we.id ASC`,
    [id]
  );

  return {
    ...workout,
    exercises: rows.map(mapWorkoutExerciseRow),
  } as WorkoutWithExercisesRecord;
}

export async function createWorkoutLocal(nameInput: string, descriptionInput: string) {
  const { name, description } = validateWorkoutInput(nameInput, descriptionInput);
  await ensureUniqueWorkoutName(name);

  await runStatement(
    `INSERT INTO workouts (
      external_id,
      name,
      description,
      sync_status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [crypto.randomUUID(), name, description]
  );
}

export async function updateWorkoutLocal(id: number, nameInput: string, descriptionInput: string) {
  const { name, description } = validateWorkoutInput(nameInput, descriptionInput);
  await ensureUniqueWorkoutName(name, id);

  await runStatement(
    `UPDATE workouts
     SET name = ?,
         description = ?,
         sync_status = 'pending',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND deleted_at IS NULL`,
    [name, description, id]
  );
}

export async function deleteWorkoutLocal(id: number) {
  await runStatement('DELETE FROM workouts WHERE id = ?', [id]);
}

export async function addWorkoutExerciseLocal(
  workoutId: number,
  exerciseId: number,
  sets: number,
  targetReps: number,
  targetValue: number,
  targetUnit: 'kg' | 's'
) {
  const normalizedTargetUnit: 'kg' | 's' = targetUnit === 's' ? 's' : 'kg';
  const normalizedTargetReps = normalizedTargetUnit === 's' ? 1 : targetReps;

  const row = await queryFirstRow<{ max_order: number | null }>(
    'SELECT COALESCE(MAX(order_index), -1) AS max_order FROM workout_exercises WHERE workout_id = ? AND deleted_at IS NULL',
    [workoutId]
  );

  const nextOrderIndex = Number(row?.max_order ?? -1) + 1;

  await runStatement(
    `INSERT INTO workout_exercises (
      external_id,
      workout_id,
      exercise_id,
      sets,
      target_reps,
      target_weight,
      target_unit,
      order_index,
      sync_status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      crypto.randomUUID(),
      workoutId,
      exerciseId,
      sets,
      normalizedTargetReps,
      targetValue,
      normalizedTargetUnit,
      nextOrderIndex,
    ]
  );
}

export async function deleteWorkoutExerciseLocal(id: number) {
  await runStatement('DELETE FROM workout_exercises WHERE id = ?', [id]);
}

export async function reorderWorkoutExercisesLocal(workoutId: number, exerciseIds: number[]) {
  await runStatement('BEGIN TRANSACTION');

  try {
    for (let index = 0; index < exerciseIds.length; index += 1) {
      const exerciseId = exerciseIds[index];
      await runStatement(
        `UPDATE workout_exercises
         SET order_index = ?,
             sync_status = 'pending',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
           AND workout_id = ?
           AND deleted_at IS NULL`,
        [index, exerciseId, workoutId]
      );
    }

    await runStatement('COMMIT');
  } catch (error) {
    await runStatement('ROLLBACK');
    throw error;
  }
}
