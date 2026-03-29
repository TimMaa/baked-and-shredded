<script lang="ts">
  import Typography from "./Typography.svelte";
  import MuscleGroupCoverage from "./MuscleGroupCoverage.svelte";

  interface Workout {
    id: number;
    name: string;
    description?: string;
    focus_areas?: string[];
  }

  interface Props {
    workouts: Workout[];
    selected: number | null;
    onSelect: (workoutId: number) => void;
  }

  let { workouts = [], selected = null, onSelect }: Props = $props();

  let isOpen = $state(false);
  let searchTerm = $state("");

  const filteredWorkouts = $derived(
    workouts.filter(w =>
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    )
  );

  const selectedWorkout = $derived(workouts.find(w => w.id === selected));

  function handleSelect(workoutId: number) {
    onSelect(workoutId);
    isOpen = false;
    searchTerm = "";
  }

  function handleClickOutside(e: Event) {
    const target = e.target as HTMLElement;
    if (!target.closest('.workout-selector')) {
      isOpen = false;
    }
  }
</script>

<svelte:document onmousedown={handleClickOutside} />

<div class="workout-selector relative w-full">
  <button
    type="button"
    class="w-full px-3 py-2 border border-outline rounded-lg bg-surface text-on-surface text-left flex items-center justify-between hover:bg-surface-dim transition-colors"
    onclick={() => (isOpen = !isOpen)}
  >
    <span>
      {#if selectedWorkout}
        <div class="font-medium">{selectedWorkout.name}</div>
      {:else}
        <span class="text-on-surface-variant">Select a workout...</span>
      {/if}
    </span>
    <span class="text-lg">{isOpen ? "−" : "+"}</span>
  </button>

  {#if isOpen}
    <div class="absolute top-full left-0 right-0 mt-1 bg-surface border border-outline rounded-lg shadow-lg z-10">
      <div class="p-2 border-b border-outline-variant">
        <input
          type="text"
          placeholder="Search workouts..."
          class="w-full px-3 py-2 border border-outline rounded-lg bg-surface-container text-on-surface text-sm"
          bind:value={searchTerm}
          onkeydown={(e) => {
            if (e.key === 'Escape') {
              isOpen = false;
              searchTerm = "";
            }
          }}
        />
      </div>

      <div class="max-h-72 overflow-y-auto">
        {#if filteredWorkouts.length === 0}
          <div class="p-4 text-center text-on-surface-variant">
            <Typography variant="body" size="sm" as="p">
              No workouts found
            </Typography>
          </div>
        {:else}
          {#each filteredWorkouts as workout (workout.id)}
            <button
              type="button"
              class="w-full text-left px-4 py-3 hover:bg-surface-container transition-colors border-b border-outline-variant last:border-b-0"
              class:bg-primary-container={selected === workout.id}
              onclick={() => handleSelect(workout.id)}
            >
              <div class="font-medium text-on-surface">{workout.name}</div>
              {#if workout.description}
                <Typography variant="body" size="sm" color="tertiary" as="p">
                  {workout.description}
                </Typography>
              {/if}
              {#if workout.focus_areas && workout.focus_areas.length > 0}
                <div class="mt-2">
                  <MuscleGroupCoverage focusAreas={workout.focus_areas} compact />
                </div>
              {/if}
            </button>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  :global(.workout-selector) {
    font-family: inherit;
  }
</style>
