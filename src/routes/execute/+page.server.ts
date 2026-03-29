import { getAllTrainingPlans } from '$lib/db';

export const load = async () => {
  const plans = getAllTrainingPlans();
  return { plans };
};
