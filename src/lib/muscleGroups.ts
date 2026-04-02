export const MUSCLE_GROUP_CATEGORIES: Record<string, string[]> = {
  "Upper Body": [
    "Chest",
    "Back",
    "Shoulders",
    "Biceps",
    "Triceps",
    "Forearms",
  ],
  Core: ["Abs", "Lower_Back"],
  "Lower Body": [
    "Glutes",
    "Quads",
    "Hamstrings",
    "Calves",
    "Adductors_Abductors",
  ],
};

export const ALL_MUSCLE_GROUPS = Object.values(MUSCLE_GROUP_CATEGORIES).flat();

export type MuscleRatings = Record<string, number>;

export const MAX_MUSCLE_POINTS = 25;

export const MUSCLE_GROUP_LABELS: Record<string, string> = {
  Chest: 'Chest',
  Back: 'Back',
  Shoulders: 'Shoulders',
  Biceps: 'Biceps',
  Triceps: 'Triceps',
  Forearms: 'Forearms',
  Abs: 'Abs',
  Lower_Back: 'Lower Back',
  Glutes: 'Glutes',
  Quads: 'Quads',
  Hamstrings: 'Hamstrings',
  Calves: 'Calves',
  Adductors_Abductors: 'Adductors / Abductors',
};

export function getMuscleGroupLabel(group: string): string {
  return MUSCLE_GROUP_LABELS[group] || group;
}

export function createDefaultMuscleRatings(): MuscleRatings {
  return ALL_MUSCLE_GROUPS.reduce((acc, group) => {
    acc[group] = 0;
    return acc;
  }, {} as MuscleRatings);
}

export function normalizeMuscleRatings(input: unknown): MuscleRatings {
  const normalized = createDefaultMuscleRatings();

  if (!input || typeof input !== 'object') {
    return normalized;
  }

  for (const group of ALL_MUSCLE_GROUPS) {
    const rawValue = (input as Record<string, unknown>)[group];
    const parsed = Number(rawValue);
    if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 5) {
      normalized[group] = parsed;
    }
  }

  return normalized;
}

export function totalMusclePoints(ratings: MuscleRatings): number {
  return Object.values(ratings).reduce((sum, value) => sum + value, 0);
}

export function ratedMuscleGroups(ratings: MuscleRatings): string[] {
  return Object.entries(ratings)
    .filter(([, value]) => value > 0)
    .map(([group]) => group);
}
