import { getAllWorkouts } from '$lib/db';

export const load = async () => {
  const plans = await getAllWorkouts();
  return { plans, workouts: plans };
};
