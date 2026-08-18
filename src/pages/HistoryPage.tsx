import { useState } from "react";
import { useHistory, type DateRange } from "@/hooks/useHistory";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import * as db from "@/lib/db";
import type { SessionSet } from "@/types";

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

export function HistoryPage() {
  const [range, setRange] = useState<DateRange>("all");
  const { sessions, workoutAnalytics, exerciseAnalytics, loading, removeSession } = useHistory(range);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedSets, setExpandedSets] = useState<(SessionSet & { exerciseName: string })[]>([]);

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
      <h1 className="text-2xl font-bold">History</h1>

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
                    <td className="px-2 py-1.5 font-medium">{ea.exerciseName}</td>
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
          No sessions recorded yet. Execute a workout to see your history.
        </p>
      )}
    </div>
  );
}
