import { createWorkout, getAllWorkouts, updateWorkout, deleteWorkout, getWorkout } from '$lib/db';
import { fail } from '@sveltejs/kit';

export const load = async () => {
  const workouts = getAllWorkouts();
  return { workouts };
};

export const actions = {
  addWorkout: async ({ request }) => {
    const data = await request.formData();
    const name = (data.get('name') as string)?.trim();
    const description = (data.get('description') as string)?.trim();
    const focusAreasStr = (data.get('focusAreas') as string) || '[]';
    let focusAreas: string[] = [];

    try {
      focusAreas = JSON.parse(focusAreasStr);
    } catch (e) {
      focusAreas = [];
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

    if (focusAreas.length === 0) {
      return fail(400, { message: 'Please select at least one muscle group' });
    }

    // Check for duplicate name
    const workouts = await getAllWorkouts();
    if (workouts.some((w: any) => w.name.toLowerCase() === name.toLowerCase())) {
      return fail(400, { message: 'A workout with this name already exists' });
    }

    try {
      await createWorkout(name, description, focusAreas);
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
    const focusAreasStr = (data.get('focusAreas') as string) || '[]';
    let focusAreas: string[] = [];

    try {
      focusAreas = JSON.parse(focusAreasStr);
    } catch (e) {
      focusAreas = [];
    }

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

    if (focusAreas.length === 0) {
      return fail(400, { message: 'Please select at least one muscle group' });
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
      await updateWorkout(id, name, description, focusAreas);
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