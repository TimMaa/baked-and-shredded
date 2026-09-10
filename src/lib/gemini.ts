import { GoogleGenAI } from "@google/genai";
import { ALL_MUSCLE_GROUPS } from "@/lib/muscleGroups";
import type { MuscleRatings } from "@/types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

function getClient() {
  return new GoogleGenAI({ apiKey: API_KEY });
}

export function isConfigured(): boolean {
  return !!API_KEY;
}

// --- Feature 1: Exercise Classification ---

export interface ExerciseClassification {
  description: string;
  tip: string;
  focusAreas: MuscleRatings;
  unilateral: boolean;
}

export async function classifyExercise(name: string): Promise<ExerciseClassification> {
  const client = getClient();
  const muscleList = ALL_MUSCLE_GROUPS.join(", ");

  const interaction = await client.interactions.create({
    model: "gemini-3.1-flash-lite",
    input: [
      {
        type: "text",
        text: `You are a strength and conditioning expert. For the exercise "${name}", return ONLY a JSON object (no markdown, no code fences, no explanation):

{
  "description": "One sentence describing the exercise and its primary benefit",
  "tip": "One practical execution tip for correct form",
  "focusAreas": { "Chest": 0, "Back": 0, ... },
  "unilateral": false
}

focusAreas must include ALL of these muscle groups: ${muscleList}
Rate each muscle group 0-5 (0=not involved, 5=primary mover).
The total of all ratings should not exceed 25.
Be accurate about which muscles are primary movers vs stabilizers.
Set "unilateral" to true if the exercise works one side/limb at a time (e.g. single-arm row, single-leg RDL, dead bug), false for bilateral movements (e.g. squat, bench press).`,
      },
    ],
  });

  const text = (interaction.output_text ?? "").trim();
  return parseClassification(text);
}

function parseClassification(text: string): ExerciseClassification {
  const jsonStr = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(jsonStr);

  const focusAreas: MuscleRatings = {};
  for (const group of ALL_MUSCLE_GROUPS) {
    const val = Number(parsed.focusAreas?.[group]);
    focusAreas[group] = Number.isInteger(val) && val >= 0 && val <= 5 ? val : 0;
  }

  return {
    description: parsed.description || "",
    tip: parsed.tip || "",
    focusAreas,
    unilateral: parsed.unilateral === true,
  };
}

// --- Feature 1b: Bulk Exercise Re-analysis ---

export interface BulkAnalysisResult {
  exercises: {
    name: string;
    description: string;
    tip: string;
    focusAreas: MuscleRatings;
    unilateral: boolean;
  }[];
}

export async function reanalyzeExercises(
  exercises: { id: number; name: string }[]
): Promise<BulkAnalysisResult> {
  const client = getClient();
  const muscleList = ALL_MUSCLE_GROUPS.join(", ");

  const interaction = await client.interactions.create({
    model: "gemini-3.1-flash-lite",
    input: [
      {
        type: "text",
        text: `You are a strength and conditioning expert. Analyze these exercises and return improved descriptions, tips, and muscle group ratings.

Exercises:
${exercises.map((e) => `- "${e.name}"`).join("\n")}

Return ONLY a JSON object (no markdown, no code fences, no explanation):
{"exercises":[{"name":"<exact name>","description":"One sentence describing the exercise","tip":"One practical form tip","focusAreas":{"Chest":0,"Back":0,...},"unilateral":false}]}

focusAreas must include ALL of these muscle groups: ${muscleList}
Rate each 0-5 (0=not involved, 5=primary mover). Total per exercise should not exceed 25.
Set "unilateral" to true if the exercise works one side/limb at a time (e.g. single-arm row, single-leg RDL, dead bug), false for bilateral movements.
Use the EXACT exercise names as given above.`,
      },
    ],
  });

  const text = (interaction.output_text ?? "").trim();
  if (!text) throw new Error("Empty response from Gemini");

  const jsonStr = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(jsonStr);

  return {
    exercises: (parsed.exercises || []).map((ex: any) => {
      const focusAreas: MuscleRatings = {};
      for (const group of ALL_MUSCLE_GROUPS) {
        const val = Number(ex.focusAreas?.[group]);
        focusAreas[group] = Number.isInteger(val) && val >= 0 && val <= 5 ? val : 0;
      }
      return {
        name: ex.name || "",
        description: ex.description || "",
        tip: ex.tip || "",
        focusAreas,
        unilateral: ex.unilateral === true,
      };
    }),
  };
}

