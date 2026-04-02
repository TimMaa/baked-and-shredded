export const MUSCLE_GROUP_CATEGORIES: Record<string, string[]> = {
  "Upper Body": [
    "Chest (Pectorals)",
    "Back (Lats, Rhomboids, Traps)",
    "Shoulders (Deltoids)",
    "Biceps",
    "Triceps",
    "Forearms",
  ],
  Core: ["Abs (Core/Obliques)", "Lower Back (Erector Spinae)"],
  "Lower Body": [
    "Glutes (Gluteus Maximus/Medius)",
    "Quads (Quadriceps)",
    "Hamstrings",
    "Calves",
    "Adductors/Abductors (Inner/Outer Thigh)",
  ],
};

export const ALL_MUSCLE_GROUPS = Object.values(MUSCLE_GROUP_CATEGORIES).flat();

export type MuscleRatings = Record<string, number>;

export const MAX_MUSCLE_POINTS = 25;

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
