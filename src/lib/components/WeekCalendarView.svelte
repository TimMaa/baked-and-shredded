<script lang="ts">
  import Typography from "./Typography.svelte";
  import Button from "./Button.svelte";

  interface Workout {
    id: number;
    workoutName: string;
    targetReps: number;
    targetWeight?: number;
  }

  interface Day {
    id: number;
    day_of_week: string;
    workouts?: Workout[];
  }

  interface Props {
    days: Day[];
    expandedDay: number | null;
    onExpandDay: (dayId: number | null) => void;
    onAddClick: (dayId: number) => void;
    onRemoveClick: (workoutId: number, workoutName: string) => void;
  }

  let { days = [], expandedDay = null, onExpandDay, onAddClick, onRemoveClick }: Props = $props();

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Get all days in the plan
  const addedDays = $derived(days.map(d => d.day_of_week));

  // Create day slots with index for CSS grid
  const daySlots = $derived(
    daysOfWeek.map(dayName => {
      const dayData = days.find(d => d.day_of_week === dayName);
      return {
        name: dayName,
        short: dayName.substring(0, 3),
        data: dayData,
        index: daysOfWeek.indexOf(dayName)
      };
    })
  );
</script>

<div class="space-y-4">
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
    {#each daySlots as slot (slot.name)}
      <div class="border border-outline rounded-lg overflow-hidden flex flex-col min-h-32">
        {#if slot.data}
          <!-- Day with workouts -->
          <button
            class="flex-1 p-4 hover:bg-surface-dim transition-colors flex flex-col justify-between cursor-pointer"
            class:bg-primary-container={expandedDay === slot.data.id}
            onclick={() => onExpandDay(expandedDay === slot.data.id ? null : slot.data.id)}
          >
            <div class="text-left">
              <Typography variant="headline" size="sm" as="span" color="primary">
                {slot.name}
              </Typography>
              <div class="text-sm mt-2 space-y-1">
                {#if slot.data.workouts && slot.data.workouts.length > 0}
                  {#each slot.data.workouts.slice(0, 2) as workout}
                    <div class="text-on-surface text-xs line-clamp-1">
                      • {workout.workoutName}
                    </div>
                  {/each}
                  {#if slot.data.workouts.length > 2}
                    <div class="text-on-surface-variant text-xs">
                      +{slot.data.workouts.length - 2} more
                    </div>
                  {/if}
                {:else}
                  <div class="text-on-surface-variant text-xs italic">
                    No workouts
                  </div>
                {/if}
              </div>
            </div>

            <div class="text-lg text-on-surface self-end">
              {expandedDay === slot.data.id ? "−" : "+"}
            </div>
          </button>
        {:else}
          <!-- Empty day slot -->
          <div class="p-4 bg-surface-container text-center flex flex-col items-center justify-center h-full">
            <Typography variant="body" size="sm" color="tertiary" as="p">
              {slot.name}
            </Typography>
            <Typography variant="body" size="sm" color="tertiary" as="p">
              Not scheduled
            </Typography>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Expanded day details -->
  {#if expandedDay !== null}
    {#each days as day}
      {#if day.id === expandedDay}
        <div class="border-l-4 border-primary bg-primary-container bg-opacity-20 rounded-lg p-6 space-y-4">
          <div class="flex justify-between items-center">
            <Typography variant="headline" size="md" as="h3" color="primary">
              {day.day_of_week} Workouts
            </Typography>
            <button
              onclick={() => onExpandDay(null)}
              class="text-lg hover:opacity-75 transition-opacity"
            >
              ✕
            </button>
          </div>

          {#if day.workouts && day.workouts.length > 0}
            <div class="space-y-3">
              {#each day.workouts as workout}
                <div class="flex justify-between items-start p-3 bg-surface rounded-lg border border-outline">
                  <div class="flex-1">
                    <Typography variant="body" size="md" color="primary" as="p">
                      {workout.workoutName}
                    </Typography>
                    <Typography variant="body" size="sm" color="tertiary" as="p">
                      Target: {workout.targetReps} reps
                      {#if workout.targetWeight}
                        @ {workout.targetWeight}kg
                      {/if}
                    </Typography>
                  </div>
                  <button
                    type="button"
                    class="ml-2 shrink-0 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                    class:bg-red-100={true}
                    class:text-red-900={true}
                    class:hover:bg-red-200={true}
                    onclick={() => onRemoveClick(workout.id, workout.workoutName)}
                  >
                    Remove
                  </button>
                </div>
              {/each}
            </div>
          {/if}

          <Button
            type="button"
            variant="secondary"
            size="md"
            onclick={() => onAddClick(day.id)}
          >
            + Add Workout to {day.day_of_week}
          </Button>
        </div>
      {/if}
    {/each}
  {/if}
</div>

<style>
  :global(.line-clamp-1) {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    line-clamp: 1;
  }
</style>
