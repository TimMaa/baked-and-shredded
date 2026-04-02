<script lang="ts">
  import { enhance } from "$app/forms";
  import { flip } from "svelte/animate";
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
  let selectedExerciseId = $state<number | null>(null);
  let selectedSets = $state("3");
  let selectedReps = $state("10");
  let selectedTargetUnit = $state<'kg' | 's'>("kg");
  let selectedTargetValue = $state("");
  let orderedExercises = $state<PageData['plan']['exercises']>([]);
  let draggedExerciseId = $state<number | null>(null);
  let dragOverExerciseId = $state<number | null>(null);
  let reorderForm = $state<HTMLFormElement | null>(null);
  let reorderedIdsInput = $state<HTMLInputElement | null>(null);

  $effect(() => {
    editName = data.plan.name;
    editDescription = data.plan.description;
    orderedExercises = data.plan.exercises ?? [];
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
      successMessage = form.message || "Updated successfully";
      isEditingPlan = false;
      isSubmitting = false;
      showAddForm = false;
      selectedExerciseId = null;
      selectedSets = "3";
      selectedReps = "10";
      selectedTargetUnit = "kg";
      selectedTargetValue = "";
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
    selectedExerciseId = null;
    selectedSets = "3";
    selectedReps = "10";
    selectedTargetUnit = "kg";
    selectedTargetValue = "";
    errorMessage = null;
  };

  const persistExerciseOrder = () => {
    if (!reorderedIdsInput || !reorderForm) {
      return;
    }

    reorderedIdsInput.value = JSON.stringify(orderedExercises.map((exercise) => exercise.id));
    isSubmitting = true;
    errorMessage = null;
    successMessage = null;
    reorderForm.requestSubmit();
  };

  const moveExerciseRelative = (exerciseId: number, direction: -1 | 1) => {
    const currentIndex = orderedExercises.findIndex((exercise) => exercise.id === exerciseId);
    if (currentIndex === -1) {
      return;
    }

    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= orderedExercises.length) {
      return;
    }

    const reordered = [...orderedExercises];
    const [movedExercise] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, movedExercise);
    orderedExercises = reordered;
    persistExerciseOrder();
  };

  const reorderByDropTarget = (draggedId: number, dropTargetId: number) => {
    if (draggedId === dropTargetId) {
      return;
    }

    const sourceIndex = orderedExercises.findIndex((exercise) => exercise.id === draggedId);
    const targetIndex = orderedExercises.findIndex((exercise) => exercise.id === dropTargetId);

    if (sourceIndex === -1 || targetIndex === -1) {
      return;
    }

    const reordered = [...orderedExercises];
    const [movedExercise] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, movedExercise);
    orderedExercises = reordered;
    persistExerciseOrder();
  };

  const handleDragStart = (event: DragEvent, exerciseId: number) => {
    event.dataTransfer?.setData("text/plain", String(exerciseId));
    event.dataTransfer?.setDragImage(event.currentTarget as Element, 20, 20);
    event.dataTransfer!.effectAllowed = "move";
    draggedExerciseId = exerciseId;
  };

  const handleDragOver = (event: DragEvent, exerciseId: number) => {
    event.preventDefault();
    dragOverExerciseId = exerciseId;
  };

  const handleDrop = (event: DragEvent, exerciseId: number) => {
    event.preventDefault();

    if (draggedExerciseId == null) {
      return;
    }

    reorderByDropTarget(draggedExerciseId, exerciseId);
    dragOverExerciseId = null;
    draggedExerciseId = null;
  };

  const handleDragEnd = () => {
    dragOverExerciseId = null;
    draggedExerciseId = null;
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
                  selected={selectedExerciseId}
                  onSelect={(id) => (selectedExerciseId = id)}
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
                <label for="target-unit">
                  <Typography variant="body" size="md" as="span" color="secondary">
                    Unit
                  </Typography>
                </label>
                <div class="mt-2 sm:mt-3">
                  <select
                    id="target-unit"
                    name="targetUnit"
                    bind:value={selectedTargetUnit}
                    class="w-full"
                  >
                    <option value="kg">Weight (kg)</option>
                    <option value="s">Time (s)</option>
                  </select>
                </div>
              </div>

              <div>
                <label for="target-value">
                  <Typography variant="body" size="md" as="span" color="secondary">
                    {selectedTargetUnit === 'kg' ? 'Weight per Rep (kg)' : 'Time per Rep (s)'}
                  </Typography>
                </label>
                <div class="mt-2 sm:mt-3">
                  <Input
                    type="number"
                    id="target-value"
                    name="targetValue"
                    required
                    bind:value={selectedTargetValue}
                    placeholder={selectedTargetUnit === 'kg' ? 'e.g. 20' : 'e.g. 30'}
                  />
                </div>
              </div>
            </div>

            <input type="hidden" name="exerciseId" value={selectedExerciseId} />

            <div class="flex flex-col gap-2 sm:flex-row sm:gap-4 pt-2 sm:pt-4">
              <Button
                type="submit"
                variant="secondary"
                size="md"
                disabled={isSubmitting || !selectedExerciseId || !selectedSets || !selectedReps || !selectedTargetValue}
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
        <form method="POST" action="?/reorderExercises" use:enhance bind:this={reorderForm} class="sr-only">
          <input type="hidden" name="orderedExerciseIds" bind:this={reorderedIdsInput} />
        </form>

      <div class="space-y-3 sm:space-y-4" role="list" aria-label="Exercises in workout">
          {#each orderedExercises as exercise, index (exercise.id)}
            <div animate:flip={{ duration: 220 }}>
              <Card>
                <div
                  class="space-y-3 exercise-card"
                  class:is-drag-over={dragOverExerciseId === exercise.id}
                  role="listitem"
                  draggable="true"
                  ondragstart={(event) => handleDragStart(event, exercise.id)}
                  ondragover={(event) => handleDragOver(event, exercise.id)}
                  ondrop={(event) => handleDrop(event, exercise.id)}
                  ondragend={handleDragEnd}
                >
                <div class="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
                  <div class="flex-1">
                    <Typography variant="body" size="sm" color="tertiary" as="p">
                      Order #{index + 1}
                    </Typography>
                    <Typography variant="headline" size="sm" as="h3" color="primary">
                      {exercise.exercise_name}
                    </Typography>
                      {#if exercise.focus_areas}
                      <div class="mt-2">
                          <MuscleGroupCoverage muscleRatings={exercise.focus_areas} compact />
                      </div>
                    {/if}
                </div>
                  <div class="exercise-actions" aria-label={`Reorder ${exercise.exercise_name}`}>
                    <Button
                      type="button"
                      variant="tertiary"
                      size="sm"
                      disabled={isSubmitting || index === 0}
                      onclick={() => moveExerciseRelative(exercise.id, -1)}
                    >
                      Move Up
                    </Button>
                    <Button
                      type="button"
                      variant="tertiary"
                      size="sm"
                      disabled={isSubmitting || index === orderedExercises.length - 1}
                      onclick={() => moveExerciseRelative(exercise.id, 1)}
                    >
                      Move Down
                    </Button>
                    <form method="POST" action="?/removeExercise" style="display: contents;">
                      <input type="hidden" name="exerciseId" value={exercise.id} />
                      <Button
                        type="submit"
                        variant="tertiary"
                        size="sm"
                        onclick={() => {
                          if (!confirm(`Remove ${exercise.exercise_name} from this workout?`)) {
                            event?.preventDefault();
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </form>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  <div class="bg-surface-container-low p-3 rounded-lg">
                    <Typography variant="body" size="sm" color="tertiary" as="p">
                      {exercise.target_unit === 's' ? 'TIME / REP' : 'WEIGHT / REP'}
                    </Typography>
                    <Typography variant="headline" size="md" color="primary" as="p">
                      {exercise.target_weight ?? '—'}{exercise.target_weight == null ? '' : exercise.target_unit}
                    </Typography>
                  </div>
                </div>
              </div>
              </Card>
            </div>
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

  .exercise-card {
    cursor: grab;
  }

  .exercise-card:active {
    cursor: grabbing;
  }

  .exercise-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .exercise-actions :global(button) {
    min-width: 6.75rem;
  }

  @media (max-width: 640px) {
    .exercise-actions {
      justify-content: flex-start;
    }
  }

  .is-drag-over {
    outline: 2px solid var(--secondary);
    outline-offset: 4px;
    border-radius: var(--radius-sm);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>

