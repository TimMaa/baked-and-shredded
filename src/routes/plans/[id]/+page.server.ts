import { getTrainingPlanWithWorkouts, getTrainingPlan, updateTrainingPlan as dbUpdateTrainingPlan, addPlanDay, addPlanWorkout, deletePlanWorkout, getAllWorkouts, getWorkout } from '$lib/db';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const id = parseInt(params.id);

  if (isNaN(id)) {
    throw new Error('Invalid plan ID');
  }

  const plan = await getTrainingPlanWithWorkouts(id);
  const workouts = await getAllWorkouts();

  if (!plan) {
    throw new Error('Training plan not found');
  }

  // Collect focus areas from all workouts in the plan
  const allFocusAreas: string[] = [];

  if (plan.days && Array.isArray(plan.days)) {
    for (const day of plan.days) {
      if (day.workouts) {
        try {
          const workoutsArray = JSON.parse(`[${day.workouts}]`);
          for (const workout of workoutsArray) {
            const fullWorkout = await getWorkout(workout.workoutId);
            if (fullWorkout && fullWorkout.focus_areas && Array.isArray(fullWorkout.focus_areas)) {
              allFocusAreas.push(...fullWorkout.focus_areas);
            }
          }
        } catch (e) {
          // Skip parsing errors
        }
      }
    }
  }

  return { plan, workouts, focusAreas: allFocusAreas };
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

  addDay: async ({ request, params }) => {
    const id = parseInt(params.id);
    const data = await request.formData();
    const dayOfWeek = data.get('day') as string;

    if (!dayOfWeek) {
      return fail(400, { message: 'Day is required' });
    }

    try {
      await addPlanDay(id, dayOfWeek);
      return { success: true };
    } catch (error) {
      console.error('Error adding day:', error);
      if ((error as any)?.message?.includes('UNIQUE constraint failed')) {
        return fail(400, { message: 'This day has already been added to the plan' });
      }
      return fail(500, { message: 'Failed to add day' });
    }
  },

  addWorkoutToDay: async ({ request }) => {
    const data = await request.formData();
    const planDayId = parseInt(data.get('planDayId') as string);
    const workoutId = parseInt(data.get('workoutId') as string);
    const targetReps = parseInt(data.get('targetReps') as string);
    const targetWeight = data.get('targetWeight') ? parseFloat(data.get('targetWeight') as string) : undefined;

    if (!planDayId || !workoutId || !targetReps) {
      return fail(400, { message: 'Missing required fields' });
    }

    if (targetReps < 1 || targetReps > 1000) {
      return fail(400, { message: 'Target reps must be between 1 and 1000' });
    }

    if (targetWeight !== undefined && (targetWeight < 0 || targetWeight > 10000)) {
      return fail(400, { message: 'Target weight must be between 0 and 10000' });
    }

    try {
      await addPlanWorkout(planDayId, workoutId, targetReps, targetWeight);
      return { success: true };
    } catch (error) {
      console.error('Error adding workout to day:', error);
      return fail(500, { message: 'Failed to add workout' });
    }
  },

  removeWorkoutFromDay: async ({ request }) => {
    const data = await request.formData();
    const planWorkoutId = parseInt(data.get('planWorkoutId') as string);

    if (!planWorkoutId) {
      return fail(400, { message: 'Workout ID is required' });
    }

    try {
      await deletePlanWorkout(planWorkoutId);
      return { success: true };
    } catch (error) {
      console.error('Error removing workout:', error);
      return fail(500, { message: 'Failed to remove workout' });
    }
  }
};
