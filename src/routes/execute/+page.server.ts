import { getAllWorkouts, getWorkoutWithExercises } from '$lib/db';

export const load = async () => {
  const workouts = await getAllWorkouts();
  const workoutsWithExercises = (
    await Promise.all(workouts.map((workout) => getWorkoutWithExercises(Number(workout.id))))
  ).filter((workout): workout is NonNullable<typeof workout> => Boolean(workout));

  return { plans: workoutsWithExercises, workouts: workoutsWithExercises };
};
