import { useState, useEffect, useCallback } from "react";
import * as db from "@/lib/db";
import { ratedMuscleGroups } from "@/lib/muscleGroups";
import * as gemini from "@/lib/gemini";
import type { Session, Workout } from "@/types";

export interface LastSessionSummary {
  workoutName: string;
  startedAt: string;
  completionPct: number;
  durationMinutes: number;
}

export interface WeekDay {
  date: string;
  dayLabel: string;
  hasWorkout: boolean;
  hasActivity: boolean;
  isToday: boolean;
}

export interface WorkoutRecommendation {
  workoutId: number;
  workoutName: string;
  reason: string;
  loading: boolean;
}

export function useDashboard() {
  const [activeSession, setActiveSession] = useState<(Session & { workoutName: string }) | null>(null);
  const [lastSession, setLastSession] = useState<LastSessionSummary | null>(null);
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [recommendation, setRecommendation] = useState<WorkoutRecommendation | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [sessions, workouts, activities] = await Promise.all([
      db.getAllSessions(),
      db.getAllWorkouts(),
      db.getAllActivities(),
    ]);

    const workoutMap = new Map<number, Workout>(workouts.map((w) => [w.id!, w]));

    const active = sessions.find((s) => s.completedAt === null);
    if (active) {
      const w = workoutMap.get(active.workoutId);
      setActiveSession({ ...active, workoutName: w?.name ?? "Unknown" });
    } else {
      setActiveSession(null);
    }

    const completed = sessions
      .filter((s) => s.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

    if (completed.length > 0) {
      const last = completed[0];
      const w = workoutMap.get(last.workoutId);
      const dur = Math.round(
        (new Date(last.completedAt!).getTime() - new Date(last.startedAt).getTime()) / 60000
      );
      setLastSession({
        workoutName: w?.name ?? "Unknown",
        startedAt: last.startedAt,
        completionPct: last.totalSetsPlanned > 0
          ? Math.round((last.setsCompleted / last.totalSetsPlanned) * 100)
          : 0,
        durationMinutes: dur,
      });
    }

    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() + mondayOffset);

    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const week: WeekDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const todayStr = now.toISOString().slice(0, 10);

      const hasWorkout = sessions.some((s) => {
        if (!s.completedAt) return false;
        return s.startedAt.slice(0, 10) === dateStr;
      });

      const hasActivity = activities.some((a) => a.performedAt.slice(0, 10) === dateStr);

      week.push({
        date: dateStr,
        dayLabel: dayLabels[i],
        hasWorkout,
        hasActivity,
        isToday: dateStr === todayStr,
      });
    }
    setWeekDays(week);

    loadRecommendation(sessions, workouts);
    setLoading(false);
  }, []);

  const loadRecommendation = async (sessions: Session[], workouts: Workout[]) => {
    if (workouts.length === 0) return;

    const completed = sessions
      .filter((s) => s.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

    const workoutsWithExercises = await Promise.all(
      workouts.map(async (w) => {
        const exercises = await db.getWorkoutExercises(w.id!);
        if (exercises.length === 0) return null;
        const allEx = await db.getAllExercises();
        const muscleGroups = new Set<string>();
        for (const we of exercises) {
          const ex = allEx.find((e) => e.id === we.exerciseId);
          if (ex) ratedMuscleGroups(ex.focusAreas).forEach((g) => muscleGroups.add(g));
        }
        return { id: w.id!, name: w.name, muscleGroups: [...muscleGroups] };
      })
    );
    const validWorkouts = workoutsWithExercises.filter(Boolean) as { id: number; name: string; muscleGroups: string[] }[];

    if (validWorkouts.length === 0) return;

    const lastPerWorkout = new Map<number, number>();
    const now = Date.now();
    for (const s of completed) {
      if (!lastPerWorkout.has(s.workoutId)) {
        lastPerWorkout.set(s.workoutId, Math.round((now - new Date(s.completedAt!).getTime()) / 86400000));
      }
    }

    let bestWorkout = validWorkouts[0];
    let maxDaysAgo = -1;
    for (const w of validWorkouts) {
      const daysAgo = lastPerWorkout.get(w.id) ?? 999;
      if (daysAgo > maxDaysAgo) {
        maxDaysAgo = daysAgo;
        bestWorkout = w;
      }
    }

    setRecommendation({
      workoutId: bestWorkout.id,
      workoutName: bestWorkout.name,
      reason: maxDaysAgo >= 999
        ? "You haven't done this workout yet — give it a try!"
        : `Last trained ${maxDaysAgo} day${maxDaysAgo !== 1 ? "s" : ""} ago`,
      loading: gemini.isConfigured(),
    });

    if (gemini.isConfigured()) {
      try {
        const recentSessions = completed.slice(0, 10).map((s) => {
          const w = workouts.find((w) => w.id === s.workoutId);
          return {
            workoutName: w?.name ?? "Unknown",
            daysAgo: Math.round((now - new Date(s.completedAt!).getTime()) / 86400000),
          };
        });

        const aiResult = await gemini.suggestNextWorkout({
          workouts: validWorkouts,
          recentSessions,
        });

        const w = workouts.find((w) => w.id === aiResult.workoutId);
        if (w) {
          setRecommendation({
            workoutId: aiResult.workoutId,
            workoutName: w.name,
            reason: aiResult.reason,
            loading: false,
          });
        }
      } catch {
        setRecommendation((prev) => prev ? { ...prev, loading: false } : null);
      }
    }
  };

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { activeSession, lastSession, weekDays, recommendation, loading, refresh };
}
