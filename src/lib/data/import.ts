import { queryFirstRow, runStatement } from '$lib/data/sqlite';

export type WorkoutCsvImportResult = {
  sessionsImported: number;
  setsImported: number;
  sessionsSkipped: number;
  errors: string[];
};

type ParsedCsvRow = {
  exercise: string;
  date: string; // YYYY-MM-DD
  sets: number;
  weight: number | null;
  goal: number;
  reps: (number | null)[];
};

// ── CSV parsing ────────────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = i + 1 < line.length ? line[i + 1] : '';

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  fields.push(current.trim());
  return fields;
}

function parseCsvContent(content: string): string[][] {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return normalized
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(parseCsvLine);
}

/** Parses a weight value that may use a European decimal comma, e.g. "7,5" → 7.5. */
function parseWeight(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? null : parsed;
}

/** Converts DD.MM.YYYY → YYYY-MM-DD, returns null for invalid or blank dates. */
function parseDate(dateStr: string): string | null {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(dateStr.trim());
  if (!match) return null;
  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  const year = match[3];
  return `${year}-${month}-${day}`;
}

// ── DB helpers ─────────────────────────────────────────────────────────────────

async function findOrCreateExercise(name: string): Promise<number> {
  const existing = await queryFirstRow<{ id: number }>(
    'SELECT id FROM exercises WHERE lower(name) = lower(?) AND deleted_at IS NULL LIMIT 1',
    [name]
  );
  if (existing) return Number(existing.id);

  const externalId = crypto.randomUUID();
  await runStatement(
    `INSERT INTO exercises (external_id, name, description, focus_areas, sync_status, created_at, updated_at)
     VALUES (?, ?, 'Imported from workout history CSV', '{}', 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [externalId, name]
  );

  const row = await queryFirstRow<{ id: number }>(
    'SELECT id FROM exercises WHERE external_id = ? LIMIT 1',
    [externalId]
  );
  if (!row) throw new Error(`Failed to create exercise: ${name}`);
  return Number(row.id);
}

async function findOrCreateWorkout(name: string): Promise<number> {
  const existing = await queryFirstRow<{ id: number }>(
    'SELECT id FROM workouts WHERE lower(name) = lower(?) AND deleted_at IS NULL LIMIT 1',
    [name]
  );
  if (existing) return Number(existing.id);

  const externalId = crypto.randomUUID();
  await runStatement(
    `INSERT INTO workouts (external_id, name, description, sync_status, created_at, updated_at)
     VALUES (?, ?, 'Imported from workout history CSV', 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [externalId, name]
  );

  const row = await queryFirstRow<{ id: number }>(
    'SELECT id FROM workouts WHERE external_id = ? LIMIT 1',
    [externalId]
  );
  if (!row) throw new Error(`Failed to create workout: ${name}`);
  return Number(row.id);
}

async function findOrCreateWorkoutExercise(
  workoutId: number,
  exerciseId: number,
  sets: number,
  targetReps: number,
  targetWeight: number | null,
  targetUnit: 'kg' | 's',
  orderIndex: number
): Promise<number> {
  const existing = await queryFirstRow<{ id: number }>(
    'SELECT id FROM workout_exercises WHERE workout_id = ? AND exercise_id = ? AND deleted_at IS NULL LIMIT 1',
    [workoutId, exerciseId]
  );
  if (existing) return Number(existing.id);

  const externalId = crypto.randomUUID();
  await runStatement(
    `INSERT INTO workout_exercises (
       external_id, workout_id, exercise_id, sets,
       target_reps, target_weight, target_unit, order_index,
       sync_status, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [externalId, workoutId, exerciseId, sets, targetReps, targetWeight, targetUnit, orderIndex]
  );

  const row = await queryFirstRow<{ id: number }>(
    'SELECT id FROM workout_exercises WHERE external_id = ? LIMIT 1',
    [externalId]
  );
  if (!row) throw new Error('Failed to create workout exercise entry');
  return Number(row.id);
}

// ── Time-based detection ───────────────────────────────────────────────────────

/**
 * Detects time-based exercises from the CSV heuristic:
 * goal >= 20 (seconds) AND weight >= 40 (clearly body-weight, not a dumbbell).
 * Covers exercises like Plank (goal=60, kg=71).
 */
function isTimeBased(goal: number, weight: number | null): boolean {
  return goal >= 20 && weight !== null && weight >= 40;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Imports completed workout sessions from a CSV file produced by a spreadsheet
 * workout tracker.
 *
 * Expected header (case-insensitive):
 *   Exercise, Date, Sets, kg, Goal, Reps (1), Reps (2), Reps (3)[, ...]
 *
 * - Rows without a date are treated as future/planned sessions and are skipped.
 * - Dates must be in DD.MM.YYYY format.
 * - Weight values may use a European decimal comma (e.g. "7,5" = 7.5 kg).
 * - Sessions for a date that already exists in the database are skipped.
 * - Exercises and the workout are created automatically if they do not exist yet.
 */
export async function importWorkoutHistoryFromCsv(
  file: File,
  workoutName: string
): Promise<WorkoutCsvImportResult> {
  const trimmedName = workoutName.trim();
  if (!trimmedName) throw new Error('Workout name is required');

  const raw = await file.text();
  const allRows = parseCsvContent(raw);

  if (allRows.length < 2) {
    throw new Error('CSV must include a header row and at least one data row');
  }

  const header = allRows[0].map((h) => h.toLowerCase());
  const exerciseIdx = header.indexOf('exercise');
  const dateIdx = header.indexOf('date');
  const setsIdx = header.indexOf('sets');
  const kgIdx = header.indexOf('kg');
  const goalIdx = header.indexOf('goal');
  const repsColIndices: number[] = header.reduce<number[]>((acc, h, i) => {
    if (h.startsWith('reps')) acc.push(i);
    return acc;
  }, []);

  if (exerciseIdx === -1 || dateIdx === -1 || goalIdx === -1) {
    throw new Error('CSV must contain columns named: Exercise, Date, Goal');
  }

  // Parse and filter data rows
  const parsedRows: ParsedCsvRow[] = [];
  for (const row of allRows.slice(1)) {
    const dateStr = (row[dateIdx] ?? '').trim();
    if (!dateStr) continue; // planned-but-not-done rows have no date

    const date = parseDate(dateStr);
    if (!date) continue;

    const exerciseName = (row[exerciseIdx] ?? '').trim();
    if (!exerciseName) continue;

    parsedRows.push({
      exercise: exerciseName,
      date,
      sets: parseInt(row[setsIdx] ?? '0', 10) || 0,
      weight: kgIdx === -1 ? null : parseWeight(row[kgIdx] ?? ''),
      goal: parseInt(row[goalIdx] ?? '0', 10) || 0,
      reps: repsColIndices.map((i) => {
        const val = (row[i] ?? '').trim();
        if (val === '') return null;
        const n = parseInt(val, 10);
        return isNaN(n) ? null : n;
      }),
    });
  }

  if (parsedRows.length === 0) {
    throw new Error(
      'No completed sessions found. Rows need a date in DD.MM.YYYY format to be imported.'
    );
  }

  // Find/create workout
  const workoutId = await findOrCreateWorkout(trimmedName);

  // Find/create exercises and workout_exercise links using first-occurrence targets
  const exerciseNames = [...new Set(parsedRows.map((r) => r.exercise))];
  const exerciseIdMap = new Map<string, number>();
  const workoutExerciseIdMap = new Map<string, number>();

  for (let i = 0; i < exerciseNames.length; i++) {
    const name = exerciseNames[i];
    const exerciseId = await findOrCreateExercise(name);
    exerciseIdMap.set(name, exerciseId);

    const first = parsedRows.find((r) => r.exercise === name)!;
    const timeBased = isTimeBased(first.goal, first.weight);
    const targetUnit: 'kg' | 's' = timeBased ? 's' : 'kg';
    // For time-based: target_reps=1 (one timed set), target_weight=goal (in seconds)
    // For rep-based:  target_reps=goal (rep count),   target_weight=kg used
    const targetReps = timeBased ? 1 : first.goal;
    const targetWeight = timeBased ? first.goal : first.weight;

    const weId = await findOrCreateWorkoutExercise(
      workoutId,
      exerciseId,
      first.sets,
      targetReps,
      targetWeight,
      targetUnit,
      i
    );
    workoutExerciseIdMap.set(name, weId);
  }

  // Process one session per unique date
  const dates = [...new Set(parsedRows.map((r) => r.date))].sort();
  let sessionsImported = 0;
  let setsImported = 0;
  let sessionsSkipped = 0;
  const errors: string[] = [];

  for (const date of dates) {
    const sessionRows = parsedRows.filter((r) => r.date === date);

    // Skip if a session for this workout on this date already exists
    const existingSession = await queryFirstRow<{ id: number }>(
      `SELECT id FROM workout_sessions
       WHERE workout_id = ? AND date(started_at) = ? AND deleted_at IS NULL
       LIMIT 1`,
      [workoutId, date]
    );
    if (existingSession) {
      sessionsSkipped++;
      continue;
    }

    const totalSetsPlanned = sessionRows.reduce((sum, r) => sum + r.sets, 0);
    const sessionExternalId = crypto.randomUUID();

    await runStatement(
      `INSERT INTO workout_sessions (
         external_id, workout_id, total_sets_planned,
         started_at, completed_at, sets_completed,
         sync_status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, 0, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        sessionExternalId,
        workoutId,
        totalSetsPlanned,
        `${date} 10:00:00`,
        `${date} 11:00:00`,
      ]
    );

    const sessionRow = await queryFirstRow<{ id: number }>(
      'SELECT id FROM workout_sessions WHERE external_id = ? LIMIT 1',
      [sessionExternalId]
    );
    if (!sessionRow) {
      errors.push(`Failed to create session for ${date}`);
      continue;
    }

    const sessionId = Number(sessionRow.id);
    let sessionSetsLogged = 0;

    for (const row of sessionRows) {
      const exerciseId = exerciseIdMap.get(row.exercise);
      const workoutExerciseId = workoutExerciseIdMap.get(row.exercise);
      if (exerciseId === undefined || workoutExerciseId === undefined) continue;

      const timeBased = isTimeBased(row.goal, row.weight);
      const targetUnit: 'kg' | 's' = timeBased ? 's' : 'kg';
      const targetReps = timeBased ? 1 : row.goal;
      const targetWeight = timeBased ? row.goal : row.weight;

      for (let setIdx = 0; setIdx < row.reps.length; setIdx++) {
        const repsValue = row.reps[setIdx];
        if (repsValue === null) continue; // column not present in CSV

        const setNumber = setIdx + 1;
        let actualReps: number;
        let actualWeight: number | null;
        let status: 'expected' | 'deviation';

        if (timeBased) {
          // repsValue is elapsed seconds; store as actual_weight per the execute-page convention
          actualReps = 1;
          actualWeight = repsValue;
          status = repsValue >= row.goal ? 'expected' : 'deviation';
        } else {
          actualReps = repsValue;
          actualWeight = row.weight;
          status = repsValue >= row.goal ? 'expected' : 'deviation';
        }

        await runStatement(
          `INSERT INTO session_sets (
             external_id, session_id, workout_exercise_id, exercise_id,
             set_number, target_reps, target_weight, target_unit,
             actual_reps, actual_weight, status, sync_status,
             completed_at, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            crypto.randomUUID(),
            sessionId,
            workoutExerciseId,
            exerciseId,
            setNumber,
            targetReps,
            targetWeight,
            targetUnit,
            actualReps,
            actualWeight,
            status,
            `${date} 10:00:00`,
          ]
        );
        sessionSetsLogged++;
        setsImported++;
      }
    }

    await runStatement(
      'UPDATE workout_sessions SET sets_completed = ? WHERE id = ?',
      [sessionSetsLogged, sessionId]
    );

    sessionsImported++;
  }

  return { sessionsImported, setsImported, sessionsSkipped, errors };
}
