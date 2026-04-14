<script lang="ts">
  import { onMount } from "svelte";
  import Card from "$lib/components/Card.svelte";
  import Typography from "$lib/components/Typography.svelte";
  import Button from "$lib/components/Button.svelte";
  import {
    deleteWorkoutSessionLocal,
    getExerciseDeviationAnalyticsLocal,
    getWorkoutAggregateAnalyticsLocal,
    getWorkoutSessionHistoryLocal,
    type ExerciseDeviationAnalytics,
    type WorkoutAggregateAnalytics,
    type WorkoutHistorySession,
  } from "$lib/data/sessions";

  type SessionHistoryRow = WorkoutHistorySession;
  type WorkoutAnalyticsRow = WorkoutAggregateAnalytics;
  type ExerciseAnalyticsRow = ExerciseDeviationAnalytics;
  type RangeOption = "all" | "7" | "30" | "90";

  let sessionHistory = $state<SessionHistoryRow[]>([]);
  let workoutAnalytics = $state<WorkoutAnalyticsRow[]>([]);
  let exerciseAnalytics = $state<ExerciseAnalyticsRow[]>([]);
  let selectedRange = $state<RangeOption>("all");
  let isLoading = $state(true);
  let errorMessage = $state<string | null>(null);

  let deletingSessionId = $state<number | null>(null);

  function resolveDays(range: RangeOption): number | null {
    if (range === "7") return 7;
    if (range === "30") return 30;
    if (range === "90") return 90;
    return null;
  }

  async function loadHistory(range: RangeOption) {
    isLoading = true;
    errorMessage = null;
    const days = resolveDays(range);

    try {
      const [historyRows, workoutRows, exerciseRows] = await Promise.all([
        getWorkoutSessionHistoryLocal(120, days),
        getWorkoutAggregateAnalyticsLocal(50, days),
        getExerciseDeviationAnalyticsLocal(50, days),
      ]);

      sessionHistory = historyRows;
      workoutAnalytics = workoutRows;
      exerciseAnalytics = exerciseRows;
      selectedRange = range;

      const url = new URL(window.location.href);
      if (range === "all") {
        url.searchParams.delete("range");
      } else {
        url.searchParams.set("range", range);
      }
      window.history.replaceState({}, "", url);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Failed to load workout history.";
    } finally {
      isLoading = false;
      deletingSessionId = null;
    }
  }

  async function handleDeleteSession(sessionId: number) {
    if (!confirm("Are you sure you want to delete this workout session?")) {
      return;
    }

    deletingSessionId = sessionId;
    errorMessage = null;

    try {
      await deleteWorkoutSessionLocal(sessionId);
      await loadHistory(selectedRange);
    } catch (error) {
      deletingSessionId = null;
      errorMessage = error instanceof Error ? error.message : "Failed to delete workout session.";
    }
  }

  const overallStats = $derived.by(() => {
    const totalSessions = sessionHistory.length;
    const totalSets = sessionHistory.reduce((sum, row) => sum + Number(row.sets_completed || 0), 0);
    const avgCompletion =
      totalSessions > 0
        ? Math.round((sessionHistory.reduce((sum, row) => sum + Number(row.completion_rate_pct || 0), 0) / totalSessions) * 10) / 10
        : 0;
    const avgAdherence =
      totalSessions > 0
        ? Math.round((sessionHistory.reduce((sum, row) => sum + Number(row.adherence_rate_pct || 0), 0) / totalSessions) * 10) / 10
        : 0;

    return {
      totalSessions,
      totalSets,
      avgCompletion,
      avgAdherence,
    };
  });

  function formatDate(dateLike: string | null) {
    if (!dateLike) return "-";
    const parsed = new Date(dateLike);
    if (Number.isNaN(parsed.getTime())) return "-";
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(parsed);
  }

  function formatDuration(totalSeconds: number) {
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "-";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }

  function adherenceBand(valueLike: number | string | null | undefined): "good" | "warning" | "critical" {
    const value = Number(valueLike ?? 0);
    if (!Number.isFinite(value)) {
      return "critical";
    }

    if (value < 75) {
      return "critical";
    }

    if (value < 90) {
      return "warning";
    }

    return "good";
  }

  function adherenceLabel(valueLike: number | string | null | undefined) {
    const band = adherenceBand(valueLike);
    if (band === "good") return "Good";
    if (band === "warning") return "Watch";
    return "Critical";
  }

  onMount(async () => {
    const url = new URL(window.location.href);
    const requestedRange = (url.searchParams.get("range") ?? "all") as RangeOption;
    const initialRange: RangeOption = ["all", "7", "30", "90"].includes(requestedRange)
      ? requestedRange
      : "all";

    await loadHistory(initialRange);
  });
