import { createWorkout, getAllWorkouts, updateWorkout, deleteWorkout, getWorkout } from '$lib/db';
import { fail } from '@sveltejs/kit';
import {
  ALL_MUSCLE_GROUPS,
  MAX_MUSCLE_POINTS,
  normalizeMuscleRatings,
  totalMusclePoints,
  type MuscleRatings,
} from '$lib/muscleGroups';

export const load = async () => {
  const workouts = await getAllWorkouts();
  return { workouts };
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

export const actions = {
  addWorkout: async ({ request }) => {
    const data = await request.formData();
    const name = (data.get('name') as string)?.trim();
    const description = (data.get('description') as string)?.trim();
    const tip = (data.get('tip') as string)?.trim();
    const muscleRatingsStr = (data.get('muscleRatings') as string) || '{}';
    const { ratings, error: ratingsError } = parseMuscleRatings(muscleRatingsStr);

    if (!name) {
      return fail(400, { message: 'Workout name is required' });
    }

    if (name.length < 2) {
      return fail(400, { message: 'Workout name must be at least 2 characters' });
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
    const workouts = await getAllWorkouts();
    if (workouts.some((w: any) => w.name.toLowerCase() === name.toLowerCase())) {
      return fail(400, { message: 'A workout with this name already exists' });
    }

    try {
      await createWorkout(name, description, tip, ratings);
      return { success: true };
    } catch (error) {
      console.error('Error creating workout:', error);
      return fail(500, { message: 'Failed to create workout' });
    }
  },

  editWorkout: async ({ request }) => {
    const data = await request.formData();
    const id = parseInt(data.get('id') as string);
    const name = (data.get('name') as string)?.trim();
    const description = (data.get('description') as string)?.trim();
    const tip = (data.get('tip') as string)?.trim();
    const muscleRatingsStr = (data.get('muscleRatings') as string) || '{}';
    const { ratings, error: ratingsError } = parseMuscleRatings(muscleRatingsStr);

    if (!id) {
      return fail(400, { message: 'Workout ID is required' });
    }

    if (!name) {
      return fail(400, { message: 'Workout name is required' });
    }

    if (name.length < 2) {
      return fail(400, { message: 'Workout name must be at least 2 characters' });
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

    // Check for duplicate name (excluding current workout)
    const currentWorkout = await getWorkout(id);
    if (!currentWorkout) {
      return fail(404, { message: 'Workout not found' });
    }

    if (currentWorkout.name !== name) {
      const workouts = await getAllWorkouts();
      if (workouts.some((w: any) => w.name.toLowerCase() === name.toLowerCase())) {
        return fail(400, { message: 'A workout with this name already exists' });
      }
    }

    try {
      await updateWorkout(id, name, description, tip, ratings);
      return { success: true };
    } catch (error) {
      console.error('Error updating workout:', error);
      return fail(500, { message: 'Failed to update workout' });
    }
  },

  deleteWorkout: async ({ request }) => {
    const data = await request.formData();
    const id = parseInt(data.get('id') as string);

    if (!id) {
      return fail(400, { message: 'Workout ID is required' });
    }

    const workout = await getWorkout(id);
    if (!workout) {
      return fail(404, { message: 'Workout not found' });
    }

    try {
      await deleteWorkout(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting workout:', error);
      return fail(500, { message: 'Failed to delete workout' });
    }
  }
};