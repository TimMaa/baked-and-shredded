import { createWorkout, getAllWorkouts } from '$lib/db';
import { fail } from '@sveltejs/kit';

export const load = async ({ params }) => {
  const workouts = getAllWorkouts();
  return { workouts };
};

export const actions = {
  addWorkout: async ({ request }) => {
    const data = await request.formData();
		const name = data.get('name') as string;
		const description = data.get('description') as string;

    if (!name) {
      return fail(400, { name, missing: true })
    }

    if (!description) {
      return fail(400, { description, missing: true })
    }

    createWorkout(name, description)

    return { success: true }
  }
}