import { getAllTrainingPlans, createTrainingPlan, deleteTrainingPlan, getTrainingPlan, getTrainingPlanWithWorkouts, getWorkout } from '$lib/db';
import { fail } from '@sveltejs/kit';

export const load = async () => {
  const plans = await getAllTrainingPlans();

  // Enrich each plan with muscle group coverage
  const enrichedPlans = await Promise.all(
    plans.map(async (plan: any) => {
      const planWithWorkouts = await getTrainingPlanWithWorkouts(plan.id);

      // Collect all focus areas from workouts in this plan
      const allFocusAreas: string[] = [];

      if (planWithWorkouts?.days && Array.isArray(planWithWorkouts.days)) {
        for (const day of planWithWorkouts.days) {
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

      return {
        ...plan,
        focusAreas: allFocusAreas
      };
    })
  );

  return { plans: enrichedPlans };
};

export const actions = {
  createPlan: async ({ request }) => {
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

    // Check for duplicate name
    const plans = await getAllTrainingPlans();
    if (plans.some((p: any) => p.name.toLowerCase() === name.toLowerCase())) {
      return fail(400, { message: 'A training plan with this name already exists' });
    }

    try {
      await createTrainingPlan(name, description);
      return { success: true };
    } catch (error) {
      console.error('Error creating training plan:', error);
      return fail(500, { message: 'Failed to create training plan' });
    }
  },

  deletePlan: async ({ request }) => {
    const data = await request.formData();
    const id = parseInt(data.get('id') as string);

    if (!id) {
      return fail(400, { message: 'Plan ID is required' });
    }

    const plan = await getTrainingPlan(id);
    if (!plan) {
      return fail(404, { message: 'Training plan not found' });
    }

    try {
      await deleteTrainingPlan(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting training plan:', error);
      return fail(500, { message: 'Failed to delete training plan' });
    }
  }
};
