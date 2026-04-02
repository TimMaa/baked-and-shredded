<script lang="ts">
  import Typography from "./Typography.svelte";
  import { getMuscleGroupLabel } from "$lib/muscleGroups";

  interface Workout {
    id: number;
    name: string;
    description?: string;
    focus_areas?: Record<string, number>;
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

  function topRatedMuscles(workout: Workout): string {
    if (!workout.focus_areas || typeof workout.focus_areas !== 'object') return '';

    const top = Object.entries(workout.focus_areas)
      .filter(([, rating]) => typeof rating === 'number' && rating > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([group, rating]) => `${getMuscleGroupLabel(group)} ${rating}`);

    return top.join(' · ');
  }

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
    class="selector-trigger"
    onclick={() => (isOpen = !isOpen)}
    aria-expanded={isOpen}
    aria-haspopup="listbox"
  >
    <span class="min-w-0">
      {#if selectedWorkout}
        <span class="selected-name">{selectedWorkout.name}</span>
        {#if topRatedMuscles(selectedWorkout)}
          <span class="selected-meta">{topRatedMuscles(selectedWorkout)}</span>
        {/if}
      {:else}
        <span class="placeholder">Select a workout...</span>
      {/if}
    </span>
    <span class="indicator">{isOpen ? "−" : "+"}</span>
  </button>

  {#if isOpen}
    <div class="dropdown-panel">
      <div class="search-wrap">
        <input
          type="text"
          placeholder="Search workouts..."
          class="search-input"
          bind:value={searchTerm}
          onkeydown={(e) => {
            if (e.key === 'Escape') {
              isOpen = false;
              searchTerm = "";
            }
          }}
        />
      </div>

      <div class="results" role="listbox">
        {#if filteredWorkouts.length === 0}
          <div class="empty-state">
            <Typography variant="body" size="sm" as="p">
              No workouts found
            </Typography>
          </div>
        {:else}
          {#each filteredWorkouts as workout (workout.id)}
            <button
              type="button"
              class="result-item"
              class:selected={selected === workout.id}
              onclick={() => handleSelect(workout.id)}
              role="option"
              aria-selected={selected === workout.id}
            >
              <span class="result-name">{workout.name}</span>
              {#if topRatedMuscles(workout)}
                <span class="result-meta">{topRatedMuscles(workout)}</span>
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

  .selector-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    text-align: left;
    padding: var(--spacing-4) var(--spacing-5);
    background: var(--surface-container-lowest);
    border: none;
    border-bottom: 3px solid var(--outline);
    border-radius: var(--radius-xs);
    transition: border-color 120ms ease, background-color 120ms ease;
  }

  .selector-trigger:hover {
    background: var(--surface-container-low);
  }

  .selector-trigger:focus {
    outline: none;
    border-bottom-color: var(--primary);
  }

  .placeholder {
    color: var(--outline);
    font-size: 1.08rem;
  }

  .selected-name {
    display: block;
    color: var(--text-primary, #e8e1d9);
    font-weight: 700;
    font-size: 1rem;
    line-height: 1.2;
  }

  .selected-meta {
    display: block;
    margin-top: 0.2rem;
    color: var(--tertiary);
    font-size: 0.78rem;
  }

  .indicator {
    color: var(--tertiary);
    font-size: 1.6rem;
    line-height: 1;
    font-weight: 700;
  }

  .dropdown-panel {
    position: absolute;
    top: calc(100% + 0.4rem);
    left: 0;
    right: 0;
    z-index: 60;
    background: var(--surface);
    border: 2px solid var(--outline);
    border-radius: 1rem;
    overflow: hidden;
    box-shadow: 0 16px 28px rgba(0, 0, 0, 0.35);
  }

  .search-wrap {
    padding: 0.6rem;
    border-bottom: 1px solid var(--outline-variant);
    background: var(--surface-container-low);
  }

  .search-input {
    width: 100%;
    padding: var(--spacing-4) var(--spacing-5);
    border: none;
    border-bottom: 3px solid var(--outline);
    border-radius: var(--radius-xs);
    background: var(--surface-container-lowest);
    color: #e8e1d9;
    transition: border-color 120ms ease, background-color 120ms ease;
  }

  .search-input:focus {
    outline: none;
    border-bottom-color: var(--primary);
    background: var(--surface-container-low);
  }

  .results {
    max-height: 16rem;
    overflow-y: auto;
  }

  .result-item {
    width: 100%;
    display: block;
    text-align: left;
    padding: 0.7rem 0.9rem;
    border-bottom: 1px solid var(--outline-variant);
    background: transparent;
    transition: background-color 120ms ease;
  }

  .result-item:last-child {
    border-bottom: none;
  }

  .result-item:hover {
    background: var(--surface-container-low);
  }

  .result-item.selected {
    background: color-mix(in srgb, var(--primary-container) 22%, transparent);
    border-left: 3px solid var(--primary);
    padding-left: 0.7rem;
  }

  .result-name {
    display: block;
    color: #f0e7de;
    font-weight: 700;
    line-height: 1.2;
  }

  .result-meta {
    display: block;
    margin-top: 0.15rem;
    color: var(--tertiary);
    font-size: 0.78rem;
    line-height: 1.2;
  }

  .empty-state {
    padding: 1rem;
    text-align: center;
    color: var(--outline);
  }
</style>
