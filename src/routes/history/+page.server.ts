import {
  getExerciseDeviationAnalytics,
  getWorkoutAggregateAnalytics,
  getWorkoutSessionHistory,
} from '$lib/db';

const ALLOWED_RANGES = new Set(['all', '7', '30', '90']);

function resolveDays(range: string): number | null {
  if (range === '7') return 7;
  if (range === '30') return 30;
  if (range === '90') return 90;
  return null;
}

export const load = async ({ url }: { url: URL }) => {
  const requestedRange = url.searchParams.get('range') ?? 'all';
  const selectedRange = ALLOWED_RANGES.has(requestedRange) ? requestedRange : 'all';
  const days = resolveDays(selectedRange);

  const [sessionHistory, workoutAnalytics, exerciseAnalytics] = await Promise.all([
    getWorkoutSessionHistory(120, days),
    getWorkoutAggregateAnalytics(50, days),
    getExerciseDeviationAnalytics(50, days),
  ]);

  return {
    sessionHistory,
    workoutAnalytics,
    exerciseAnalytics,
    selectedRange,
  };
};
