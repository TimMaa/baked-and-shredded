export type MuscleRatings = Record<string, number>;

export interface Exercise {
  id?: number;
  name: string;
  description: string | null;
  tip: string | null;
  focusAreas: MuscleRatings;
  equipment: string[] | null;
  createdAt: string;
}

export interface Workout {
  id?: number;
  name: string;
  description: string | null;
  createdAt: string;
  archivedAt: string | null;
}

export interface WorkoutExercise {
  id?: number;
  workoutId: number;
  exerciseId: number;
  sets: number;
  targetReps: number;
  targetWeight: number | null;
  targetUnit: "kg" | "s";
  orderIndex: number;
  createdAt: string;
}

export interface Session {
  id?: number;
  workoutId: number;
  totalSetsPlanned: number;
  setsCompleted: number;
  startedAt: string;
  completedAt: string | null;
  rpe: number | null;
  notes: string | null;
}

export interface SessionSet {
  id?: number;
  sessionId: number;
  workoutExerciseId: number;
  exerciseId: number;
  setNumber: number;
  targetReps: number;
  targetWeight: number | null;
  targetUnit: "kg" | "s";
  actualReps: number;
  actualWeight: number | null;
  status: "expected" | "deviation";
  completedAt: string;
}

export interface WorkoutWithExercises extends Workout {
  exercises: (WorkoutExercise & { exerciseName: string; focusAreas: MuscleRatings })[];
}

export interface SessionHistory {
  sessionId: number;
  workoutId: number;
  workoutName: string;
  startedAt: string;
  completedAt: string | null;
  totalSetsPlanned: number;
  setsCompleted: number;
  expectedSets: number;
  deviationSets: number;
  completionRatePct: number;
  adherenceRatePct: number;
  durationSeconds: number;
}

export interface WorkoutAnalytics {
  workoutId: number;
  workoutName: string;
  sessionsCount: number;
  totalSetsLogged: number;
  avgCompletionRatePct: number;
  avgAdherenceRatePct: number;
  bestAdherenceRatePct: number;
  lastCompletedAt: string | null;
}

export interface ExerciseDeviationAnalytics {
  exerciseId: number;
  exerciseName: string;
  totalSetsLogged: number;
  expectedSets: number;
  deviationSets: number;
  deviationRatePct: number;
  avgWeightDelta: number | null;
  avgTimeDeltaSeconds: number | null;
}

export interface Activity {
  id?: number;
  name: string;
  durationMinutes: number;
  muscleGroups: MuscleRatings;
  performedAt: string;
  notes: string | null;
}

export interface PersonalRecord {
  id?: number;
  exerciseId: number;
  type: "weight" | "reps" | "time";
  value: number;
  sessionId: number;
  achievedAt: string;
}

export interface UserPreferences {
  id: 1;
  availableEquipment: string;
  restTimerSeconds: number;
  weeklyFrequencyGoal: number;
}
