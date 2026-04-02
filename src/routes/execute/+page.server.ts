import { getAllTrainingPlans } from '$lib/db';

export const load = async () => {
  const plans = await getAllTrainingPlans();
  return { plans };
};