// --- Feature 2: Workout Recommendation ---

export interface WorkoutRecommendation {
  workoutId: number;
  reason: string;
}

interface RecommendationInput {
  workouts: { id: number; name: string; muscleGroups: string[] }[];
  recentSessions: { workoutName: string; daysAgo: number }[];
}

export async function suggestNextWorkout(
  input: RecommendationInput
): Promise<WorkoutRecommendation> {
  const client = getClient();

  const interaction = await client.interactions.create({
    model: "gemini-3.1-flash-lite",
    input: [
      {
        type: "text",
        text: `You are a fitness coach. Based on this user's workout data, recommend which workout they should do TODAY.

Available workouts:
${input.workouts.map((w) => `- ID ${w.id}: "${w.name}" (targets: ${w.muscleGroups.join(", ")})`).join("\n")}

Recent training history (most recent first):
${input.recentSessions.length > 0 ? input.recentSessions.map((s) => `- "${s.workoutName}" — ${s.daysAgo} day(s) ago`).join("\n") : "No recent sessions."}

Consider recovery time (48-72h per muscle group), balanced training, and freshness.

Return ONLY a JSON object (no markdown, no code fences):
{
  "workoutId": <id of recommended workout>,
  "reason": "One sentence explaining why this is the best choice today"
}`,
      },
    ],
  });

  const text = (interaction.output_text ?? "").trim();
  const jsonStr = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(jsonStr);
  return {
    workoutId: parsed.workoutId,
    reason: parsed.reason || "Recommended based on your training history.",
  };
}

// --- Feature 3: Natural Language Workout Builder ---

export interface GeneratedWorkoutExercise {
  existingId?: number;
  newExercise?: {
    name: string;
    description: string;
    tip: string;
    focusAreas: MuscleRatings;
    equipment: string[] | null;
    unilateral: boolean;
  };
  sets: number;
  targetReps: number;
  targetWeight: number | null;
  targetUnit: "kg" | "s";
}

export interface GeneratedWorkout {
  name: string;
  description: string;
  exercises: GeneratedWorkoutExercise[];
}

interface BuilderInput {
  prompt: string;
  availableExercises: {
    id: number;
    name: string;
    muscleGroups: string[];
    recentWeightKg?: number | null;
    bestWeightKg?: number | null;
  }[];
  availableEquipment?: string;
}

