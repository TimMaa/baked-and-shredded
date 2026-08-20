import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDashboard } from "@/hooks/useDashboard";
import { useRecovery, type MuscleRecovery } from "@/hooks/useRecovery";
import { useActivities } from "@/hooks/useActivities";
import { getMuscleGroupLabel, createDefaultMuscleRatings } from "@/lib/muscleGroups";
import * as gemini from "@/lib/gemini";
import { Play, Settings, Plus, Clock, CheckCircle2, Loader2, X } from "lucide-react";
import type { WeekDay } from "@/hooks/useDashboard";

function RecoveryStatus({ recovery }: { recovery: MuscleRecovery[] }) {
  const worked = recovery.filter((r) => r.hoursSinceWorked !== null);
  if (worked.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-2">
        No recent training data — all muscle groups are fresh
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {recovery.map((r) => {
        if (r.hoursSinceWorked === null) return null;
        const colorClass =
          r.status === "fresh"
            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
            : r.status === "recovering"
              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
        const hours = Math.round(r.hoursSinceWorked);
        const label = hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
        return (
          <span
            key={r.group}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
          >
            {getMuscleGroupLabel(r.group)}
            <span className="opacity-70">{label}</span>
          </span>
        );
      })}
    </div>
  );
}

function WeekStrip({ days }: { days: WeekDay[] }) {
  const trainedCount = days.filter((d) => d.hasWorkout || d.hasActivity).length;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between">
        {days.map((d) => (
          <div key={d.date} className="flex flex-col items-center gap-1">
            <span className={`text-xs ${d.isToday ? "font-bold text-primary" : "text-muted-foreground"}`}>
              {d.dayLabel}
            </span>
            <div
              className={`size-3 rounded-full ${
                d.hasWorkout
                  ? "bg-primary"
                  : d.hasActivity
                    ? "bg-primary/40"
                    : d.isToday
                      ? "border-2 border-primary/40"
                      : "bg-muted"
              }`}
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground text-center">
        {trainedCount} session{trainedCount !== 1 ? "s" : ""} this week
      </p>
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { activeSession, lastSession, weekDays, recommendation, loading } = useDashboard();
  const { recovery, loading: recoveryLoading } = useRecovery();
  const { create: createActivity, refresh: refreshActivities } = useActivities();

  const [showLogActivity, setShowLogActivity] = useState(false);
  const [activityName, setActivityName] = useState("");
  const [activityDuration, setActivityDuration] = useState("");
  const [savingActivity, setSavingActivity] = useState(false);

  const handleLogActivity = async () => {
    if (!activityName.trim() || !activityDuration.trim()) return;
    setSavingActivity(true);

    let muscleGroups = createDefaultMuscleRatings();
    if (gemini.isConfigured()) {
      try {
        muscleGroups = await gemini.classifyActivity(activityName.trim());
      } catch {
        // fall back to default ratings
      }
    }

    await createActivity({
      name: activityName.trim(),
      durationMinutes: Number(activityDuration) || 0,
      muscleGroups,
      performedAt: new Date().toISOString(),
      notes: null,
    });

    setActivityName("");
    setActivityDuration("");
    setShowLogActivity(false);
    setSavingActivity(false);
    await refreshActivities();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Baked & Shredded
          </h1>
          <p className="text-sm text-muted-foreground">
            The right workout at the right time
          </p>
        </div>
        <Link to="/settings">
          <Button variant="ghost" size="icon-xs">
            <Settings className="size-4" />
          </Button>
        </Link>
      </div>

      {activeSession && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="flex items-center justify-between pt-3">
            <div>
              <p className="text-sm font-medium">Resume Workout</p>
              <p className="text-xs text-muted-foreground">{activeSession.workoutName}</p>
            </div>
            <Button size="sm" onClick={() => navigate("/train")}>
              <Play className="size-3.5" /> Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {recommendation && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Today's Workout</p>
              <h2 className="text-lg font-semibold">{recommendation.workoutName}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {recommendation.loading ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="size-3 animate-spin" /> Thinking...
                  </span>
                ) : (
                  recommendation.reason
                )}
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => navigate(`/train?workoutId=${recommendation.workoutId}`)}
              disabled={!!activeSession}
            >
              <Play className="size-4" /> Start Workout
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Recovery</h3>
        </div>
        {recoveryLoading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <RecoveryStatus recovery={recovery} />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Log Activity</h3>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setShowLogActivity(!showLogActivity)}
          >
            {showLogActivity ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
          </Button>
        </div>
        {showLogActivity && (
          <Card size="sm">
            <CardContent className="space-y-2 pt-3">
              <Input
                placeholder="Activity name (e.g. Football)"
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
              />
              <Input
                placeholder="Duration (minutes)"
                type="number"
                value={activityDuration}
                onChange={(e) => setActivityDuration(e.target.value)}
              />
              <Button
                className="w-full"
                size="sm"
                onClick={handleLogActivity}
                disabled={!activityName.trim() || !activityDuration.trim() || savingActivity}
              >
                {savingActivity ? (
                  <><Loader2 className="size-3.5 animate-spin" /> Saving...</>
                ) : (
                  <><Plus className="size-3.5" /> Log Activity</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">This Week</h3>
        <WeekStrip days={weekDays} />
      </div>

      {lastSession && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Last Session</h3>
          <Card size="sm">
            <CardContent className="flex items-center justify-between pt-3">
              <div>
                <p className="text-sm font-medium">{lastSession.workoutName}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(lastSession.startedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="size-3" />
                  {lastSession.completionPct}%
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {lastSession.durationMinutes}m
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
