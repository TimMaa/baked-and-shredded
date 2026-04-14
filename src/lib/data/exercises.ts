import {
  ALL_MUSCLE_GROUPS,
  MAX_MUSCLE_POINTS,
  createDefaultMuscleRatings,
  normalizeMuscleRatings,
  totalMusclePoints,
  type MuscleRatings,
} from '$lib/muscleGroups';
import { queryFirstRow, queryRows, runStatement } from '$lib/data/sqlite';

export type ExerciseRecord = {
  id: number;
  external_id: string;
  name: string;
  description: string;
  tip: string;
  focus_areas: MuscleRatings;
  created_at: string;
  updated_at: string;
};

type ExerciseRow = {
  id: number;
  external_id: string;
  name: string;
  description: string | null;
  tip: string | null;
  focus_areas: string | null;
  created_at: string;
  updated_at: string;
};

type ExerciseInput = {
  id?: number;
  name: string;
  description: string;
  tip?: string;
  focusAreas: MuscleRatings;
};

export type CsvImportResult = {
  imported: number;
  skipped: number;
  skippedDetails: string[];
};

function mapExerciseRow(row: ExerciseRow): ExerciseRecord {
  return {
    id: Number(row.id),
    external_id: row.external_id,
    name: row.name,
    description: row.description ?? '',
    tip: row.tip ?? '',
    focus_areas: row.focus_areas
      ? normalizeMuscleRatings(JSON.parse(row.focus_areas))
      : createDefaultMuscleRatings(),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeText(value: string | undefined) {
  return (value ?? '').trim();
}

function validateExerciseInput(input: ExerciseInput) {
  const name = normalizeText(input.name);
  const description = normalizeText(input.description);
  const tip = normalizeText(input.tip);
  const ratings = normalizeMuscleRatings(input.focusAreas);

  if (!name) {
    throw new Error('Exercise name is required');
  }

  if (name.length < 2) {
    throw new Error('Exercise name must be at least 2 characters');
  }

  if (!description) {
    throw new Error('Description is required');
  }

  if (description.length < 5) {
    throw new Error('Description must be at least 5 characters');
  }

  const total = totalMusclePoints(ratings);
  if (total === 0) {
    throw new Error('Rate at least one muscle group above 0');
  }

  if (total > MAX_MUSCLE_POINTS) {
    throw new Error(`Total muscle rating points cannot exceed ${MAX_MUSCLE_POINTS}`);
  }

  return {
    name,
    description,
    tip,
    ratings,
  };
}

async function ensureUniqueExerciseName(name: string, currentId?: number) {
  const row = await queryFirstRow<{ id: number }>(
    'SELECT id FROM exercises WHERE lower(name) = lower(?) AND deleted_at IS NULL LIMIT 1',
    [name]
  );

  if (row && Number(row.id) !== currentId) {
    throw new Error('An exercise with this name already exists');
  }
}

export async function getAllExercisesLocal() {
  const rows = await queryRows<ExerciseRow>(
    'SELECT id, external_id, name, description, tip, focus_areas, created_at, updated_at FROM exercises WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE ASC'
  );
  return rows.map(mapExerciseRow);
}

export async function createExerciseLocal(input: ExerciseInput) {
  const validated = validateExerciseInput(input);
  await ensureUniqueExerciseName(validated.name);

  await runStatement(
    `INSERT INTO exercises (
      external_id,
      name,
      description,
      tip,
      focus_areas,
      sync_status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      crypto.randomUUID(),
      validated.name,
      validated.description,
      validated.tip || null,
      JSON.stringify(validated.ratings),
    ]
  );
}

export async function updateExerciseLocal(input: ExerciseInput) {
  if (!input.id) {
    throw new Error('Exercise ID is required');
  }

  const validated = validateExerciseInput(input);
  await ensureUniqueExerciseName(validated.name, input.id);

  await runStatement(
    `UPDATE exercises
     SET name = ?,
         description = ?,
         tip = ?,
         focus_areas = ?,
         sync_status = 'pending',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND deleted_at IS NULL`,
    [
      validated.name,
      validated.description,
      validated.tip || null,
      JSON.stringify(validated.ratings),
      input.id,
    ]
  );
}

export async function deleteExerciseLocal(id: number) {
  await runStatement('DELETE FROM exercises WHERE id = ?', [id]);
}

function parseCsvLine(line: string) {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = index + 1 < line.length ? line[index + 1] : '';

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
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

function parseCsvContent(content: string) {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return normalized
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(parseCsvLine);
}

function toRatingValue(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > 5) return 5;
  return parsed;
}

export async function importExercisesFromCsv(file: File): Promise<CsvImportResult> {
  const raw = await file.text();
  const rows = parseCsvContent(raw);

  if (rows.length < 2) {
    throw new Error('CSV must include a header and at least one data row');
  }

  const header = rows[0];
  const headerMap = new Map<string, number>();
  header.forEach((name, index) => headerMap.set(name.toLowerCase(), index));

  const nameIndex = headerMap.get('exercise');
  const descriptionIndex = headerMap.get('description');
  const tipIndex = headerMap.get('tip');

  if (nameIndex === undefined) {
    throw new Error('CSV header must include: exercise');
  }

  let imported = 0;
  let skipped = 0;
  const skippedDetails: string[] = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const name = normalizeText(row[nameIndex] || '');
    const description = descriptionIndex !== undefined ? normalizeText(row[descriptionIndex] || '') : '';
    const tip = tipIndex !== undefined ? normalizeText(row[tipIndex] || '') : '';

    const ratings = createDefaultMuscleRatings();
    for (const group of ALL_MUSCLE_GROUPS) {
      const columnIndex = headerMap.get(group.toLowerCase());
      if (columnIndex !== undefined) {
        ratings[group] = toRatingValue(row[columnIndex] || '0');
      }
    }

    try {
      await createExerciseLocal({
        name,
        description,
        tip,
        focusAreas: ratings,
      });
      imported += 1;
    } catch (error) {
      skipped += 1;
      const message = error instanceof Error ? error.message : 'Unknown error';
      skippedDetails.push(`Row ${rowIndex + 1}: ${message}`);
    }
  }

  return { imported, skipped, skippedDetails };
}