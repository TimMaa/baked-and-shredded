<script lang="ts">
  import { enhance } from "$app/forms";
  import Button from "$lib/components/Button.svelte";
  import Card from "$lib/components/Card.svelte";
  import Typography from "$lib/components/Typography.svelte";
  import Input from "$lib/components/Input.svelte";
  import MuscleGroupCoverage from "$lib/components/MuscleGroupCoverage.svelte";
  import WorkoutSelector from "$lib/components/WorkoutSelector.svelte";
  import WeekCalendarView from "$lib/components/WeekCalendarView.svelte";
  import type { PageData, ActionData } from "./$types";

  let { data, form }: { data: PageData; form?: ActionData } = $props();

  let isEditingPlan = $state(false);
  let editName = $state("");
  let editDescription = $state("");
  let isSubmitting = $state(false);
  let errorMessage = $state<string | null>(null);
  let successMessage = $state<string | null>(null);

  let expandedDay = $state<number | null>(null);
  let selectedWorkoutId = $state<number | null>(null);
  let targetReps = $state("");
  let targetWeight = $state("");

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const addedDays = $derived(data.plan.days ? data.plan.days.map((d: any) => d.day_of_week) : []);

  $effect(() => {
    editName = data.plan.name;
    editDescription = data.plan.description;
  });

  const handleUpdatePlan = async (e: Event) => {
    isSubmitting = true;
    errorMessage = null;
    successMessage = null;
  };

  const handleRemoveWorkout = (workoutName: string) => {
    return confirm(`Remove "${workoutName}" from this day?`);
  };

  $effect(() => {
    if (form?.success) {
      successMessage = "Updated successfully";
      isEditingPlan = false;
      isSubmitting = false;
      selectedWorkoutId = null;
      targetReps = "";
      targetWeight = "";
      expandedDay = null;
      setTimeout(() => {
        successMessage = null;
      }, 3000);
    } else if (form?.message) {
      errorMessage = form.message;
      isSubmitting = false;
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
      <a href="/plans" class="text-primary hover:text-secondary text-sm mb-2 inline-block">← Back to Plans</a>
      <Typography variant="display" size="sm" as="h1" color="secondary">
        {data.plan.name}
      </Typography>
      <Typography variant="body" size="md" color="tertiary" as="p">
        Manage your weekly schedule
      </Typography>
    </div>
    {#if !isEditingPlan}
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
                placeholder="e.g., Push Pull Legs"
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
                placeholder="Add details about this training plan..."
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

  {#if data.focusAreas && data.focusAreas.length > 0}
    <Card>
      <div class="mb-4">
        <Typography variant="headline" size="sm" as="h2" color="primary">
          Muscle Group Coverage
        </Typography>
      </div>
      <MuscleGroupCoverage focusAreas={data.focusAreas} />
    </Card>
  {/if}

  <div>
    <Typography variant="headline" size="md" as="h2" color="primary">
      Weekly Schedule
    </Typography>

    {#if !data.plan.days || data.plan.days.length === 0}
      <Card>
        <div class="mb-4">
          <Typography variant="body" size="md" color="tertiary" as="p">
            No days have been added yet. Add training days to get started.
          </Typography>
        </div>
        <div class="flex flex-wrap gap-2">
          {#each daysOfWeek as day}
            <form method="POST" action="?/addDay">
              <input type="hidden" name="day" value={day} />
              <Button type="submit" variant="secondary" size="sm">
                + Add {day.substring(0, 3)}
              </Button>
            </form>
          {/each}
        </div>
      </Card>
    {:else}
      <WeekCalendarView
        days={data.plan.days.map((day: any) => ({
          ...day,
          workouts: day.workouts ? JSON.parse(`[${day.workouts}]`) : []
        }))}
        expandedDay={expandedDay}
        onExpandDay={(dayId) => {
          expandedDay = dayId;
          selectedWorkoutId = null;
          targetReps = "";
          targetWeight = "";
        }}
        onAddClick={(dayId) => {
          expandedDay = dayId;
        }}
        onRemoveClick={(workoutId, workoutName) => {
          if (handleRemoveWorkout(workoutName)) {
            // Find and submit the hidden remove form
            const form = document.querySelector(`#remove-workout-${workoutId}`) as HTMLFormElement;
            if (form) {
              form.requestSubmit();
            }
          }
        }}
      />

      <!-- Hidden forms for removing workouts -->
      {#each data.plan.days as day}
        {#if day.workouts}
          {#each JSON.parse(`[${day.workouts}]`) as workout}
            <form id="remove-workout-{workout.id}" method="POST" action="?/removeWorkoutFromDay" style="display: none;">
              <input type="hidden" name="planWorkoutId" value={workout.id} />
            </form>
          {/each}
        {/if}
      {/each}

      {#if expandedDay !== null && data.plan.days}
        {#each data.plan.days as day}
          {#if day.id === expandedDay}
            <Card>
              <div class="mt-4 pt-4 space-y-4">
                <Typography variant="body" size="md" as="span" color="secondary">
                  Add Workout to {day.day_of_week}:
                </Typography>
                <WorkoutSelector
                  workouts={data.workouts}
                  selected={selectedWorkoutId}
                  onSelect={(id) => (selectedWorkoutId = id)}
                />

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label for="reps-{day.id}">
                      <Typography variant="body" size="sm" color="secondary" as="span">
                        Target Reps
                      </Typography>
                    </label>
                    <Input
                      type="number"
                      id="reps-{day.id}"
                      bind:value={targetReps}
                      placeholder="e.g., 10"
                    />
                  </div>
                  <div>
                    <label for="weight-{day.id}">
                      <Typography variant="body" size="sm" color="secondary" as="span">
                        Target Weight (kg)
                      </Typography>
                    </label>
                    <Input
                      type="number"
                      id="weight-{day.id}"
                      bind:value={targetWeight}
                      placeholder="e.g., 85"
                    />
                  </div>
                </div>

                <form method="POST" action="?/addWorkoutToDay">
                  <input type="hidden" name="planDayId" value={day.id} />
                  <input type="hidden" name="workoutId" value={selectedWorkoutId} />
                  <input type="hidden" name="targetReps" value={targetReps} />
                  <input type="hidden" name="targetWeight" value={targetWeight} />
                  <Button
                    type="submit"
                    variant="secondary"
                    size="md"
                    disabled={!selectedWorkoutId || !targetReps}
                    onclick={() => {
                      if (selectedWorkoutId && targetReps) {
                        selectedWorkoutId = null;
                        targetReps = "";
                        targetWeight = "";
                      }
                    }}
                  >
                    Add Workout
                  </Button>
                </form>
              </div>
            </Card>
          {/if}
        {/each}
      {/if}

      {#if addedDays.length < 7}
        <Card>
          <div class="mt-4 mb-4">
            <Typography variant="body" size="md" color="tertiary" as="p">
              Add more training days:
            </Typography>
          </div>
          <div class="flex flex-wrap gap-2">
            {#each daysOfWeek as day}
              {#if !addedDays.includes(day)}
                <form method="POST" action="?/addDay" style="display: contents;">
                  <input type="hidden" name="day" value={day} />
                  <Button type="submit" variant="secondary" size="sm">
                    + Add {day.substring(0, 3)}
                  </Button>
                </form>
              {/if}
            {/each}
          </div>
        </Card>
      {/if}
    {/if}
  </div>
</div>

<style>
  a {
    text-decoration: none;
    color: inherit;
  }
</style>
