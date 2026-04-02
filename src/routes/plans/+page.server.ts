import { getAllWorkouts, createWorkout, deleteWorkout, getWorkout, getWorkoutWithExercises } from '$lib/db';
import { fail } from '@sveltejs/kit';
import { createDefaultMuscleRatings, normalizeMuscleRatings } from '$lib/muscleGroups';

export const load = async () => {
  const workouts = await getAllWorkouts();

  // Enrich each workout with muscle group coverage from its exercises
  const enrichedWorkouts = await Promise.all(
    workouts.map(async (workout: any) => {
      const workoutWithExercises = await getWorkoutWithExercises(workout.id);

      // Aggregate muscle ratings across exercises by summing per-muscle contribution.
      const focusAreaRatings = createDefaultMuscleRatings();

      if (workoutWithExercises?.exercises && Array.isArray(workoutWithExercises.exercises)) {
        for (const exercise of workoutWithExercises.exercises) {
          if (exercise.focus_areas && typeof exercise.focus_areas === 'object') {
            const normalized = normalizeMuscleRatings(exercise.focus_areas);
            for (const [group, rating] of Object.entries(normalized)) {
              focusAreaRatings[group] = (focusAreaRatings[group] ?? 0) + Number(rating || 0);
            }
          }
        }
      }

      return {
        ...workout,
        exerciseCount: workoutWithExercises?.exercises?.length || 0,
        focusAreaRatings,
      };
    })
  );

  return { plans: enrichedWorkouts };
};

export const actions = {
  createPlan: async ({ request }) => {
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

    // Check for duplicate name
    const workouts = await getAllWorkouts();
    if (workouts.some((w: any) => w.name.toLowerCase() === name.toLowerCase())) {
      return fail(400, { message: 'A workout with this name already exists' });
    }

    try {
      await createWorkout(name, description);
      return { success: true };
    } catch (error) {
      console.error('Error creating workout:', error);
      return fail(500, { message: 'Failed to create workout' });
    }
  },

  deletePlan: async ({ request }) => {
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
