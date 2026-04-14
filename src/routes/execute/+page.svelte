<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import Button from "$lib/components/Button.svelte";
  import Card from "$lib/components/Card.svelte";
  import Input from "$lib/components/Input.svelte";
  import Typography from "$lib/components/Typography.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  type WorkoutExercise = {
    id: number;
    exercise_id: number;
    exercise_name: string;
    sets: number;
    target_reps: number;
    target_weight: number | null;
    target_unit: string;
  };

  type Workout = {
    id: number;
    name: string;
    description?: string;
    exercises: WorkoutExercise[];
  };

  type SetQueueItem = {
    workoutExerciseId: number;
    exerciseId: number;
    exerciseName: string;
    setNumber: number;
    totalSets: number;
    targetReps: number;
    targetWeight: number | null;
    targetUnit: string;
  };

  type CompletedSet = SetQueueItem & {
    actualReps: number;
    actualWeight: number | null;
    status: "expected" | "deviation";
  };

  type ExerciseProgress = {
    workoutExerciseId: number;
    exerciseId: number;
    exerciseName: string;
    totalSets: number;
    targetReps: number;
    targetWeight: number | null;
    targetUnit: string;
    nextSetNumber: number;
  };

  type NextSetOption = {
    exerciseId: number;
    exerciseName: string;
    setNumber: number;
    totalSets: number;
    isSameExercise: boolean;
    isSkipped: boolean;
  };

  const workouts = $derived((data.workouts as Workout[]) ?? []);

  let selectedWorkoutId = $state<number | null>(null);
  let currentSessionId = $state<number | null>(null);
  let persistenceError = $state<string | null>(null);
  let sessionStarted = $state(false);
  let sessionStartedAt = $state<Date | null>(null);

  // Exercise progress tracking - maps exercise_id to its progress
  let exerciseProgressMap = $state<Map<number, ExerciseProgress>>(new Map());
  let currentExerciseId = $state<number | null>(null);
  let completedSets = $state<CompletedSet[]>([]);

  // Next set chooser UI state
  let showNextSetChooser = $state(false);
  let availableNextOptions = $state<NextSetOption[]>([]);

  // Deviation form state
  let showDeviationForm = $state(false);
  let deviationReps = $state("");
  let deviationWeight = $state("");
  let deviationError = $state<string | null>(null);
  let stopwatchElapsedMs = $state(0);
  let stopwatchRunning = $state(false);
  let stopwatchAnchorMs = $state<number | null>(null);

  const selectedWorkout = $derived(
    workouts.find((workout) => Number(workout.id) === selectedWorkoutId) ?? null
  );

  const currentExerciseProgress = $derived(
    currentExerciseId !== null ? exerciseProgressMap.get(currentExerciseId) : null
  );

  const currentSet = $derived.by(() => {
    if (!currentExerciseProgress) return null;

    return {
      workoutExerciseId: currentExerciseProgress.workoutExerciseId,
      exerciseId: currentExerciseProgress.exerciseId,
      exerciseName: currentExerciseProgress.exerciseName,
      setNumber: currentExerciseProgress.nextSetNumber,
      totalSets: currentExerciseProgress.totalSets,
      targetReps: currentExerciseProgress.targetReps,
      targetWeight: currentExerciseProgress.targetWeight,
      targetUnit: currentExerciseProgress.targetUnit,
    };
  });

  const currentSetKey = $derived(
    currentSet
      ? `${currentSet.exerciseId}-${currentSet.setNumber}`
      : ""
  );

  const totalSetCount = $derived.by(() => {
    let totalPlanned = 0;
    for (const progress of exerciseProgressMap.values()) {
      totalPlanned += progress.totalSets;
    }
    return totalPlanned;
  });

  const completionCount = $derived(completedSets.length);

  const isWorkoutComplete = $derived.by(() => {
    if (!sessionStarted || exerciseProgressMap.size === 0) return false;

    for (const progress of exerciseProgressMap.values()) {
      if (progress.nextSetNumber <= progress.totalSets) {
        return false;
      }
    }
    return true;
  });

  const isTimeBasedSet = $derived(currentSet?.targetUnit === "s");

  const stopwatchSeconds = $derived(Math.round(stopwatchElapsedMs / 1000));

  const stopwatchSecondsPrecise = $derived(
    Number((stopwatchElapsedMs / 1000).toFixed(2))
  );

  const stopwatchDisplay = $derived.by(() => {
    const totalSeconds = Math.floor(stopwatchElapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((stopwatchElapsedMs % 1000) / 10);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
  });

  function initializeExerciseProgress(workout: Workout) {
    const newMap = new Map<number, ExerciseProgress>();

    for (const exercise of workout.exercises) {
      const exerciseId = Number(exercise.exercise_id);
      newMap.set(exerciseId, {
        workoutExerciseId: Number(exercise.id),
        exerciseId,
        exerciseName: exercise.exercise_name,
        totalSets: Number(exercise.sets),
        targetReps: (exercise.target_unit || "kg") === "s" ? 1 : Number(exercise.target_reps),
        targetWeight: exercise.target_weight == null ? null : Number(exercise.target_weight),
        targetUnit: exercise.target_unit || "kg",
        nextSetNumber: 1,
      });
    }

    return newMap;
  }

  function calculateAvailableNextOptions(): NextSetOption[] {
    if (!currentExerciseProgress) return [];

    const options: NextSetOption[] = [];
    const currentExerciseId = currentExerciseProgress.exerciseId;

    // Add "continue same exercise" option if sets remain
    if (currentExerciseProgress.nextSetNumber <= currentExerciseProgress.totalSets) {
      options.push({
        exerciseId: currentExerciseId,
        exerciseName: currentExerciseProgress.exerciseName,
        setNumber: currentExerciseProgress.nextSetNumber,
        totalSets: currentExerciseProgress.totalSets,
        isSameExercise: true,
        isSkipped: false,
      });
    }

    // Add options for other exercises with remaining sets
    for (const [exerciseId, progress] of exerciseProgressMap.entries()) {
      if (exerciseId === currentExerciseId) continue;

      if (progress.nextSetNumber <= progress.totalSets) {
        options.push({
          exerciseId,
          exerciseName: progress.exerciseName,
          setNumber: progress.nextSetNumber,
          totalSets: progress.totalSets,
          isSameExercise: false,
          isSkipped: false,
        });
      }
    }

    return options;
  }

  async function postSessionAction(payload: Record<string, unknown>) {
    const response = await fetch("/execute/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Unable to save workout session data.");
    }

    return response.json();
  }

  async function startSession() {
    if (!selectedWorkout || selectedWorkout.exercises.length === 0) {
      return;
    }

    const newProgressMap = initializeExerciseProgress(selectedWorkout);

    if (newProgressMap.size === 0) {
      return;
    }

    // Calculate total sets
    let totalSetsPlanned = 0;
    for (const progress of newProgressMap.values()) {
      totalSetsPlanned += progress.totalSets;
    }

    const sessionData = await postSessionAction({
      action: "start",
      workoutId: Number(selectedWorkout.id),
      totalSetsPlanned,
    });

    if (!sessionData || typeof sessionData.sessionId !== "number" || sessionData.sessionId <= 0) {
      throw new Error("Unable to initialize workout session storage.");
    }

    exerciseProgressMap = newProgressMap;
    // Start with the first exercise
    const firstExerciseId = Array.from(newProgressMap.keys())[0];
    currentExerciseId = firstExerciseId ?? null;

    completedSets = [];
    currentSessionId = sessionData.sessionId;
    persistenceError = null;
    showDeviationForm = false;
    showNextSetChooser = false;
    availableNextOptions = [];
    deviationReps = "";
    deviationWeight = "";
    deviationError = null;
    stopwatchElapsedMs = 0;
    stopwatchRunning = false;
    stopwatchAnchorMs = null;
    sessionStartedAt = new Date();
    sessionStarted = true;
  }

  async function endSession() {
    if (currentSessionId != null) {
      try {
        await postSessionAction({
          action: "complete",
          sessionId: currentSessionId,
          setsCompleted: completedSets.length,
        });
      } catch {
        persistenceError = "Session ended locally, but final results were not saved to the database.";
      }
    }

    sessionStarted = false;
    selectedWorkoutId = null;
    currentSessionId = null;
    sessionStartedAt = null;
    exerciseProgressMap = new Map();
    currentExerciseId = null;
    completedSets = [];
    showDeviationForm = false;
    showNextSetChooser = false;
    availableNextOptions = [];
    deviationReps = "";
    deviationWeight = "";
    deviationError = null;
    stopwatchElapsedMs = 0;
    stopwatchRunning = false;
    stopwatchAnchorMs = null;

    await invalidateAll();
  }

  async function completeCurrentSet(status: "expected" | "deviation", reps: number, weight: number | null) {
    if (!currentSet || !currentExerciseProgress) {
      return;
    }

    // Add to completed sets
    completedSets = [
      ...completedSets,
      {
        workoutExerciseId: currentExerciseProgress.workoutExerciseId,
        exerciseId: currentExerciseProgress.exerciseId,
        exerciseName: currentExerciseProgress.exerciseName,
        setNumber: currentSet.setNumber,
        totalSets: currentSet.totalSets,
        targetReps: currentSet.targetReps,
        targetWeight: currentSet.targetWeight,
        targetUnit: currentSet.targetUnit,
        actualReps: reps,
        actualWeight: weight,
        status,
      },
    ];

    // Persist to server
    if (currentSessionId != null) {
      try {
        await postSessionAction({
          action: "set",
          sessionId: currentSessionId,
          workoutExerciseId: currentExerciseProgress.workoutExerciseId,
          exerciseId: currentExerciseProgress.exerciseId,
          setNumber: currentSet.setNumber,
          targetReps: currentSet.targetReps,
          targetWeight: currentSet.targetWeight,
          targetUnit: currentSet.targetUnit,
          actualReps: reps,
          actualWeight: weight,
          status,
        });
      } catch {
        persistenceError = "Set completed locally, but could not be written to the database.";
      }
    }

    // Increment the set number for current exercise
    const updatedProgress = { ...currentExerciseProgress };
    updatedProgress.nextSetNumber += 1;

    // Create new map to trigger reactivity
    const newProgressMap = new Map(exerciseProgressMap);
    newProgressMap.set(currentExerciseProgress.exerciseId, updatedProgress);
    exerciseProgressMap = newProgressMap;

    // Calculate available options for the next set
    const options = calculateAvailableNextOptions();

    // Reset deviation form
    showDeviationForm = false;
    deviationReps = "";
    deviationWeight = "";
    deviationError = null;

    // Show next set chooser or end session
    if (options.length === 0) {
      // Workout complete
      if (currentSessionId != null) {
        try {
          await postSessionAction({
            action: "complete",
            sessionId: currentSessionId,
            setsCompleted: completedSets.length,
          });
        } catch (e) {
          persistenceError = "Workout marked complete locally, but final status was not saved.";
        }
      }
      await invalidateAll();
    } else {
      // Show options
      availableNextOptions = options;
      showNextSetChooser = true;
    }
  }

  function selectNextSet(exerciseId: number) {
    currentExerciseId = exerciseId;
    showNextSetChooser = false;
    availableNextOptions = [];
  }

  function startStopwatch() {
    if (stopwatchRunning) {
      return;
    }

    stopwatchAnchorMs = Date.now() - stopwatchElapsedMs;
    stopwatchRunning = true;
  }

  function pauseStopwatch() {
    stopwatchRunning = false;
  }

  function resetStopwatch() {
    stopwatchRunning = false;
    stopwatchElapsedMs = 0;
    stopwatchAnchorMs = null;
  }

  function useStopwatchTimeForDeviation() {
    deviationWeight = String(stopwatchSecondsPrecise);
  }

  async function completeAtStopwatchTime() {
    if (!currentSet || currentSet.targetUnit !== "s") {
      return;
    }

    const trackedSeconds = stopwatchSecondsPrecise;
    const targetSeconds = currentSet.targetWeight;
    const isExpected =
      targetSeconds != null && Math.abs(targetSeconds - trackedSeconds) < 0.01;

    await completeCurrentSet(
      isExpected ? "expected" : "deviation",
      1,
      trackedSeconds
    );
  }

  async function confirmExpectedSet() {
    if (!currentSet) {
      return;
    }

    await completeCurrentSet(
      "expected",
      currentSet.targetUnit === "s" ? 1 : currentSet.targetReps,
      currentSet.targetWeight
    );
  }

  async function saveDeviation() {
    if (!currentSet) {
      return;
    }

    let reps = currentSet.targetUnit === "s" ? 1 : Number.parseInt(deviationReps, 10);
    if (currentSet.targetUnit !== "s" && (!Number.isFinite(reps) || reps <= 0)) {
      deviationError = "Please enter a valid reps value greater than 0.";
      return;
    }

    let weight: number | null = currentSet.targetWeight;
    const trimmedWeight = deviationWeight.trim();
    if (trimmedWeight.length > 0) {
      const parsedWeight = Number.parseFloat(trimmedWeight);
      if (!Number.isFinite(parsedWeight) || parsedWeight < 0) {
        deviationError = "Weight must be empty or a valid number.";
        return;
      }
      weight = parsedWeight;
    }

    await completeCurrentSet("deviation", reps, weight);
  }

  const formattedSessionStartedAt = $derived(
    sessionStartedAt
      ? new Intl.DateTimeFormat(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(sessionStartedAt)
      : ""
  );

  const progressLabel = $derived(
    totalSetCount === 0
      ? "0/0"
      : `${completionCount} / ${totalSetCount} sets complete`
  );

  $effect(() => {
    currentSetKey;
    resetStopwatch();
  });

  $effect(() => {
    if (!stopwatchRunning || stopwatchAnchorMs == null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (stopwatchAnchorMs == null) {
        return;
      }

      stopwatchElapsedMs = Date.now() - stopwatchAnchorMs;
    }, 50);

    return () => window.clearInterval(intervalId);
  });
