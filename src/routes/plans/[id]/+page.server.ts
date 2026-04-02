import { getTrainingPlanWithExercises, getTrainingPlan, updateTrainingPlan as dbUpdateTrainingPlan, addPlanExercise, deletePlanExercise, getAllWorkouts } from '$lib/db';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createDefaultMuscleRatings, normalizeMuscleRatings } from '$lib/muscleGroups';

export const load: PageServerLoad = async ({ params }) => {
  const id = parseInt(params.id);

  if (isNaN(id)) {
    throw new Error('Invalid plan ID');
  }

  const plan = await getTrainingPlanWithExercises(id);
  const workouts = await getAllWorkouts();

  if (!plan) {
    throw new Error('Training plan not found');
  }

  // Aggregate muscle ratings across exercises using max rating per muscle.
  const focusAreaRatings = createDefaultMuscleRatings();

  if (plan.exercises && Array.isArray(plan.exercises)) {
    for (const exercise of plan.exercises) {
      if (exercise.focus_areas && typeof exercise.focus_areas === 'object') {
        const normalized = normalizeMuscleRatings(exercise.focus_areas);
        for (const [group, rating] of Object.entries(normalized)) {
          if (rating > focusAreaRatings[group]) {
            focusAreaRatings[group] = rating;
          }
        }
      }
    }
  }

  return { plan, workouts, focusAreaRatings };
};

export const actions: Actions = {
  updatePlan: async ({ request, params }) => {
    const id = parseInt(params.id);
    const data = await request.formData();
    const name = (data.get('name') as string)?.trim();
    const description = (data.get('description') as string)?.trim();

    if (!name) {
      return fail(400, { message: 'Plan name is required' });
    }

    if (name.length < 2) {
      return fail(400, { message: 'Plan name must be at least 2 characters' });
    }

    if (!description) {
      return fail(400, { message: 'Description is required' });
    }

    if (description.length < 5) {
      return fail(400, { message: 'Description must be at least 5 characters' });
    }

    try {
      await dbUpdateTrainingPlan(id, name, description);
      return { success: true };
    } catch (error) {
      console.error('Error updating plan:', error);
      return fail(500, { message: 'Failed to update plan' });
    }
  },

  addExercise: async ({ request, params }) => {
    const id = parseInt(params.id);
    const data = await request.formData();
    const workoutId = parseInt(data.get('workoutId') as string);
    const sets = parseInt(data.get('sets') as string);
    const reps = parseInt(data.get('reps') as string);
    const weight = data.get('weight') ? parseFloat(data.get('weight') as string) : undefined;

    if (!workoutId || !sets || !reps) {
      return fail(400, { message: 'Missing required fields' });
    }

    if (sets < 1 || sets > 100) {
      return fail(400, { message: 'Sets must be between 1 and 100' });
    }

    if (reps < 1 || reps > 1000) {
      return fail(400, { message: 'Reps must be between 1 and 1000' });
    }

    if (weight !== undefined && (weight < 0 || weight > 10000)) {
      return fail(400, { message: 'Weight must be between 0 and 10000' });
    }

    try {
      await addPlanExercise(id, workoutId, sets, reps, weight);
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
      await deletePlanExercise(exerciseId);
      return { success: true };
    } catch (error) {
      console.error('Error removing exercise:', error);
      return fail(500, { message: 'Failed to remove exercise' });
    }
  }
};
