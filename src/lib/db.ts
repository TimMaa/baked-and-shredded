import { openDB, type IDBPDatabase } from "idb";
import type {
  Exercise,
  Workout,
  WorkoutExercise,
  Session,
  SessionSet,
  Activity,
  PersonalRecord,
  UserPreferences,
} from "@/types";

interface BakedDB {
  exercises: {
    key: number;
    value: Exercise;
  };
  workouts: {
    key: number;
    value: Workout;
  };
  workoutExercises: {
    key: number;
    value: WorkoutExercise;
    indexes: { byWorkout: number; byExercise: number };
  };
  sessions: {
    key: number;
    value: Session;
    indexes: { byWorkout: number; byStartedAt: string };
  };
  sessionSets: {
    key: number;
    value: SessionSet;
    indexes: { bySession: number; byExercise: number };
  };
  activities: {
    key: number;
    value: Activity;
    indexes: { byPerformedAt: string };
  };
  personalRecords: {
    key: number;
    value: PersonalRecord;
    indexes: { byExercise: number };
  };
  userPreferences: {
    key: number;
    value: UserPreferences;
  };
}

const DB_NAME = "baked-and-shredded";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<BakedDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<BakedDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BakedDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const exercises = db.createObjectStore("exercises", {
            keyPath: "id",
            autoIncrement: true,
          });
          void exercises;

          const workouts = db.createObjectStore("workouts", {
            keyPath: "id",
            autoIncrement: true,
          });
          void workouts;

          const workoutExercises = db.createObjectStore("workoutExercises", {
            keyPath: "id",
            autoIncrement: true,
          });
          workoutExercises.createIndex("byWorkout", "workoutId");
          workoutExercises.createIndex("byExercise", "exerciseId");

          const sessions = db.createObjectStore("sessions", {
            keyPath: "id",
            autoIncrement: true,
          });
          sessions.createIndex("byWorkout", "workoutId");
          sessions.createIndex("byStartedAt", "startedAt");

          const sessionSets = db.createObjectStore("sessionSets", {
            keyPath: "id",
            autoIncrement: true,
          });
          sessionSets.createIndex("bySession", "sessionId");
          sessionSets.createIndex("byExercise", "exerciseId");
        }

        if (oldVersion < 2) {
          const activities = db.createObjectStore("activities", {
            keyPath: "id",
            autoIncrement: true,
          });
          activities.createIndex("byPerformedAt", "performedAt");

          const personalRecords = db.createObjectStore("personalRecords", {
            keyPath: "id",
            autoIncrement: true,
          });
          personalRecords.createIndex("byExercise", "exerciseId");

          db.createObjectStore("userPreferences", {
            keyPath: "id",
          });
        }
      },
    });
  }
  return dbPromise;
}

// --- Exercises ---

export async function createExercise(
  exercise: Omit<Exercise, "id" | "createdAt">
): Promise<number> {
  const db = await getDb();
  return db.add("exercises", {
    ...exercise,
    createdAt: new Date().toISOString(),
  } as Exercise) as Promise<number>;
}

export async function getAllExercises(): Promise<Exercise[]> {
  const db = await getDb();
  const all = await db.getAll("exercises");
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getExercise(id: number): Promise<Exercise | undefined> {
  const db = await getDb();
  return db.get("exercises", id);
}

export async function updateExercise(exercise: Exercise): Promise<void> {
  const db = await getDb();
  await db.put("exercises", exercise);
}

export async function deleteExercise(id: number): Promise<void> {
  const db = await getDb();
  await db.delete("exercises", id);
}

// --- Workouts ---

export async function createWorkout(
  workout: Omit<Workout, "id" | "createdAt">
): Promise<number> {
  const db = await getDb();
  return db.add("workouts", {
    ...workout,
    createdAt: new Date().toISOString(),
  } as Workout) as Promise<number>;
}

export async function getAllWorkouts(): Promise<Workout[]> {
  const db = await getDb();
  const all = await db.getAll("workouts");
  return all.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getWorkout(id: number): Promise<Workout | undefined> {
  const db = await getDb();
  return db.get("workouts", id);
}

export async function updateWorkout(workout: Workout): Promise<void> {
  const db = await getDb();
  await db.put("workouts", workout);
}

export async function deleteWorkout(id: number): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["workouts", "workoutExercises", "sessions", "sessionSets"], "readwrite");
  await tx.objectStore("workouts").delete(id);
  const weIdx = tx.objectStore("workoutExercises").index("byWorkout");
  for (const we of await weIdx.getAll(id)) {
    await tx.objectStore("workoutExercises").delete(we.id!);
  }
  const sessIdx = tx.objectStore("sessions").index("byWorkout");
  for (const sess of await sessIdx.getAll(id)) {
    const setsIdx = tx.objectStore("sessionSets").index("bySession");
    for (const set of await setsIdx.getAll(sess.id!)) {
      await tx.objectStore("sessionSets").delete(set.id!);
    }
    await tx.objectStore("sessions").delete(sess.id!);
  }
  await tx.done;
}

