import { getWorkoutWithExercises, getWorkout, updateWorkout as dbUpdateWorkout, addWorkoutExercise, deleteWorkoutExercise, getAllExercises, reorderWorkoutExercises } from '$lib/db';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createDefaultMuscleRatings, normalizeMuscleRatings } from '$lib/muscleGroups';

export const load: PageServerLoad = async ({ params }) => {
  const id = parseInt(params.id);

  if (isNaN(id)) {
    throw new Error('Invalid workout ID');
  }

  const workout = await getWorkoutWithExercises(id);
  const exercises = await getAllExercises();

  if (!workout) {
    throw new Error('Workout not found');
  }

  // Aggregate muscle ratings across exercises by summing per-muscle contribution.
  const focusAreaRatings = createDefaultMuscleRatings();

  if (workout.exercises && Array.isArray(workout.exercises)) {
    for (const exercise of workout.exercises) {
      if (exercise.focus_areas && typeof exercise.focus_areas === 'object') {
        const normalized = normalizeMuscleRatings(exercise.focus_areas);
        for (const [group, rating] of Object.entries(normalized)) {
          focusAreaRatings[group] = (focusAreaRatings[group] ?? 0) + Number(rating || 0);
        }
      }
    }
  }

  return { plan: workout, workouts: exercises, focusAreaRatings };
};

export const actions: Actions = {
  updatePlan: async ({ request, params }) => {
    const id = parseInt(params.id);
    const data = await request.formData();
    const name = (data.get('name') as string)?.trim();
    const description = (data.get('description') as string)?.trim();

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

    try {
      await dbUpdateWorkout(id, name, description);
      return { success: true };
    } catch (error) {
      console.error('Error updating workout:', error);
      return fail(500, { message: 'Failed to update workout' });
    }
  },

  addExercise: async ({ request, params }) => {
    const id = parseInt(params.id);
    const data = await request.formData();
    const exerciseId = parseInt(data.get('exerciseId') as string);
    const sets = parseInt(data.get('sets') as string);
    const targetUnit = (data.get('targetUnit') as string) === 's' ? 's' : 'kg';
    const targetValue = parseFloat(data.get('targetValue') as string);
    const rawReps = parseInt(data.get('reps') as string);
    const reps = targetUnit === 's' ? 1 : rawReps;

    if (!exerciseId || !sets || Number.isNaN(targetValue)) {
      return fail(400, { message: 'Missing required fields' });
    }

    if (sets < 1 || sets > 100) {
      return fail(400, { message: 'Sets must be between 1 and 100' });
    }

    if (targetUnit === 'kg' && (Number.isNaN(reps) || reps < 1 || reps > 1000)) {
      return fail(400, { message: 'Reps must be between 1 and 1000' });
    }

    if (targetUnit === 'kg' && (targetValue < 0 || targetValue > 10000)) {
      return fail(400, { message: 'Weight must be between 0 and 10000 kg' });
    }

    if (targetUnit === 's' && (targetValue < 1 || targetValue > 3600)) {
      return fail(400, { message: 'Time must be between 1 and 3600 seconds' });
    }

    try {
      await addWorkoutExercise(id, exerciseId, sets, reps, targetValue, targetUnit);
      return { success: true };
    } catch (error) {
      console.error('Error adding exercise:', error);
      return fail(500, { message: 'Failed to add exercise' });
    }
  },

  removeExercise: async ({ request }) => {
    const data = await request.formData();
    const exerciseId = parseInt(data.get('exerciseId') as string);

    if (!exerciseId) {
      return fail(400, { message: 'Exercise ID is required' });
    }

    try {
      await deleteWorkoutExercise(exerciseId);
      return { success: true };
    } catch (error) {
      console.error('Error removing exercise:', error);
      return fail(500, { message: 'Failed to remove exercise' });
    }
  },

  reorderExercises: async ({ request, params }) => {
    const workoutId = parseInt(params.id);

    if (Number.isNaN(workoutId)) {
      return fail(400, { message: 'Invalid workout ID' });
    }

    const data = await request.formData();
    const orderedExerciseIdsRaw = data.get('orderedExerciseIds');

    if (typeof orderedExerciseIdsRaw !== 'string') {
      return fail(400, { message: 'Missing exercise order' });
    }

    let orderedExerciseIds: number[] = [];
    try {
      const parsedIds = JSON.parse(orderedExerciseIdsRaw);
      if (!Array.isArray(parsedIds)) {
        return fail(400, { message: 'Invalid exercise order payload' });
      }

      orderedExerciseIds = parsedIds
        .map((value) => Number.parseInt(String(value), 10))
        .filter((value) => Number.isInteger(value) && value > 0);
    } catch {
      return fail(400, { message: 'Exercise order must be valid JSON' });
    }

    if (orderedExerciseIds.length === 0) {
      return fail(400, { message: 'Exercise order cannot be empty' });
    }

    if (new Set(orderedExerciseIds).size !== orderedExerciseIds.length) {
      return fail(400, { message: 'Exercise order cannot contain duplicates' });
    }

    const workout = await getWorkoutWithExercises(workoutId);
    if (!workout) {
      return fail(404, { message: 'Workout not found' });
    }

    const existingExerciseIds = (workout.exercises ?? []).map((exercise) => Number(exercise.id));
    if (existingExerciseIds.length !== orderedExerciseIds.length) {
      return fail(400, { message: 'Exercise order does not match current workout items' });
    }

    const existingIdSet = new Set(existingExerciseIds);
    if (!orderedExerciseIds.every((id) => existingIdSet.has(id))) {
      return fail(400, { message: 'Exercise order contains invalid items' });
    }

    try {
      await reorderWorkoutExercises(workoutId, orderedExerciseIds);
      return { success: true, message: 'Exercise order updated' };
    } catch (error) {
      console.error('Error reordering exercises:', error);
      return fail(500, { message: 'Failed to update exercise order' });
    }
  }
};
