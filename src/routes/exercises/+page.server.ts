import { createExercise, getAllExercises, updateExercise, deleteExercise, getExercise } from '$lib/db';
import { fail } from '@sveltejs/kit';
import {
  ALL_MUSCLE_GROUPS,
  MAX_MUSCLE_POINTS,
  normalizeMuscleRatings,
  totalMusclePoints,
  type MuscleRatings,
} from '$lib/muscleGroups';

export const load = async () => {
  const exercises = await getAllExercises();
  return { exercises };
};

function parseMuscleRatings(muscleRatingsStr: string): { ratings: MuscleRatings; error?: string } {
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(muscleRatingsStr || '{}');
  } catch {
    return { ratings: normalizeMuscleRatings({}), error: 'Invalid muscle rating payload' };
  }

  const ratings = normalizeMuscleRatings(parsed);

  // Reject unknown muscle groups if present in payload.
  if (parsed && typeof parsed === 'object') {
    const unknownGroups = Object.keys(parsed as Record<string, unknown>).filter(
      (group) => !ALL_MUSCLE_GROUPS.includes(group)
    );
    if (unknownGroups.length > 0) {
      return { ratings, error: 'Unknown muscle groups provided' };
    }
  }

  const total = totalMusclePoints(ratings);
  if (total === 0) {
    return { ratings, error: 'Rate at least one muscle group above 0' };
  }

  if (total > MAX_MUSCLE_POINTS) {
    return { ratings, error: `Total muscle rating points cannot exceed ${MAX_MUSCLE_POINTS}` };
  }

  return { ratings };
}

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
  const rows = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return rows.map(parseCsvLine);
}

function toRatingValue(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > 5) return 5;
  return parsed;
}