</script>

<div class="space-y-6 sm:space-y-8">
  <div>
    <Typography variant="display" size="sm" as="h1" color="primary">
      Workout History
    </Typography>
    <Typography variant="body" size="md" color="tertiary" as="p">
      Track outcomes across sessions and spot where execution drifts from plan.
    </Typography>

    {#if errorMessage}
      <div class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
        <Typography variant="body" size="sm" color="tertiary" as="p">
          {errorMessage}
        </Typography>
      </div>
    {/if}

    <div class="mt-4" role="group" aria-label="History date range">
      <div class="range-group" role="radiogroup" aria-label="Date range filter">
        <button
          type="button"
          role="radio"
          aria-checked={selectedRange === "all"}
          class="range-option"
          class:active={selectedRange === "all"}
          onclick={() => loadHistory("all")}
        >
          All time
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={selectedRange === "7"}
          class="range-option"
          class:active={selectedRange === "7"}
          onclick={() => loadHistory("7")}
        >
          Last 7 days
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={selectedRange === "30"}
          class="range-option"
          class:active={selectedRange === "30"}
          onclick={() => loadHistory("30")}
        >
          Last 30 days
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={selectedRange === "90"}
          class="range-option"
          class:active={selectedRange === "90"}
          onclick={() => loadHistory("90")}
        >
          Last 90 days
        </button>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
    <Card>
      <Typography variant="body" size="sm" color="tertiary" as="p">Sessions Logged</Typography>
      <Typography variant="headline" size="lg" as="p" color="primary">{overallStats.totalSessions}</Typography>
    </Card>
    <Card>
      <Typography variant="body" size="sm" color="tertiary" as="p">Sets Completed</Typography>
      <Typography variant="headline" size="lg" as="p" color="secondary">{overallStats.totalSets}</Typography>
    </Card>
    <Card>
      <Typography variant="body" size="sm" color="tertiary" as="p">Avg Completion</Typography>
      <Typography variant="headline" size="lg" as="p" color="primary">{overallStats.avgCompletion}%</Typography>
    </Card>
    <Card>
      <Typography variant="body" size="sm" color="tertiary" as="p">Avg Adherence</Typography>
      <div class={`adherence-value adherence-${adherenceBand(overallStats.avgAdherence)}`}>
        <Typography variant="headline" size="lg" as="p">{overallStats.avgAdherence}%</Typography>
      </div>
    </Card>
  </div>

  <Card>
    <Typography variant="headline" size="sm" as="h2" color="primary">
      Session Timeline
    </Typography>
    {#if isLoading}
      <div class="mt-3">
        <Typography variant="body" size="sm" color="tertiary" as="p">
          Loading workout history...
        </Typography>
      </div>
    {:else if sessionHistory.length === 0}
      <div class="mt-3">
        <Typography variant="body" size="sm" color="tertiary" as="p">
          No sessions logged yet.
        </Typography>
      </div>
    {:else}
      <div class="overflow-x-auto mt-3">
        <table class="w-full text-sm analytics-table">
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Workout</th>
              <th scope="col">Completion</th>
              <th scope="col">Adherence</th>
              <th scope="col">Expected</th>
              <th scope="col">Deviation</th>
              <th scope="col">Duration</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each sessionHistory as row (row.session_id)}
              <tr>
                <td>{formatDate(row.completed_at ?? row.started_at)}</td>
                <th scope="row" class="font-medium">{row.workout_name}</th>
                <td>{row.sets_completed}/{row.total_sets_planned} ({row.completion_rate_pct}%)</td>
                <td>
                  <span class={`adherence-chip adherence-${adherenceBand(row.adherence_rate_pct)}`}>
                    {row.adherence_rate_pct}% ({adherenceLabel(row.adherence_rate_pct)})
                  </span>
                </td>
                <td>{row.expected_sets}</td>
                <td>{row.deviation_sets}</td>
                <td>{formatDuration(Number(row.duration_seconds))}</td>
                <td>
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    loading={deletingSessionId === row.session_id}
                    disabled={deletingSessionId !== null}
                    onclick={() => handleDeleteSession(row.session_id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>

  <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
    <Card>
      <Typography variant="headline" size="sm" as="h2" color="primary">
        Workout Performance Breakdown
      </Typography>
      {#if workoutAnalytics.length === 0}
        <div class="mt-3">
          <Typography variant="body" size="sm" color="tertiary" as="p">
            Analytics will appear after your first completed workout.
          </Typography>
        </div>
      {:else}
        <div class="overflow-x-auto mt-3">
          <table class="w-full text-sm analytics-table">
            <thead>
              <tr>
                <th scope="col">Workout</th>
                <th scope="col">Sessions</th>
                <th scope="col">Avg Completion</th>
                <th scope="col">Avg Adherence</th>
                <th scope="col">Best Adherence</th>
              </tr>
            </thead>
            <tbody>
              {#each workoutAnalytics as row (row.workout_id)}
                <tr class="align-middle">
                  <th scope="row" class="font-medium">{row.workout_name}</th>
                  <td>{row.sessions_count}</td>
                  <td>{row.avg_completion_rate_pct}%</td>
                  <td>
                    <span class={`adherence-chip adherence-${adherenceBand(row.avg_adherence_rate_pct)}`}>
                      {row.avg_adherence_rate_pct}% ({adherenceLabel(row.avg_adherence_rate_pct)})
                    </span>
                  </td>
                  <td>
                    <span class={`adherence-chip adherence-${adherenceBand(row.best_adherence_rate_pct)}`}>
                      {row.best_adherence_rate_pct}% ({adherenceLabel(row.best_adherence_rate_pct)})
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </Card>

    <Card>
      <Typography variant="headline" size="sm" as="h2" color="primary">
        Exercise Deviation Hotspots
      </Typography>
      {#if exerciseAnalytics.length === 0}
        <div class="mt-3">
          <Typography variant="body" size="sm" color="tertiary" as="p">
            Deviation hotspots will appear after sets are logged.
          </Typography>
        </div>
      {:else}
        <div class="overflow-x-auto mt-3">
          <table class="w-full text-sm analytics-table">
            <thead>
              <tr>
                <th scope="col">Exercise</th>
                <th scope="col">Deviation Rate</th>
                <th scope="col">Deviation Sets</th>
                <th scope="col">Avg Weight Delta</th>
                <th scope="col">Avg Time Delta</th>
              </tr>
            </thead>
            <tbody>
              {#each exerciseAnalytics as row (row.exercise_id)}
                <tr>
                  <th scope="row" class="font-medium">{row.exercise_name}</th>
                  <td>{row.deviation_rate_pct}%</td>
                  <td>{row.deviation_sets}/{row.total_sets_logged}</td>
                  <td>{row.avg_weight_delta == null ? '-' : `${row.avg_weight_delta} kg`}</td>
                  <td>{row.avg_time_delta_seconds == null ? '-' : `${row.avg_time_delta_seconds}s`}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </Card>
  </div>
</div>

<style>
  .analytics-table th,
  .analytics-table td {
    text-align: left;
    padding: 0.5rem;
    border-bottom: 1px solid var(--outline-variant);
  }

  .range-group {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .range-option {
    border: 1px solid var(--outline-variant);
    border-radius: var(--radius-full);
    padding: 0.35rem 0.75rem;
    color: var(--tertiary);
    text-decoration: none;
    background: var(--surface-container-low);
  }

  .range-option:hover,
  .range-option:focus-visible {
    border-color: var(--secondary);
    color: var(--primary);
    text-decoration: underline;
  }

  .range-option.active {
    border-color: var(--secondary);
    color: var(--on-secondary);
    background: var(--secondary-container);
  }

  .adherence-chip {
    display: inline-block;
    border-radius: var(--radius-full);
    padding: 0.2rem 0.6rem;
    border: 1px solid transparent;
    font-weight: 700;
    font-size: 0.75rem;
    line-height: 1.2;
    white-space: nowrap;
  }

  .adherence-value {
    margin-top: 0.125rem;
    background: transparent;
    border: none;
    padding: 0;
    border-radius: 0;
  }

  .adherence-value.adherence-good {
    color: var(--secondary);
  }

  .adherence-value.adherence-warning {
    color: var(--tertiary);
  }

  .adherence-value.adherence-critical {
    color: var(--error);
  }

  .adherence-chip.adherence-good {
    color: var(--on-secondary);
    border-color: var(--secondary);
    background: var(--secondary-container);
  }

  .adherence-chip.adherence-warning {
    color: var(--on-tertiary);
    border-color: var(--tertiary);
    background: var(--tertiary-container);
  }

  .adherence-chip.adherence-critical {
    color: var(--error);
    border-color: var(--error);
    background: var(--error-container);
  }
</style>
