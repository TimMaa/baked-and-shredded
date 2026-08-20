import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useHistory, type DateRange } from "@/hooks/useHistory";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Trash2, ChevronDown, ChevronUp, Trophy, Calendar } from "lucide-react";
import * as db from "@/lib/db";
import { ALL_MUSCLE_GROUPS, getMuscleGroupLabel } from "@/lib/muscleGroups";
import type { SessionSet, Exercise } from "@/types";

const ranges: { value: DateRange; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

function adherenceBadge(pct: number) {
  if (pct >= 90) return <Badge className="bg-success/20 text-success">{pct}%</Badge>;
  if (pct >= 75) return <Badge className="bg-warning/20 text-warning">{pct}%</Badge>;
  return <Badge variant="destructive">{pct}%</Badge>;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

interface PersonalRecordDisplay {
  exerciseId: number;
  exerciseName: string;
  type: "weight" | "reps" | "time";
  value: number;
  date: string;
}

interface WeeklyVolume {
  group: string;
  volume: number;
  maxVolume: number;
}

function TrainingCalendar({ sessions }: { sessions: { startedAt: string }[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7;

  const sessionDates = new Set(sessions.map((s) => s.startedAt.slice(0, 10)));

  const days: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);

  const monthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Calendar className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">{monthLabel}</span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="text-[10px] text-muted-foreground">{d}</span>
        ))}
        {days.map((day, i) => {
          if (day === null) return <span key={i} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const hasSession = sessionDates.has(dateStr);
          const isToday = day === now.getDate();
          return (
            <span
              key={i}
              className={cn(
                "aspect-square flex items-center justify-center rounded text-xs",
                hasSession && "bg-primary text-primary-foreground font-medium",
                !hasSession && isToday && "border border-primary/40",
                !hasSession && !isToday && "text-muted-foreground"
              )}
            >
              {day}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function VolumeTrends({ volumes }: { volumes: WeeklyVolume[] }) {
  const activeVolumes = volumes.filter((v) => v.volume > 0);
  if (activeVolumes.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {activeVolumes.map((v) => (
        <div key={v.group} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-24 truncate">
            {getMuscleGroupLabel(v.group)}
          </span>
          <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary/70"
              style={{ width: `${v.maxVolume > 0 ? (v.volume / v.maxVolume) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{v.volume}</span>
        </div>
      ))}
    </div>
  );
}

export function HistoryPage() {
  const [range, setRange] = useState<DateRange>("30");
  const { sessions, workoutAnalytics, exerciseAnalytics, loading, removeSession } = useHistory(range);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedSets, setExpandedSets] = useState<(SessionSet & { exerciseName: string })[]>([]);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecordDisplay[]>([]);
  const [weeklyVolumes, setWeeklyVolumes] = useState<WeeklyVolume[]>([]);

  useEffect(() => {
    (async () => {
      const [allSets, allExercises, allSessions] = await Promise.all([
        db.getAllSessionSets(),
        db.getAllExercises(),
        db.getAllSessions(),
      ]);

      const exerciseMap = new Map<number, Exercise>(allExercises.map((e) => [e.id!, e]));

      // Compute personal records from session sets
      const prMap = new Map<string, PersonalRecordDisplay>();
      const completedSessions = allSessions.filter((s) => s.completedAt);
      const sessionDateMap = new Map(completedSessions.map((s) => [s.id!, s.completedAt!]));

      for (const set of allSets) {
        const ex = exerciseMap.get(set.exerciseId);
        if (!ex) continue;
        const date = sessionDateMap.get(set.sessionId);
        if (!date) continue;

        if (set.targetUnit === "kg" && set.actualWeight != null) {
          const key = `weight-${set.exerciseId}`;
          const existing = prMap.get(key);
          if (!existing || set.actualWeight > existing.value) {
            prMap.set(key, { exerciseId: set.exerciseId, exerciseName: ex.name, type: "weight", value: set.actualWeight, date });
          }
        }

        if (set.targetUnit === "kg") {
          const key = `reps-${set.exerciseId}`;
          const existing = prMap.get(key);
          if (!existing || set.actualReps > existing.value) {
            prMap.set(key, { exerciseId: set.exerciseId, exerciseName: ex.name, type: "reps", value: set.actualReps, date });
          }
        }

        if (set.targetUnit === "s" && set.actualWeight != null) {
          const key = `time-${set.exerciseId}`;
          const existing = prMap.get(key);
          if (!existing || set.actualWeight > existing.value) {
            prMap.set(key, { exerciseId: set.exerciseId, exerciseName: ex.name, type: "time", value: set.actualWeight, date });
          }
        }
      }

      const records = [...prMap.values()]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);
      setPersonalRecords(records);

      // Compute weekly volume per muscle group (last 7 days)
      const weekAgo = Date.now() - 7 * 86400000;
      const recentSessionIds = new Set(
        completedSessions
          .filter((s) => new Date(s.completedAt!).getTime() >= weekAgo)
          .map((s) => s.id!)
      );
      const recentSets = allSets.filter((ss) => recentSessionIds.has(ss.sessionId));

      const volumeMap = new Map<string, number>();
      for (const set of recentSets) {
        const ex = exerciseMap.get(set.exerciseId);
        if (!ex) continue;
        for (const [group, rating] of Object.entries(ex.focusAreas)) {
          if (rating <= 0) continue;
          const current = volumeMap.get(group) || 0;
          volumeMap.set(group, current + rating * set.actualReps);
        }
      }

      const maxVolume = Math.max(...volumeMap.values(), 1);
      const volumes: WeeklyVolume[] = ALL_MUSCLE_GROUPS.map((group) => ({
        group,
        volume: volumeMap.get(group) || 0,
        maxVolume,
      }));
      setWeeklyVolumes(volumes);
    })();
  }, []);

  const toggleExpand = async (sessionId: number) => {
    if (expandedId === sessionId) {
      setExpandedId(null);
      setExpandedSets([]);
      return;
    }
    const sets = await db.getSessionSets(sessionId);
    const allExercises = await db.getAllExercises();
    const exerciseMap = new Map(allExercises.map((e) => [e.id!, e.name]));
    const enriched = sets
      .sort((a, b) => a.setNumber - b.setNumber)
      .map((s) => ({ ...s, exerciseName: exerciseMap.get(s.exerciseId) || "Unknown" }));
    setExpandedSets(enriched);
    setExpandedId(sessionId);
  };

  const totalSessions = sessions.length;
  const totalSets = sessions.reduce((s, sess) => s + sess.setsCompleted, 0);
  const avgCompletion = totalSessions > 0
    ? Math.round(sessions.reduce((s, sess) => s + sess.completionRatePct, 0) / totalSessions * 10) / 10
    : 0;
  const avgAdherence = totalSessions > 0
    ? Math.round(sessions.reduce((s, sess) => s + sess.adherenceRatePct, 0) / totalSessions * 10) / 10
    : 0;

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Progress</h1>

      <div className="flex gap-1.5" role="radiogroup">
        {ranges.map((r) => (
          <button
            key={r.value}
            role="radio"
            aria-checked={range === r.value}
            onClick={() => setRange(r.value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              range === r.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card size="sm">
          <CardContent className="pt-3 text-center">
            <p className="text-2xl font-bold">{totalSessions}</p>
            <p className="text-xs text-muted-foreground">Sessions</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-3 text-center">
            <p className="text-2xl font-bold">{totalSets}</p>
            <p className="text-xs text-muted-foreground">Sets</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-3 text-center">
            <p className="text-2xl font-bold">{avgCompletion}%</p>
            <p className="text-xs text-muted-foreground">Avg Completion</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-3 text-center">
            <p className="text-2xl font-bold">{avgAdherence}%</p>
            <p className="text-xs text-muted-foreground">Avg Adherence</p>
          </CardContent>
        </Card>
      </div>

      {personalRecords.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Trophy className="size-3.5" /> Personal Records
          </h2>
          <div className="space-y-1.5">
            {personalRecords.map((pr, i) => (
              <Link key={i} to={`/progress/exercise/${pr.exerciseId}`} className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-accent transition-colors">
                <div>
                  <p className="text-sm font-medium">{pr.exerciseName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(pr.date).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="secondary" className="tabular-nums">
                  {pr.type === "weight" && `${pr.value} kg`}
                  {pr.type === "reps" && `${pr.value} reps`}
                  {pr.type === "time" && `${pr.value}s`}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      <TrainingCalendar sessions={sessions} />

      {weeklyVolumes.some((v) => v.volume > 0) && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Volume This Week
          </h2>
          <VolumeTrends volumes={weeklyVolumes} />
        </div>
      )}

      {sessions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sessions</h2>
          <div className="space-y-2">
            {sessions.map((s) => (
              <Card key={s.sessionId} size="sm">
                <CardContent className="pt-3">
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => toggleExpand(s.sessionId)}
                  >
                    <div>
                      <p className="text-sm font-medium">{s.workoutName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.startedAt).toLocaleDateString()} &mdash; {formatDuration(s.durationSeconds)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {adherenceBadge(s.adherenceRatePct)}
                      {expandedId === s.sessionId
                        ? <ChevronUp className="size-4 text-muted-foreground" />
                        : <ChevronDown className="size-4 text-muted-foreground" />}
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => { e.stopPropagation(); if (confirm("Delete session?")) removeSession(s.sessionId); }}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
                    <div>
                      <p className="font-medium">{s.setsCompleted}/{s.totalSetsPlanned}</p>
                      <p className="text-muted-foreground">Sets</p>
                    </div>
                    <div>
                      <p className="font-medium">{s.completionRatePct}%</p>
                      <p className="text-muted-foreground">Complete</p>
                    </div>
                    <div>
                      <p className="font-medium text-success">{s.expectedSets}</p>
                      <p className="text-muted-foreground">Expected</p>
                    </div>
                    <div>
                      <p className="font-medium text-warning">{s.deviationSets}</p>
                      <p className="text-muted-foreground">Deviation</p>
                    </div>
                  </div>

                  {expandedId === s.sessionId && expandedSets.length > 0 && (
                    <div className="mt-3 border-t pt-3 space-y-2">
                      {Object.entries(
                        expandedSets.reduce<Record<string, (SessionSet & { exerciseName: string })[]>>(
                          (acc, set) => {
                            const key = set.exerciseName;
                            if (!acc[key]) acc[key] = [];
                            acc[key].push(set);
                            return acc;
                          },
                          {}
                        )
                      ).map(([name, sets]) => (
                        <div key={name}>
                          <p className="text-xs font-medium mb-1">{name}</p>
                          <div className="space-y-0.5 ml-2">
                            {sets.map((set) => (
                              <div key={set.id} className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground w-10">Set {set.setNumber}</span>
                                <span className="tabular-nums">
                                  {set.targetUnit === "s"
                                    ? `${set.actualWeight}s`
                                    : `${set.actualReps} reps${set.actualWeight ? ` @ ${set.actualWeight}kg` : ""}`}
                                </span>
                                {set.status === "expected" ? (
                                  <Badge className="bg-success/20 text-success text-[10px] px-1 py-0">ok</Badge>
                                ) : (
                                  <Badge className="bg-warning/20 text-warning text-[10px] px-1 py-0">dev</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {workoutAnalytics.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Workout Performance
          </h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-1.5 text-left font-medium">Workout</th>
                  <th className="px-2 py-1.5 text-right font-medium">Sessions</th>
                  <th className="px-2 py-1.5 text-right font-medium">Avg Comp</th>
                  <th className="px-2 py-1.5 text-right font-medium">Avg Adh</th>
                  <th className="px-2 py-1.5 text-right font-medium">Best</th>
                </tr>
              </thead>
              <tbody>
                {workoutAnalytics.map((wa) => (
                  <tr key={wa.workoutId} className="border-b last:border-0">
                    <td className="px-2 py-1.5 font-medium">{wa.workoutName}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{wa.sessionsCount}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{wa.avgCompletionRatePct}%</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{wa.avgAdherenceRatePct}%</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{wa.bestAdherenceRatePct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {exerciseAnalytics.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Exercise Deviations
          </h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-1.5 text-left font-medium">Exercise</th>
                  <th className="px-2 py-1.5 text-right font-medium">Dev %</th>
                  <th className="px-2 py-1.5 text-right font-medium">Dev/Total</th>
                  <th className="px-2 py-1.5 text-right font-medium">&Delta; kg</th>
                  <th className="px-2 py-1.5 text-right font-medium">&Delta; s</th>
                </tr>
              </thead>
              <tbody>
                {exerciseAnalytics.map((ea) => (
                  <tr key={ea.exerciseId} className="border-b last:border-0">
                    <td className="px-2 py-1.5 font-medium">
                      <Link to={`/progress/exercise/${ea.exerciseId}`} className="text-primary hover:underline">
                        {ea.exerciseName}
                      </Link>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{ea.deviationRatePct}%</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{ea.deviationSets}/{ea.totalSetsLogged}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {ea.avgWeightDelta != null ? ea.avgWeightDelta : "—"}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {ea.avgTimeDeltaSeconds != null ? ea.avgTimeDeltaSeconds : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sessions.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No sessions recorded yet. Start a workout to track your progress.
        </p>
      )}
    </div>
  );
}