</script>

<div class="space-y-6 sm:space-y-8">
  <div>
    <Typography variant="display" size="sm" as="h1" color="tertiary">
      Execute Workout
    </Typography>
    <Typography variant="body" size="md" color="tertiary" as="p">
      Track your reps and weight in real time
    </Typography>
    <a href="/history" class="history-link mt-2 inline-block">View full workout history and analytics</a>
  </div>

  {#if persistenceError}
    <Card>
      <Typography variant="body" size="md" color="tertiary" as="p">
        {persistenceError}
      </Typography>
    </Card>
  {/if}

  {#if !sessionStarted}
    <div class="space-y-4 sm:space-y-6">
      <Card>
        <Typography variant="headline" size="md" as="h2" color="primary">
          Select Workout
        </Typography>
        {#if workouts.length === 0}
          <Typography variant="body" size="md" color="tertiary" as="p">
            No workouts available. <a
              href="/plans"
              class="text-primary hover:text-tertiary">Create one first</a
            >
          </Typography>
        {:else}
          <div class="space-y-2 sm:space-y-3">
            {#each workouts as workout (workout.id)}
              <label
                class="flex items-start p-3 sm:p-4 rounded-lg cursor-pointer transition-all"
                class:selected={selectedWorkoutId === workout.id}
              >
                <input
                  type="radio"
                  name="workout"
                  value={workout.id}
                  bind:group={selectedWorkoutId}
                  class="w-5 h-5 mt-0.5 shrink-0"
                />
                <div class="ml-3 sm:ml-4 min-w-0">
                  <Typography
                    variant="body"
                    size="md"
                    as="span"
                    color={selectedWorkoutId === workout.id ? "primary" : "default"}
                  >
                    {workout.name}
                  </Typography>
                  {#if workout.description}
                    <Typography
                      variant="body"
                      size="sm"
                      color="tertiary"
                      as="p"
                    >
                      {workout.description}
                    </Typography>
                  {/if}
                  <Typography variant="body" size="sm" color="tertiary" as="p">
                    {workout.exercises.length} exercises
                  </Typography>
                </div>
              </label>
            {/each}
          </div>
        {/if}
      </Card>

      {#if selectedWorkoutId}
        <Button
          variant="secondary"
          size="md"
          onclick={async () => {
            try {
              await startSession();
            } catch {
              persistenceError = "Could not start workout session storage. Please try again.";
            }
          }}
          disabled={!selectedWorkout || selectedWorkout.exercises.length === 0}
        >
          Start Workout Now
        </Button>
      {/if}
    </div>
  {:else}
    <Card>
      <div class="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8">
        <div>
          <Typography variant="headline" size="lg" as="h2" color="primary">
            {selectedWorkout?.name ?? "Workout Session"}
          </Typography>
          <Typography variant="body" size="sm" color="tertiary" as="p">
            {progressLabel}
          </Typography>
        </div>
        <Button
          variant="tertiary"
          size="md"
          onclick={async () => {
            await endSession();
          }}
        >
          End Session
        </Button>
      </div>

      <Typography variant="body" size="md" color="secondary" as="p">
        Started: {formattedSessionStartedAt}
      </Typography>

      {#if isWorkoutComplete}
        <div class="mt-6 space-y-3 sm:space-y-4">
          <Typography variant="headline" size="sm" as="h3" color="primary">
            Workout complete
          </Typography>
          <Typography variant="body" size="md" color="tertiary" as="p">
            All planned sets are completed.
          </Typography>
        </div>
      {:else if showNextSetChooser && availableNextOptions.length > 0}
        <div class="mt-6 space-y-4">
          <Typography variant="headline" size="sm" as="h3" color="primary">
            What's next?
          </Typography>
          <Typography variant="body" size="md" color="tertiary" as="p">
            Choose your next set to continue the workout
          </Typography>

          <div class="space-y-3">
            {#each availableNextOptions as option (option.exerciseId)}
              <button
                type="button"
                onclick={() => selectNextSet(option.exerciseId)}
                class="w-full text-left hover:opacity-80 transition-opacity"
              >
                <Card>
                  <div class="flex items-center justify-between">
                    <div>
                      <Typography variant="headline" size="sm" as="h4" color="primary">
                        {option.exerciseName}
                      </Typography>
                      <Typography variant="body" size="sm" color="tertiary" as="p">
                        Set {option.setNumber} of {option.totalSets}
                        {#if option.isSameExercise}
                          <span class="text-secondary"> • Continue current exercise</span>
                        {/if}
                      </Typography>
                    </div>
                    <Typography variant="body" size="md" color="secondary" as="span">
                      →
                    </Typography>
                  </div>
                </Card>
              </button>
            {/each}
          </div>
        </div>
      {:else if currentSet}
        <div class="mt-6 space-y-5 sm:space-y-6">
          <div class="active-set border rounded-lg p-4 sm:p-5">
            <Typography variant="headline" size="sm" as="h3" color="primary">
              {currentSet.exerciseName}
            </Typography>
            <Typography variant="body" size="sm" color="tertiary" as="p">
              Set {currentSet.setNumber} of {currentSet.totalSets}
            </Typography>

            <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {#if currentSet.targetUnit !== "s"}
                <div class="expected-chip">
                  <span class="chip-label">Expected reps</span>
                  <strong>{currentSet.targetReps}</strong>
                </div>
              {:else}
                <div class="expected-chip">
                  <span class="chip-label">Set mode</span>
                  <strong>Timed</strong>
                </div>
              {/if}
              <div class="expected-chip">
                <span class="chip-label">Expected amount</span>
                <strong>
                  {#if currentSet.targetWeight == null}
                    Bodyweight
                  {:else}
                    {currentSet.targetWeight} {currentSet.targetUnit}
                  {/if}
                </strong>
              </div>
            </div>

            {#if isTimeBasedSet}
              <div class="stopwatch-panel mt-4 rounded-lg p-4">
                <Typography variant="body" size="sm" as="p" color="secondary">
                  Stopwatch
                </Typography>
                <div class="stopwatch-readout" aria-live="polite">{stopwatchDisplay}</div>
                <div class="flex flex-wrap gap-2 mt-3">
                  <Button variant="secondary" size="sm" onclick={startStopwatch} disabled={stopwatchRunning}>
                    Start
                  </Button>
                  <Button variant="tertiary" size="sm" onclick={pauseStopwatch} disabled={!stopwatchRunning}>
                    Pause
                  </Button>
                  <Button variant="tertiary" size="sm" onclick={resetStopwatch}>
                    Reset
                  </Button>
                </div>
              </div>
            {/if}
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              variant="secondary"
              size="md"
              onclick={async () => {
                await confirmExpectedSet();
              }}
            >
              Confirm Expected
            </Button>
            {#if isTimeBasedSet}
              <Button
                variant="secondary"
                size="md"
                onclick={async () => {
                  await completeAtStopwatchTime();
                }}
              >
                Complete At Stopwatch Time
              </Button>
            {/if}
            <Button
              variant="primary"
              size="md"
              onclick={() => {
                showDeviationForm = !showDeviationForm;
                deviationError = null;
                if (showDeviationForm && currentSet) {
                  deviationReps = String(currentSet.targetReps);
                  deviationWeight = currentSet.targetWeight == null ? "" : String(currentSet.targetWeight);
                }
              }}
            >
              {showDeviationForm ? "Cancel Deviation" : "Record Deviation"}
            </Button>
          </div>

          {#if showDeviationForm}
            <div class="deviation-form border rounded-lg p-4 sm:p-5 space-y-4">
              {#if currentSet.targetUnit !== "s"}
                <div>
                  <label for="deviation-reps">
                    <Typography variant="body" size="sm" as="span" color="secondary">
                      Actual reps
                    </Typography>
                  </label>
                  <div class="mt-2">
                    <Input
                      id="deviation-reps"
                      name="deviation-reps"
                      type="number"
                      min={1}
                      step={1}
                      bind:value={deviationReps}
                    />
                  </div>
                </div>
              {/if}

              <div>
                <label for="deviation-weight">
                  <Typography variant="body" size="sm" as="span" color="secondary">
                    Actual amount ({currentSet.targetUnit})
                  </Typography>
                </label>
                <div class="mt-2">
                  <Input
                    id="deviation-weight"
                    name="deviation-weight"
                    type="number"
                    min={0}
                    step={currentSet.targetUnit === "s" ? 0.01 : 0.5}
                    bind:value={deviationWeight}
                  />
                </div>
                {#if currentSet.targetUnit === "s"}
                  <div class="mt-2">
                    <Button variant="tertiary" size="sm" onclick={useStopwatchTimeForDeviation}>
                      Use Stopwatch ({stopwatchSecondsPrecise}s)
                    </Button>
                  </div>
                {/if}
              </div>

              {#if deviationError}
                <Typography variant="body" size="sm" color="tertiary" as="p">
                  {deviationError}
                </Typography>
              {/if}

              <Button
                variant="secondary"
                size="md"
                onclick={async () => {
                  await saveDeviation();
                }}
              >
                Save Deviation
              </Button>
            </div>
          {/if}
        </div>
      {/if}

      {#if completedSets.length > 0}
        <div class="mt-6">
          <Typography variant="headline" size="sm" as="h3" color="primary">
            Completed Sets
          </Typography>
          <div class="mt-3 space-y-2">
            {#each completedSets.slice(-5).reverse() as setItem, index (`${setItem.workoutExerciseId}-${setItem.setNumber}-${index}`)}
              <div class="completed-set rounded-lg p-3">
                <Typography variant="body" size="sm" as="p" color="secondary">
                  {setItem.exerciseName} • Set {setItem.setNumber}/{setItem.totalSets}
                </Typography>
                <Typography variant="body" size="sm" as="p" color="tertiary">
                  {#if setItem.targetUnit === "s"}
                    {setItem.actualWeight ?? "—"} s
                  {:else}
                    {setItem.actualReps} reps
                    {#if setItem.actualWeight != null}
                      • {setItem.actualWeight} {setItem.targetUnit}
                    {/if}
                  {/if}
                  • {setItem.status === "expected" ? "as expected" : "deviation"}
                </Typography>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </Card>
  {/if}
</div>

<style>
  label.selected {
    background-color: var(--surface-container);
  }

  .active-set {
    border-color: var(--secondary);
    background-color: var(--surface-container-low);
  }

  .expected-chip {
    border: 1px solid var(--outline-variant);
    border-radius: 0.75rem;
    padding: 0.75rem;
    background-color: var(--surface-container-high);
  }

  .expected-chip strong {
    display: block;
    font-size: 1.15rem;
    color: var(--primary);
  }

  .chip-label {
    display: block;
    font-size: 0.8rem;
    color: var(--tertiary);
  }

  .deviation-form {
    border-color: var(--outline-variant);
    background-color: var(--surface-container-low);
  }

  .completed-set {
    background-color: var(--surface-container-low);
  }

  .stopwatch-panel {
    border: 1px solid var(--outline-variant);
    background: var(--surface-container-high);
  }

  .stopwatch-readout {
    margin-top: 0.25rem;
    font-size: 2rem;
    font-weight: 700;
    line-height: 1;
    color: var(--primary);
    font-variant-numeric: tabular-nums;
  }

  a {
    text-decoration: none;
  }

  .history-link {
    color: var(--secondary);
    text-decoration: none;
  }

  .history-link:hover,
  .history-link:focus-visible {
    color: var(--primary);
    text-decoration: underline;
  }
</style>