export async function generateWorkout(input: BuilderInput): Promise<GeneratedWorkout> {
  const client = getClient();
  const muscleList = ALL_MUSCLE_GROUPS.join(", ");

  const librarySection = input.availableExercises.length > 0
    ? `Existing exercise library (prefer these where they fit, reference by existingId):
${input.availableExercises.map((e) => {
  const hist = e.recentWeightKg != null || e.bestWeightKg != null
    ? ` [logged weight — recent: ${e.recentWeightKg ?? "none"}kg, best: ${e.bestWeightKg ?? "none"}kg]`
    : "";
  return `- ID ${e.id}: "${e.name}" (${e.muscleGroups.join(", ")})${hist}`;
}).join("\n")}`
    : "The user has no exercises yet — create all exercises fresh using newExercise.";

  const equipmentSection = input.availableEquipment
    ? `\nThe user has this equipment available: "${input.availableEquipment}"
ONLY suggest exercises that can be performed with this equipment or bodyweight. Do not suggest exercises requiring equipment the user doesn't have.`
    : "";

  const interaction = await client.interactions.create({
    model: "gemini-3.1-flash-lite",
    input: [
      {
        type: "text",
        text: `You are a strength and conditioning coach. Create a workout based on this request: "${input.prompt}"
${equipmentSection}

${librarySection}

Return ONLY a JSON object (no markdown, no code fences):
{
  "name": "Short workout name",
  "description": "One sentence describing the workout focus",
  "exercises": [
    { "existingId": 42, "sets": 3, "targetReps": 10, "targetWeight": 20, "targetUnit": "kg" },
    { "newExercise": { "name": "Exercise Name", "description": "One sentence what it works", "tip": "One form cue", "focusAreas": { "Chest": 0, "Back": 0, ... }, "equipment": ["dumbbell"], "unilateral": false }, "sets": 3, "targetReps": 10, "targetWeight": 20, "targetUnit": "kg" }
  ]
}

Rules:
- Pick 4-8 exercises that match the request
- Use "existingId" when a suitable exercise is already in the library
- Use "newExercise" to introduce exercises not in the library that fit the workout
- For newExercise.focusAreas: include ALL these muscle groups rated 0-5: ${muscleList}
- For newExercise.equipment: list required equipment as short strings (e.g. ["dumbbell", "bench"]), or null for bodyweight-only
- For newExercise.unilateral: true if the exercise works one side/limb at a time (e.g. single-arm row, single-leg RDL), false otherwise
- Use targetUnit "s" for timed exercises (planks, holds), "kg" for everything else
- For timed exercises: targetReps should be 1, targetWeight is the time in seconds
- targetWeight guidance (give a real number whenever you reasonably can — null should be rare):
  - If the exercise library above shows a logged weight for this exercise, anchor your estimate to it (use their recent working weight, or progress slightly beyond it if the request implies progression)
  - Otherwise, estimate a conservative starting weight based on typical loads for the movement and any experience signal in the user's request (e.g. "beginner"/"first time" → light; "advanced"/"experienced" → heavier); default to a light, beginner-safe estimate when experience is unclear
  - For pure bodyweight exercises with no added load, set targetWeight to 0 (not null)
  - Only use null when no reasonable estimate is possible at all (e.g. a genuinely unfamiliar or ambiguous movement)
- Order exercises logically (compound first, isolation last)`,
      },
    ],
  });

  const text = (interaction.output_text ?? "").trim();
  const jsonStr = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(jsonStr);

  const validIds = new Set(input.availableExercises.map((e) => e.id));

  return {
    name: parsed.name || "AI Workout",
    description: parsed.description || "",
    exercises: (parsed.exercises || []).map((e: any) => {
      const base = {
        sets: Number(e.sets) || 3,
        targetReps: Number(e.targetReps) || 10,
        targetWeight: e.targetWeight != null ? Number(e.targetWeight) : null,
        targetUnit: (e.targetUnit === "s" ? "s" : "kg") as "kg" | "s",
      };

      if (e.existingId && validIds.has(e.existingId)) {
        return { ...base, existingId: e.existingId };
      }

      if (e.newExercise && e.newExercise.name) {
        const fa: MuscleRatings = {};
        for (const g of ALL_MUSCLE_GROUPS) {
          fa[g] = Math.min(5, Math.max(0, Number(e.newExercise.focusAreas?.[g]) || 0));
        }
        return {
          ...base,
          newExercise: {
            name: String(e.newExercise.name),
            description: String(e.newExercise.description || ""),
            tip: String(e.newExercise.tip || ""),
            focusAreas: fa,
            equipment: Array.isArray(e.newExercise.equipment) ? e.newExercise.equipment : null,
            unilateral: e.newExercise.unilateral === true,
          },
        };
      }

      return null;
    }).filter(Boolean) as GeneratedWorkoutExercise[],
  };
}

// --- Feature 4: Activity Classification ---

export async function classifyActivity(
  name: string
): Promise<MuscleRatings> {
  const client = getClient();
  const muscleList = ALL_MUSCLE_GROUPS.join(", ");

  const interaction = await client.interactions.create({
    model: "gemini-3.1-flash-lite",
    input: [
      {
        type: "text",
        text: `You are a sports science expert. For the activity "${name}", estimate which muscle groups are worked and how intensely.

Return ONLY a JSON object (no markdown, no code fences):
{ "Chest": 0, "Back": 0, ... }

Include ALL of these muscle groups: ${muscleList}
Rate each 0-5 (0=not involved, 5=heavily worked).
Consider the activity holistically — e.g. football works quads, hamstrings, calves, glutes, and core significantly.`,
      },
    ],
  });

  const text = (interaction.output_text ?? "").trim();
  const jsonStr = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(jsonStr);

  const focusAreas: MuscleRatings = {};
  for (const group of ALL_MUSCLE_GROUPS) {
    const val = Number(parsed[group]);
    focusAreas[group] = Number.isInteger(val) && val >= 0 && val <= 5 ? val : 0;
  }
  return focusAreas;
}