export const actions = {
  addExercise: async ({ request }) => {
    const data = await request.formData();
    const name = (data.get('name') as string)?.trim();
    const description = (data.get('description') as string)?.trim();
    const tip = (data.get('tip') as string)?.trim();
    const muscleRatingsStr = (data.get('muscleRatings') as string) || '{}';
    const { ratings, error: ratingsError } = parseMuscleRatings(muscleRatingsStr);

    if (!name) {
      return fail(400, { message: 'Exercise name is required' });
    }

    if (name.length < 2) {
      return fail(400, { message: 'Exercise name must be at least 2 characters' });
    }

    if (!description) {
      return fail(400, { message: 'Description is required' });
    }

    if (description.length < 5) {
      return fail(400, { message: 'Description must be at least 5 characters' });
    }

    if (ratingsError) {
      return fail(400, { message: ratingsError });
    }

    // Check for duplicate name
    const exercises = await getAllExercises();
    if (exercises.some((e: any) => e.name.toLowerCase() === name.toLowerCase())) {
      return fail(400, { message: 'An exercise with this name already exists' });
    }

    try {
      await createExercise(name, description, tip, ratings);
      return { success: true };
    } catch (error) {
      console.error('Error creating exercise:', error);
      return fail(500, { message: 'Failed to create exercise' });
    }
  },

  editExercise: async ({ request }) => {
    const data = await request.formData();
    const id = parseInt(data.get('id') as string);
    const name = (data.get('name') as string)?.trim();
    const description = (data.get('description') as string)?.trim();
    const tip = (data.get('tip') as string)?.trim();
    const muscleRatingsStr = (data.get('muscleRatings') as string) || '{}';
    const { ratings, error: ratingsError } = parseMuscleRatings(muscleRatingsStr);

    if (!id) {
      return fail(400, { message: 'Exercise ID is required' });
    }

    if (!name) {
      return fail(400, { message: 'Exercise name is required' });
    }

    if (name.length < 2) {
      return fail(400, { message: 'Exercise name must be at least 2 characters' });
    }

    if (!description) {
      return fail(400, { message: 'Description is required' });
    }

    if (description.length < 5) {
      return fail(400, { message: 'Description must be at least 5 characters' });
    }

    if (ratingsError) {
      return fail(400, { message: ratingsError });
    }

    // Check for duplicate name (excluding current exercise)
    const currentExercise = await getExercise(id);
    if (!currentExercise) {
      return fail(404, { message: 'Exercise not found' });
    }

    if (currentExercise.name !== name) {
      const exercises = await getAllExercises();
      if (exercises.some((e: any) => e.name.toLowerCase() === name.toLowerCase())) {
        return fail(400, { message: 'An exercise with this name already exists' });
      }
    }

    try {
      await updateExercise(id, name, description, tip, ratings);
      return { success: true };
    } catch (error) {
      console.error('Error updating exercise:', error);
      return fail(500, { message: 'Failed to update exercise' });
    }
  },

  deleteExercise: async ({ request }) => {
    const data = await request.formData();
    const id = parseInt(data.get('id') as string);

    if (!id) {
      return fail(400, { message: 'Exercise ID is required' });
    }

    const exercise = await getExercise(id);
    if (!exercise) {
      return fail(404, { message: 'Exercise not found' });
    }

    try {
      await deleteExercise(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting exercise:', error);
      return fail(500, { message: 'Failed to delete exercise' });
    }
  },

  importCsv: async ({ request }) => {
    const data = await request.formData();
    const file = data.get('csvFile');

    if (!(file instanceof File)) {
      return fail(400, { message: 'Please select a CSV file' });
    }

    const raw = await file.text();
    const rows = parseCsvContent(raw);

    if (rows.length < 2) {
      return fail(400, { message: 'CSV must include a header and at least one data row' });
    }

    const header = rows[0];
    const headerMap = new Map<string, number>();
    header.forEach((name, index) => headerMap.set(name.toLowerCase(), index));

    const nameIdx = headerMap.get('exercise');
    const descriptionIdx = headerMap.get('description');
    const tipIdx = headerMap.get('tip');

    if (nameIdx === undefined) {
      return fail(400, { message: 'CSV header must include: exercise' });
    }

    const exercises = await getAllExercises();
    const existingNames = new Set(exercises.map((e: any) => String(e.name).toLowerCase()));

    let imported = 0;
    let skipped = 0;
    const skippedDetails: string[] = [];

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const name = (row[nameIdx] || '').trim();
      const description = descriptionIdx !== undefined ? (row[descriptionIdx] || '').trim() : '';
      const tip = tipIdx !== undefined ? (row[tipIdx] || '').trim() : '';

      if (!name || name.length < 2) {
        skipped++;
        skippedDetails.push(`Row ${rowIndex + 1}: invalid or missing exercise name`);
        continue;
      }

      if (existingNames.has(name.toLowerCase())) {
        skipped++;
        skippedDetails.push(`Row ${rowIndex + 1} (${name}): duplicate name`);
        continue;
      }

      const ratings = normalizeMuscleRatings({});
      for (const group of ALL_MUSCLE_GROUPS) {
        const idx = headerMap.get(group.toLowerCase());
        if (idx !== undefined) {
          ratings[group] = toRatingValue(row[idx] || '0');
        }
      }

      if (totalMusclePoints(ratings) === 0 || totalMusclePoints(ratings) > MAX_MUSCLE_POINTS) {
        skipped++;
        skippedDetails.push(
          `Row ${rowIndex + 1} (${name}): total muscle points must be between 1 and ${MAX_MUSCLE_POINTS}`
        );
        continue;
      }

      try {
        await createExercise(name, description || name, tip, ratings);
        existingNames.add(name.toLowerCase());
        imported++;
      } catch {
        skipped++;
        skippedDetails.push(`Row ${rowIndex + 1} (${name}): database insert failed`);
      }
    }

    if (imported === 0) {
      return fail(400, {
        message: `No exercises were imported. ${skippedDetails.slice(0, 5).join(' | ')}`,
      });
    }

    const detailMessage = skippedDetails.length > 0 ? ` ${skippedDetails.slice(0, 5).join(' | ')}` : '';
    return {
      success: true,
      message: `Imported ${imported} exercise(s). Skipped ${skipped} row(s).${detailMessage}`,
    };
  }
};