// --- Workout Exercises ---

export async function addWorkoutExercise(
  we: Omit<WorkoutExercise, "id" | "createdAt">
): Promise<number> {
  const db = await getDb();
  return db.add("workoutExercises", {
    ...we,
    createdAt: new Date().toISOString(),
  } as WorkoutExercise) as Promise<number>;
}

export async function getWorkoutExercises(
  workoutId: number
): Promise<WorkoutExercise[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex("workoutExercises", "byWorkout", workoutId);
  return all.sort((a, b) => a.orderIndex - b.orderIndex);
}

export async function deleteWorkoutExercise(id: number): Promise<void> {
  const db = await getDb();
  await db.delete("workoutExercises", id);
}

export async function updateWorkoutExercise(we: WorkoutExercise): Promise<void> {
  const db = await getDb();
  await db.put("workoutExercises", we);
}

export async function reorderWorkoutExercises(
  workoutId: number,
  orderedIds: number[]
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("workoutExercises", "readwrite");
  const store = tx.objectStore("workoutExercises");
  for (let i = 0; i < orderedIds.length; i++) {
    const item = await store.get(orderedIds[i]);
    if (item && item.workoutId === workoutId) {
      item.orderIndex = i;
      await store.put(item);
    }
  }
  await tx.done;
}

// --- Sessions ---

export async function createSession(
  workoutId: number,
  totalSetsPlanned: number
): Promise<number> {
  const db = await getDb();
  return db.add("sessions", {
    workoutId,
    totalSetsPlanned,
    setsCompleted: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
  } as Session) as Promise<number>;
}

export async function completeSession(
  sessionId: number,
  setsCompleted: number
): Promise<void> {
  const db = await getDb();
  const session = await db.get("sessions", sessionId);
  if (session) {
    session.setsCompleted = setsCompleted;
    session.completedAt = new Date().toISOString();
    await db.put("sessions", session);
  }
}

export async function deleteSession(sessionId: number): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["sessions", "sessionSets"], "readwrite");
  const setsIdx = tx.objectStore("sessionSets").index("bySession");
  for (const set of await setsIdx.getAll(sessionId)) {
    await tx.objectStore("sessionSets").delete(set.id!);
  }
  await tx.objectStore("sessions").delete(sessionId);
  await tx.done;
}

// --- Session Sets ---

export async function logSessionSet(
  set: Omit<SessionSet, "id" | "completedAt">
): Promise<number> {
  const db = await getDb();
  return db.add("sessionSets", {
    ...set,
    completedAt: new Date().toISOString(),
  } as SessionSet) as Promise<number>;
}

export async function getSessionSets(sessionId: number): Promise<SessionSet[]> {
  const db = await getDb();
  return db.getAllFromIndex("sessionSets", "bySession", sessionId);
}

// --- Active Session ---

export async function getActiveSession(): Promise<Session | undefined> {
  const db = await getDb();
  const all = await db.getAll("sessions");
  return all.find((s) => s.completedAt === null);
}

// --- Analytics ---

export async function getAllSessions(): Promise<Session[]> {
  const db = await getDb();
  return db.getAll("sessions");
}

export async function getAllSessionSets(): Promise<SessionSet[]> {
  const db = await getDb();
  return db.getAll("sessionSets");
}

// --- Activities ---

export async function createActivity(
  activity: Omit<Activity, "id">
): Promise<number> {
  const db = await getDb();
  return db.add("activities", activity as Activity) as Promise<number>;
}

export async function getAllActivities(): Promise<Activity[]> {
  const db = await getDb();
  const all = await db.getAll("activities");
  return all.sort(
    (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
  );
}

export async function deleteActivity(id: number): Promise<void> {
  const db = await getDb();
  await db.delete("activities", id);
}

// --- Personal Records ---

export async function addPersonalRecord(
  record: Omit<PersonalRecord, "id">
): Promise<number> {
  const db = await getDb();
  return db.add("personalRecords", record as PersonalRecord) as Promise<number>;
}

export async function getPersonalRecords(exerciseId: number): Promise<PersonalRecord[]> {
  const db = await getDb();
  return db.getAllFromIndex("personalRecords", "byExercise", exerciseId);
}

export async function getAllPersonalRecords(): Promise<PersonalRecord[]> {
  const db = await getDb();
  return db.getAll("personalRecords");
}

// --- User Preferences ---

const DEFAULT_PREFERENCES: UserPreferences = {
  id: 1,
  availableEquipment: "",
  restTimerSeconds: 90,
  weeklyFrequencyGoal: 3,
};

export async function getUserPreferences(): Promise<UserPreferences> {
  const db = await getDb();
  const prefs = await db.get("userPreferences", 1);
  return prefs ?? DEFAULT_PREFERENCES;
}

export async function saveUserPreferences(prefs: UserPreferences): Promise<void> {
  const db = await getDb();
  await db.put("userPreferences", { ...prefs, id: 1 });
}
