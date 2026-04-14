<script lang="ts">
  import { onMount } from "svelte";
  import Button from "$lib/components/Button.svelte";
  import Card from "$lib/components/Card.svelte";
  import Typography from "$lib/components/Typography.svelte";
  import Input from "$lib/components/Input.svelte";
  import MuscleGroupCoverage from "$lib/components/MuscleGroupCoverage.svelte";
  import {
    createWorkoutLocal,
    deleteWorkoutLocal,
    getAllWorkoutsLocal,
    getWorkoutWithExercisesLocal,
    type WorkoutRecord,
  } from "$lib/data/workouts";
  import {
    createDefaultMuscleRatings,
    normalizeMuscleRatings,
    type MuscleRatings,
  } from "$lib/muscleGroups";

  type WorkoutListItem = WorkoutRecord & {
    exerciseCount: number;
    focusAreaRatings: MuscleRatings;
  };

  let showForm = $state(false);
  let formName = $state("");
  let formDescription = $state("");
  let isSubmitting = $state(false);
  let isLoading = $state(true);
  let errorMessage = $state<string | null>(null);
  let successMessage = $state<string | null>(null);
  let plans = $state<WorkoutListItem[]>([]);

  async function loadPlans() {
    isLoading = true;
    const workouts = await getAllWorkoutsLocal();

    plans = await Promise.all(
      workouts.map(async (workout) => {
        const workoutWithExercises = await getWorkoutWithExercisesLocal(workout.id);
        const focusAreaRatings = createDefaultMuscleRatings();

        if (workoutWithExercises?.exercises && Array.isArray(workoutWithExercises.exercises)) {
          for (const exercise of workoutWithExercises.exercises) {
            if (exercise.focus_areas && typeof exercise.focus_areas === "object") {
              const normalized = normalizeMuscleRatings(exercise.focus_areas);
              for (const [group, rating] of Object.entries(normalized)) {
                focusAreaRatings[group] = (focusAreaRatings[group] ?? 0) + Number(rating || 0);
              }
            }
          }
        }

        return {
          ...workout,
          exerciseCount: workoutWithExercises?.exercises?.length || 0,
          focusAreaRatings,
        };
      })
    );

    isLoading = false;
  }

  async function handleCreateWorkout(event: SubmitEvent) {
    event.preventDefault();
    isSubmitting = true;
    errorMessage = null;
    successMessage = null;

    try {
      await createWorkoutLocal(formName, formDescription);
      await loadPlans();
      successMessage = "Workout created successfully";
      formName = "";
      formDescription = "";
      showForm = false;
      setTimeout(() => {
        successMessage = null;
      }, 3000);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Failed to create workout";
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDeleteWorkout(planId: number, planName: string) {
    if (!confirm(`Are you sure you want to delete "${planName}"?`)) {
      return;
    }

    isSubmitting = true;
    errorMessage = null;
    successMessage = null;

    try {
      await deleteWorkoutLocal(planId);
      await loadPlans();
      successMessage = "Workout deleted successfully";
      setTimeout(() => {
        successMessage = null;
      }, 3000);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Failed to delete workout";
    } finally {
      isSubmitting = false;
    }
  }

  onMount(async () => {
    try {
      await loadPlans();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Failed to load workouts";
      isLoading = false;
    }
  });
</script>

<div class="space-y-6 sm:space-y-8">
  {#if errorMessage}
    <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
      <Typography variant="body" size="md" color="tertiary" as="p">
        ❌ {errorMessage}
      </Typography>
    </div>
  {/if}

  {#if successMessage}
    <div class="p-4 bg-green-50 border border-green-200 rounded-lg">
      <Typography variant="body" size="md" color="tertiary" as="p">
        ✓ {successMessage}
      </Typography>
    </div>
  {/if}

  <div class="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
    <div>
      <Typography variant="display" size="sm" as="h1" color="primary">
        Workouts
      </Typography>
      <Typography variant="body" size="md" color="tertiary" as="p">
        Build weekly programming with targeted exercises
      </Typography>
    </div>
    {#if !showForm}
      <Button
        variant="primary"
        size="md"
        onclick={() => (showForm = true)}
      >
        + Create Workout
      </Button>
    {/if}
  </div>

  {#if showForm}
    <Card>
      <form onsubmit={handleCreateWorkout}>
        <div class="space-y-4 sm:space-y-6">
          <div>
            <label for="name">
              <Typography variant="body" size="md" as="span" color="secondary">
                Workout Name
              </Typography>
            </label>
            <div class="mt-2 sm:mt-3">
              <Input
                type="text"
                id="name"
                name="name"
                required
                bind:value={formName}
                placeholder="e.g., Monday Upper Body"
              />
            </div>
          </div>

          <div>
            <label for="description">
              <Typography variant="body" size="md" as="span" color="secondary">
                Description
              </Typography>
            </label>
            <div class="mt-2 sm:mt-3">
              <Input
                type="textarea"
                id="description"
                name="description"
                rows={3}
                bind:value={formDescription}
                placeholder="Add details about this workout..."
              />
            </div>
          </div>

          <div class="flex flex-col gap-2 sm:flex-row sm:gap-4 pt-2 sm:pt-4">
            <Button
              type="submit"
              variant="secondary"
              size="md"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Workout"}
            </Button>
            <Button
              type="button"
              variant="tertiary"
              size="md"
              onclick={() => {
                showForm = false;
                formName = "";
                formDescription = "";
                errorMessage = null;
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </Card>
  {/if}

  {#if isLoading}
    <div class="py-8">
      <Typography variant="body" size="md" color="tertiary" as="p">
        Loading training workouts...
      </Typography>
    </div>
  {:else}
    <div class="space-y-3 sm:space-y-4">
      {#if plans.length === 0}
        <Card>
          <Typography variant="body" size="md" color="tertiary" as="p">
            No workouts yet. Create your first workout to get started!
          </Typography>
        </Card>
      {:else}
        {#each plans as plan (plan.id)}
          <Card>
            <div class="flex flex-col gap-3 sm:gap-6 sm:flex-row sm:justify-between sm:items-start">
              <div class="flex-1 min-w-0">
                <a href="/plans/{plan.id}" class="no-underline hover:opacity-80 transition-opacity">
                  <Typography
                    variant="headline"
                    size="sm"
                    as="h2"
                    color="primary"
                  >
                    {plan.name}
                  </Typography>
                </a>
                {#if plan.description}
                  <Typography
                    variant="body"
                    size="sm"
                    color="tertiary"
                    as="p"
                  >
                    {plan.description}
                  </Typography>
                {/if}
                <div class="mt-3 space-y-2">
                  <Typography variant="body" size="sm" color="tertiary" as="p">
                    {plan.exerciseCount} {plan.exerciseCount === 1 ? 'exercise' : 'exercises'} • Created {new Date(plan.created_at).toLocaleDateString()}
                  </Typography>
                  {#if plan.focusAreaRatings}
                    <MuscleGroupCoverage muscleRatings={plan.focusAreaRatings} compact />
                  {/if}
                </div>
              </div>
              <div class="flex flex-col gap-2 sm:flex-row sm:gap-3 shrink-0 w-full sm:w-auto">
                <a href="/plans/{plan.id}" class="no-underline">
                  <Button variant="secondary" size="sm" className="w-full">
                    Edit
                  </Button>
                </a>
                <Button
                  type="button"
                  variant="tertiary"
                  size="sm"
                  disabled={isSubmitting}
                  onclick={() => handleDeleteWorkout(plan.id, plan.name)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  a {
    text-decoration: none;
    color: inherit;
  }
</style>
