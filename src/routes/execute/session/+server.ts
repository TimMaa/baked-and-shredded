import {
  completeWorkoutSession,
  createWorkoutSession,
  getWorkoutSuccessSummary,
  logSessionSet,
  type SessionSetStatus,
} from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

type StartPayload = {
  action: 'start';
  workoutId: number;
  executionStyle: 'byExercise' | 'staggered';
  totalSetsPlanned: number;
};

type LogSetPayload = {
  action: 'set';
  sessionId: number;
  workoutExerciseId: number;
  exerciseId: number;
  setNumber: number;
  targetReps: number;
  targetWeight: number | null;
  targetUnit: 'kg' | 's';
  actualReps: number;
  actualWeight: number | null;
  status: SessionSetStatus;
};

type CompletePayload = {
  action: 'complete';
  sessionId: number;
  setsCompleted: number;
};

function isFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value);
}

export const POST: RequestHandler = async ({ request }) => {
  const payload = (await request.json()) as StartPayload | LogSetPayload | CompletePayload;

  if (payload.action === 'start') {
    if (!isFiniteNumber(payload.workoutId) || payload.workoutId <= 0) {
      return json({ error: 'Invalid workout id.' }, { status: 400 });
    }

    if (!isFiniteNumber(payload.totalSetsPlanned) || payload.totalSetsPlanned < 0) {
      return json({ error: 'Invalid set count.' }, { status: 400 });
    }

    const sessionId = await createWorkoutSession(
      Math.trunc(payload.workoutId),
      payload.executionStyle,
      Math.trunc(payload.totalSetsPlanned)
    );

    return json({ sessionId });
  }

  if (payload.action === 'set') {
    if (!isFiniteNumber(payload.sessionId) || payload.sessionId <= 0) {
      return json({ error: 'Invalid session id.' }, { status: 400 });
    }

    if (!isFiniteNumber(payload.workoutExerciseId) || payload.workoutExerciseId <= 0) {
      return json({ error: 'Invalid workout exercise id.' }, { status: 400 });
    }

    if (!isFiniteNumber(payload.exerciseId) || payload.exerciseId <= 0) {
      return json({ error: 'Invalid exercise id.' }, { status: 400 });
    }

    if (!isFiniteNumber(payload.setNumber) || payload.setNumber <= 0) {
      return json({ error: 'Invalid set number.' }, { status: 400 });
    }

    if (!isFiniteNumber(payload.targetReps) || payload.targetReps <= 0) {
      return json({ error: 'Invalid target reps.' }, { status: 400 });
    }

    if (!isFiniteNumber(payload.actualReps) || payload.actualReps <= 0) {
      return json({ error: 'Invalid actual reps.' }, { status: 400 });
    }

    if (payload.status !== 'expected' && payload.status !== 'deviation') {
      return json({ error: 'Invalid set status.' }, { status: 400 });
    }

    await logSessionSet({
      sessionId: Math.trunc(payload.sessionId),
      workoutExerciseId: Math.trunc(payload.workoutExerciseId),
      exerciseId: Math.trunc(payload.exerciseId),
      setNumber: Math.trunc(payload.setNumber),
      targetReps: Math.trunc(payload.targetReps),
      targetWeight: payload.targetWeight,
      targetUnit: payload.targetUnit,
      actualReps: Math.trunc(payload.actualReps),
      actualWeight: payload.actualWeight,
      status: payload.status,
    });

    return json({ ok: true });
  }

  if (payload.action === 'complete') {
    if (!isFiniteNumber(payload.sessionId) || payload.sessionId <= 0) {
      return json({ error: 'Invalid session id.' }, { status: 400 });
    }

    if (!isFiniteNumber(payload.setsCompleted) || payload.setsCompleted < 0) {
      return json({ error: 'Invalid completed set count.' }, { status: 400 });
    }

    await completeWorkoutSession(Math.trunc(payload.sessionId), Math.trunc(payload.setsCompleted));
    return json({ ok: true });
  }

  return json({ error: 'Unsupported action.' }, { status: 400 });
};

export const GET: RequestHandler = async ({ url }) => {
  const requestedLimit = Number.parseInt(url.searchParams.get('limit') ?? '30', 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 30;
  const summary = await getWorkoutSuccessSummary(limit);
  return json({ summary });
};
