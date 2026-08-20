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
  "focusAreas": { "Chest": 0, "Back": 0, ... }
}

focusAreas must include ALL of these muscle groups: ${muscleList}
Rate each muscle group 0-5 (0=not involved, 5=primary mover).
The total of all ratings should not exceed 25.
Be accurate about which muscles are primary movers vs stabilizers.`,
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
  };
}

// --- Feature 1b: Bulk Exercise Re-analysis ---

export interface BulkAnalysisResult {
  exercises: {
    name: string;
    description: string;
    tip: string;
    focusAreas: MuscleRatings;
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
{"exercises":[{"name":"<exact name>","description":"One sentence describing the exercise","tip":"One practical form tip","focusAreas":{"Chest":0,"Back":0,...}}]}

focusAreas must include ALL of these muscle groups: ${muscleList}
Rate each 0-5 (0=not involved, 5=primary mover). Total per exercise should not exceed 25.
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

export interface GeneratedWorkout {
  name: string;
  description: string;
  exercises: {
    exerciseId: number;
    sets: number;
    targetReps: number;
    targetWeight: number | null;
    targetUnit: "kg" | "s";
  }[];
}

interface BuilderInput {
  prompt: string;
  availableExercises: { id: number; name: string; muscleGroups: string[] }[];
}

export async function generateWorkout(input: BuilderInput): Promise<GeneratedWorkout> {
  const client = getClient();

  const interaction = await client.interactions.create({
    model: "gemini-3.1-flash-lite",
    input: [
      {
        type: "text",
        text: `You are a strength and conditioning coach. Create a workout based on this request: "${input.prompt}"

You MUST only use exercises from this library (use the exact IDs):
${input.availableExercises.map((e) => `- ID ${e.id}: "${e.name}" (${e.muscleGroups.join(", ")})`).join("\n")}

Return ONLY a JSON object (no markdown, no code fences):
{
  "name": "Short workout name",
  "description": "One sentence describing the workout focus",
  "exercises": [
    { "exerciseId": <id>, "sets": 3, "targetReps": 10, "targetWeight": null, "targetUnit": "kg" }
  ]
}

Rules:
- Pick 4-8 exercises that match the request
- Use targetUnit "s" for timed exercises (planks, holds), "kg" for everything else
- For timed exercises: targetReps should be 1, targetWeight is the time in seconds
- Set targetWeight to null if unknown (user can adjust later)
- Order exercises logically (compound first, isolation last)`,
      },
    ],
  });

  const text = (interaction.output_text ?? "").trim();
  const jsonStr = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(jsonStr);

  const validIds = new Set(input.availableExercises.map((e) => e.id));
  const exercises = (parsed.exercises || []).filter(
    (e: any) => validIds.has(e.exerciseId)
  );

  return {
    name: parsed.name || "AI Workout",
    description: parsed.description || "",
    exercises: exercises.map((e: any) => ({
      exerciseId: e.exerciseId,
      sets: Number(e.sets) || 3,
      targetReps: Number(e.targetReps) || 10,
      targetWeight: e.targetWeight != null ? Number(e.targetWeight) : null,
      targetUnit: e.targetUnit === "s" ? "s" : "kg",
    })),
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
