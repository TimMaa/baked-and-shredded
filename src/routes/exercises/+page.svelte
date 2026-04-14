<script lang="ts">
  import { onMount } from 'svelte';
  import Button from "$lib/components/Button.svelte";
  import Card from "$lib/components/Card.svelte";
  import Typography from "$lib/components/Typography.svelte";
  import Input from "$lib/components/Input.svelte";
  import MuscleGroupSelector from "$lib/components/MuscleGroupSelector.svelte";
  import MuscleGroupCoverage from "$lib/components/MuscleGroupCoverage.svelte";
  import {
    createExerciseLocal,
    deleteExerciseLocal,
    getAllExercisesLocal,
    importExercisesFromCsv,
    updateExerciseLocal,
    type ExerciseRecord,
  } from '$lib/data/exercises';
  import { getDatabaseRuntimeStatus } from '$lib/data/sqlite';
  import { createDefaultMuscleRatings, totalMusclePoints, type MuscleRatings } from "$lib/muscleGroups";

  let showForm = $state(false);
  let formName = $state("");
  let formDescription = $state("");
  let formTip = $state("");
  let formMuscleRatings = $state<MuscleRatings>(createDefaultMuscleRatings());
  let exercises = $state<ExerciseRecord[]>([]);
  let csvFile = $state<File | null>(null);
  let isSubmitting = $state(false);
  let isImporting = $state(false);
  let isLoading = $state(true);
  let editingId = $state<number | null>(null);
  let errorMessage = $state<string | null>(null);
  let successMessage = $state<string | null>(null);
  const databaseStatus = getDatabaseRuntimeStatus();
  const isNativePlatform = databaseStatus.isNativePlatform;

  function resetFormState() {
    formName = "";
    formDescription = "";
    formTip = "";
    formMuscleRatings = createDefaultMuscleRatings();
    editingId = null;
    showForm = false;
  }

  async function loadExercises() {
    if (!isNativePlatform) {
      isLoading = false;
      return;
    }

    isLoading = true;
    try {
      exercises = await getAllExercisesLocal();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Failed to load exercises';
    } finally {
      isLoading = false;
    }
  }

  onMount(async () => {
    await loadExercises();
  });

  const handleAddExercise = async (event: SubmitEvent) => {
    event.preventDefault();
    isSubmitting = true;
    errorMessage = null;
    successMessage = null;

    try {
      await createExerciseLocal({
        name: formName,
        description: formDescription,
        tip: formTip,
        focusAreas: formMuscleRatings,
      });
      await loadExercises();
      successMessage = 'Exercise created successfully';
      resetFormState();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Failed to create exercise';
    } finally {
      isSubmitting = false;
    }
  };

  const handleEditClick = (
    id: number,
    name: string,
    description: string,
    tip: string,
    focusAreas: MuscleRatings
  ) => {
    editingId = id;
    formName = name;
    formDescription = description;
    formTip = tip || "";
    formMuscleRatings = focusAreas || createDefaultMuscleRatings();
    errorMessage = null;
    successMessage = null;
  };

  const handleSaveEdit = async (event: SubmitEvent) => {
    event.preventDefault();
    isSubmitting = true;
    errorMessage = null;

    try {
      await updateExerciseLocal({
        id: editingId ?? undefined,
        name: formName,
        description: formDescription,
        tip: formTip,
        focusAreas: formMuscleRatings,
      });
      await loadExercises();
      successMessage = 'Exercise updated successfully';
      resetFormState();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Failed to update exercise';
    } finally {
      isSubmitting = false;
    }
  };

  const handleCancelEdit = () => {
    resetFormState();
    errorMessage = null;
  };

  const handleDeleteClick = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    isSubmitting = true;
    errorMessage = null;
    successMessage = null;

    try {
      await deleteExerciseLocal(id);
      await loadExercises();
      successMessage = 'Exercise deleted successfully';
      if (editingId === id) {
        resetFormState();
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Failed to delete exercise';
    } finally {
      isSubmitting = false;
    }
  };

  async function handleImportSubmit(event: SubmitEvent) {
    event.preventDefault();

    if (!csvFile) {
      errorMessage = 'Please select a CSV file';
      return;
    }

    isImporting = true;
    errorMessage = null;
    successMessage = null;

    try {
      const result = await importExercisesFromCsv(csvFile);
      await loadExercises();
      csvFile = null;
      successMessage = `Imported ${result.imported} exercises${result.skipped ? `, skipped ${result.skipped}` : ''}.`;
      if (result.skippedDetails.length > 0) {
        errorMessage = result.skippedDetails.slice(0, 3).join(' ');
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Failed to import exercises';
    } finally {
      isImporting = false;
    }
  }

  function handleCsvFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    csvFile = input.files?.[0] ?? null;
  }
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
        Your Exercises
      </Typography>
      <Typography variant="body" size="md" color="tertiary" as="p">
        Build your exercise library
      </Typography>
    </div>
    {#if !editingId && !showForm}
      <Button
        variant="primary"
        size="md"
        onclick={() => (showForm = !showForm)}
      >
        + Add Exercise
      </Button>
    {/if}
  </div>

  <Card>
    <div class="space-y-3">
      <Typography variant="headline" size="sm" as="h2" color="secondary">
        Import Exercises From CSV
      </Typography>
      <Typography variant="body" size="sm" color="tertiary" as="p">
        Required column: exercise. Optional columns: description, tip. Use simplified muscle group columns with values 0-5.
      </Typography>
      <Typography variant="body" size="sm" color="tertiary" as="p" className="overflow-x-clip text-ellipsis">
        Example header: exercise,description,tip,Chest,Back,Shoulders,Biceps,Triceps,Forearms,Abs,Lower_Back,Glutes,Quads,Hamstrings,Calves,Adductors_Abductors
      </Typography>

      <form onsubmit={handleImportSubmit} enctype="multipart/form-data">
        <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
          <input
            type="file"
            accept=".csv,text/csv"
            required
            oninput={handleCsvFileChange}
            class="block w-full text-sm text-tertiary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-primary-container file:text-on-primary hover:file:opacity-90"
          />
          <Button type="submit" variant="secondary" size="md" disabled={isImporting || !isNativePlatform}>
            {isImporting ? 'Importing...' : 'Import CSV'}
          </Button>
        </div>
      </form>
    </div>
  </Card>

  {#if !isNativePlatform}
    <Card>
      <Typography variant="body" size="md" color="tertiary" as="p">
        Exercise management is available in the Android app runtime. The current browser preview keeps building, but local SQLite CRUD is native-only.
      </Typography>
    </Card>
  {/if}

  {#if showForm && !editingId}
    <Card>
      <form onsubmit={handleAddExercise}>
        <div class="space-y-4 sm:space-y-6">
          <div>
            <label for="name">
              <Typography
                variant="body"
                size="md"
                as="span"
                color="secondary"
              >
                Exercise Name
              </Typography>
            </label>
            <div class="mt-2 sm:mt-3">
              <Input
                type="text"
                id="name"
                name="name"
                required
                bind:value={formName}
                placeholder="e.g., Bench Press"
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
                placeholder="Add notes about this exercise..."
              />
            </div>
          </div>

          <div>
            <label for="tip">
              <Typography variant="body" size="md" as="span" color="secondary">
                Tip
              </Typography>
            </label>
            <div class="mt-2 sm:mt-3">
              <Input
                type="textarea"
                id="tip"
                name="tip"
                rows={2}
                bind:value={formTip}
                placeholder="Optional technique tip..."
              />
            </div>
          </div>

          <div>
            <label for="focus-areas">
              <Typography variant="body" size="md" as="span" color="secondary">
                Muscle Group Effectiveness (0-5)
              </Typography>
            </label>
            <div class="mt-2 sm:mt-3">
              <MuscleGroupSelector bind:selected={formMuscleRatings} required maxPoints={25} />
            </div>
            <div class="mt-2">
              <Typography variant="body" size="sm" color="tertiary" as="p">
                Total points: {totalMusclePoints(formMuscleRatings)}/25
              </Typography>
            </div>
          </div>

          <div class="flex flex-col gap-2 sm:flex-row sm:gap-4 pt-2 sm:pt-4">
            <Button
              type="submit"
              variant="secondary"
              size="md"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Exercise"}
            </Button>
            <Button
              type="button"
              variant="tertiary"
              size="md"
              onclick={() => {
                resetFormState();
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

  <div class="space-y-3 sm:space-y-4">
    {#if isLoading}
      <div>Loading...</div>
    {:else}
      {#if exercises.length === 0}
        <Card>
          <Typography
            variant="body"
            size="md"
            color="tertiary"
            as="p"
          >
            No exercises yet. Create your first one!
          </Typography>
        </Card>
      {:else}
        {#each exercises as exercise (exercise.id)}
          {#if editingId === exercise.id}
            <Card>
              <form onsubmit={handleSaveEdit}>
                <div class="space-y-4 sm:space-y-6">
                  <div>
                    <label for="edit-name">
                      <Typography
                        variant="body"
                        size="md"
                        as="span"
                        color="secondary"
                      >
                        Exercise Name
                      </Typography>
                    </label>
                    <div class="mt-2 sm:mt-3">
                      <Input
                        type="text"
                        id="edit-name"
                        name="name"
                        required
                        bind:value={formName}
                        placeholder="e.g., Bench Press"
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
                        bind:value={formDescription}
                        placeholder="Add notes about this exercise..."
                      />
                    </div>
                  </div>

                  <div>
                    <label for="edit-tip">
                      <Typography variant="body" size="md" as="span" color="secondary">
                        Tip
                      </Typography>
                    </label>
                    <div class="mt-2 sm:mt-3">
                      <Input
                        type="textarea"
                        id="edit-tip"
                        name="tip"
                        rows={2}
                        bind:value={formTip}
                        placeholder="Optional technique tip..."
                      />
                    </div>
                  </div>

                  <div>
                    <label for="edit-focus-areas">
                      <Typography variant="body" size="md" as="span" color="secondary">
                        Muscle Group Effectiveness (0-5)
                      </Typography>
                    </label>
                    <div class="mt-2 sm:mt-3">
                      <MuscleGroupSelector bind:selected={formMuscleRatings} required maxPoints={25} />
                    </div>
                    <div class="mt-2">
                      <Typography variant="body" size="sm" color="tertiary" as="p">
                        Total points: {totalMusclePoints(formMuscleRatings)}/25
                      </Typography>
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
                      onclick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            </Card>
          {:else}
            <Card>
              <div class="flex flex-col gap-3 sm:gap-6 sm:flex-row sm:justify-between sm:items-start">
                <div class="flex-1 min-w-0">
                  <Typography
                    variant="headline"
                    size="sm"
                    as="h2"
                    color="primary"
                  >
                    {exercise.name}
                  </Typography>
                  {#if exercise.description}
                    <Typography
                      variant="body"
                      size="sm"
                      color="tertiary"
                      as="p"
                    >
                      {exercise.description}
                    </Typography>
                  {/if}
                  {#if exercise.tip}
                    <Typography variant="body" size="sm" color="secondary" as="p">
                      Tip: {exercise.tip}
                    </Typography>
                  {/if}
                  {#if exercise.focus_areas}
                    <div class="mt-3 pt-3 border-t border-gray-200">
                      <MuscleGroupCoverage muscleRatings={exercise.focus_areas} compact />
                    </div>
                  {/if}
                </div>
                <div class="flex flex-col gap-2 sm:flex-row sm:gap-3 shrink-0 w-full sm:w-auto">
                  <Button
                    variant="secondary"
                    size="sm"
                    onclick={() => handleEditClick(exercise.id, exercise.name, exercise.description, exercise.tip, exercise.focus_areas)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onclick={() => handleDeleteClick(exercise.id, exercise.name)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          {/if}
        {/each}
      {/if}
    {/if}
  </div>
</div>
