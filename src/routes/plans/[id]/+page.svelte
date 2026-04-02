<script lang="ts">
  import { enhance } from "$app/forms";
  import Button from "$lib/components/Button.svelte";
  import Card from "$lib/components/Card.svelte";
  import Typography from "$lib/components/Typography.svelte";
  import Input from "$lib/components/Input.svelte";
  import MuscleGroupCoverage from "$lib/components/MuscleGroupCoverage.svelte";
  import WorkoutSelector from "$lib/components/WorkoutSelector.svelte";
  import type { PageData, ActionData } from "./$types";

  let { data, form }: { data: PageData; form?: ActionData } = $props();

  let isEditingPlan = $state(false);
  let editName = $state("");
  let editDescription = $state("");
  let isSubmitting = $state(false);
  let errorMessage = $state<string | null>(null);
  let successMessage = $state<string | null>(null);

  let showAddForm = $state(false);
  let selectedWorkoutId = $state<number | null>(null);
  let selectedSets = $state("3");
  let selectedReps = $state("10");
  let selectedWeight = $state("");

  $effect(() => {
    editName = data.plan.name;
    editDescription = data.plan.description;
  });

  const handleUpdatePlan = async (e: Event) => {
    isSubmitting = true;
    errorMessage = null;
    successMessage = null;
  };

  const handleAddExercise = async (e: Event) => {
    isSubmitting = true;
    errorMessage = null;
  };

  $effect(() => {
    if (form?.success) {
      successMessage = "Updated successfully";
      isEditingPlan = false;
      isSubmitting = false;
      showAddForm = false;
      selectedWorkoutId = null;
      selectedSets = "3";
      selectedReps = "10";
      selectedWeight = "";
      setTimeout(() => {
        successMessage = null;
      }, 3000);
    } else if (form?.message) {
      errorMessage = form.message;
      isSubmitting = false;
    }
  });

  const resetAddForm = () => {
    showAddForm = false;
    selectedWorkoutId = null;
    selectedSets = "3";
    selectedReps = "10";
    selectedWeight = "";
    errorMessage = null;
  };
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
      <a href="/plans" class="text-primary hover:text-secondary text-sm mb-2 inline-block">← Back to Plans</a>
      <Typography variant="display" size="sm" as="h1" color="primary">
        {data.plan.name}
      </Typography>
      <Typography variant="body" size="md" color="tertiary" as="p">
        Configure your workout session
      </Typography>
    </div>
    {#if !isEditingPlan && !showAddForm}
      <Button
        variant="tertiary"
        size="md"
        onclick={() => (isEditingPlan = true)}
      >
        Edit Plan
      </Button>
    {/if}
  </div>

  {#if isEditingPlan}
    <Card>
      <form
        method="POST"
        action="?/updatePlan"
        use:enhance
        onsubmit={handleUpdatePlan}
      >
        <div class="space-y-4 sm:space-y-6">
          <div>
            <label for="edit-name">
              <Typography variant="body" size="md" as="span" color="secondary">
                Plan Name
              </Typography>
            </label>
            <div class="mt-2 sm:mt-3">
              <Input
                type="text"
                id="edit-name"
                name="name"
                required
                bind:value={editName}
                placeholder="e.g., Monday Upper Body"
              />
            </div>
          </div>

          <div>
            <label for="edit-description">
              <Typography variant="body" size="md" as="span" color="secondary">
                Description
              </Typography>
            </label>
            <div class="mt-2 sm:mt-3">
              <Input
                type="textarea"
                id="edit-description"
                name="description"
                rows={3}
                bind:value={editDescription}
                placeholder="Add details about this training session..."
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
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="tertiary"
              size="md"
              onclick={() => {
                isEditingPlan = false;
                editName = data.plan.name;
                editDescription = data.plan.description;
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

  {#if data.focusAreaRatings}
    <Card>
      <div class="mb-4">
        <Typography variant="headline" size="sm" as="h2" color="primary">
          Muscle Group Coverage
        </Typography>
      </div>
      <MuscleGroupCoverage muscleRatings={data.focusAreaRatings} />
    </Card>
  {/if}

  <div>
    <div class="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-4">
      <Typography variant="headline" size="md" as="h2" color="primary">
        Exercises
      </Typography>
      {#if !showAddForm && !isEditingPlan}
        <Button variant="primary" size="md" onclick={() => (showAddForm = true)}>
          + Add Exercise
        </Button>
      {/if}
    </div>

    {#if showAddForm}
      <Card>
        <form
          method="POST"
          action="?/addExercise"
          use:enhance
          onsubmit={handleAddExercise}
        >
          <div class="space-y-4 sm:space-y-6">
            <div>
              <label for="workout-select">
                <Typography variant="body" size="md" as="span" color="secondary">
                  Select Exercise
                </Typography>
              </label>
              <div class="mt-2 sm:mt-3">
                <WorkoutSelector
                  workouts={data.workouts}
                  selected={selectedWorkoutId}
                  onSelect={(id) => (selectedWorkoutId = id)}
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label for="sets">
                  <Typography variant="body" size="md" as="span" color="secondary">
                    Sets
                  </Typography>
                </label>
                <div class="mt-2 sm:mt-3">
                  <Input
                    type="number"
                    id="sets"
                    name="sets"
                    required
                    bind:value={selectedSets}
                    placeholder="3"
                  />
                </div>
              </div>

              <div>
                <label for="reps">
                  <Typography variant="body" size="md" as="span" color="secondary">
                    Reps per Set
                  </Typography>
                </label>
                <div class="mt-2 sm:mt-3">
                  <Input
                    type="number"
                    id="reps"
                    name="reps"
                    required
                    bind:value={selectedReps}
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <label for="weight">
                  <Typography variant="body" size="md" as="span" color="secondary">
                    Weight (kg)
                  </Typography>
                </label>
                <div class="mt-2 sm:mt-3">
                  <Input
                    type="number"
                    id="weight"
                    name="weight"
                    bind:value={selectedWeight}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <input type="hidden" name="workoutId" value={selectedWorkoutId} />

            <div class="flex flex-col gap-2 sm:flex-row sm:gap-4 pt-2 sm:pt-4">
              <Button
                type="submit"
                variant="secondary"
                size="md"
                disabled={isSubmitting || !selectedWorkoutId || !selectedSets || !selectedReps}
              >
                {isSubmitting ? "Adding..." : "Add Exercise"}
              </Button>
              <Button
                type="button"
                variant="tertiary"
                size="md"
                onclick={resetAddForm}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </Card>
    {/if}

    {#if !data.plan.exercises || data.plan.exercises.length === 0}
      <Card>
        <Typography variant="body" size="md" color="tertiary" as="p">
          No exercises added yet. Add your first exercise to set up this training session.
        </Typography>
      </Card>
    {:else}
      <div class="space-y-3 sm:space-y-4">
        {#each data.plan.exercises as exercise, index (exercise.id)}
          <Card>
            <div class="space-y-3">
              <div class="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
                <div class="flex-1">
                  <Typography variant="headline" size="sm" as="h3" color="primary">
                    {exercise.workout_name}
                  </Typography>
                    {#if exercise.focus_areas}
                    <div class="mt-2">
                        <MuscleGroupCoverage muscleRatings={exercise.focus_areas} compact />
                    </div>
                  {/if}
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div class="bg-surface-container-low p-3 rounded-lg">
                  <Typography variant="body" size="sm" color="tertiary" as="p">
                    SETS
                  </Typography>
                  <Typography variant="headline" size="md" color="primary" as="p">
                    {exercise.sets}
                  </Typography>
                </div>
                <div class="bg-surface-container-low p-3 rounded-lg">
                  <Typography variant="body" size="sm" color="tertiary" as="p">
                    REPS
                  </Typography>
                  <Typography variant="headline" size="md" color="primary" as="p">
                    {exercise.target_reps}
                  </Typography>
                </div>
                {#if exercise.target_weight}
                  <div class="bg-surface-container-low p-3 rounded-lg">
                    <Typography variant="body" size="sm" color="tertiary" as="p">
                      WEIGHT
                    </Typography>
                    <Typography variant="headline" size="md" color="primary" as="p">
                      {exercise.target_weight}kg
                    </Typography>
                  </div>
                {/if}
                <div class="flex items-end">
                  <form method="POST" action="?/removeExercise" style="display: contents;">
                    <input type="hidden" name="exerciseId" value={exercise.id} />
                    <Button
                      type="submit"
                      variant="tertiary"
                      size="sm"
                      onclick={() => {
                        if (!confirm(`Remove ${exercise.workout_name} from this plan?`)) {
                          event?.preventDefault();
                        }
                      }}
                    >
                      Remove
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </Card>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  a {
    text-decoration: none;
    color: inherit;
  }
</style>

