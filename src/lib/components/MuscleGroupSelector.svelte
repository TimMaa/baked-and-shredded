<script lang="ts">
  import Typography from "./Typography.svelte";
  import {
    MUSCLE_GROUP_CATEGORIES,
    createDefaultMuscleRatings,
    getMuscleGroupLabel,
    totalMusclePoints,
    type MuscleRatings,
  } from "$lib/muscleGroups";

  interface Props {
    selected?: MuscleRatings;
    required?: boolean;
    maxPoints?: number;
  }

  let {
    selected = $bindable(createDefaultMuscleRatings()),
    required = false,
    maxPoints = 25,
  }: Props = $props();

  const pointsUsed = $derived(totalMusclePoints(selected));
  const pointsRemaining = $derived(maxPoints - pointsUsed);
  const hasAnyRatedMuscle = $derived(Object.values(selected).some((rating) => rating > 0));
  const progressPct = $derived(Math.round((pointsUsed / maxPoints) * 100));

  function getRatingButtonClass(group: string, rating: number) {
    const isActive = (selected[group] ?? 0) === rating;
    if (!isActive) {
      return "rating-btn text-tertiary hover:text-primary";
    }

    const activeByRating: Record<number, string> = {
      0: "rating-btn-active-0",
      1: "rating-btn-active-1",
      2: "rating-btn-active-2",
      3: "rating-btn-active-3",
      4: "rating-btn-active-4",
      5: "rating-btn-active-5",
    };

    return `rating-btn ${activeByRating[rating]}`;
  }

  function setRating(group: string, rating: number) {
    const next = { ...selected, [group]: rating };
    if (totalMusclePoints(next) <= maxPoints) {
      selected = next;
    }
  }

  function increase(group: string) {
    const current = selected[group] ?? 0;
    if (current >= 5) return;
    setRating(group, current + 1);
  }

  function decrease(group: string) {
    const current = selected[group] ?? 0;
    if (current <= 0) return;
    setRating(group, current - 1);
  }

  function clearAll() {
    selected = createDefaultMuscleRatings();
  }
</script>

<div class="space-y-4">
  <div class="rounded-xl p-4 bg-surface-container-low space-y-3">
    <div class="flex items-center justify-between gap-3">
      <Typography variant="body" size="sm" color="secondary" as="p">
        Points: {pointsUsed}/{maxPoints}
      </Typography>
      <button
        type="button"
        class="text-sm text-tertiary hover:text-primary transition-colors"
        onclick={clearAll}
      >
        Reset all
      </button>
    </div>
    <div class="h-2 rounded-full bg-surface-container overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-200 bg-primary-container"
        style={`width: ${progressPct}%`}
      ></div>
    </div>
    <Typography variant="body" size="sm" color="tertiary" as="p">
      {#if pointsRemaining > 0}
        {pointsRemaining} points remaining
      {:else}
        All points allocated
      {/if}
    </Typography>
    <Typography variant="body" size="sm" color="tertiary" as="p">
      Tap a number from 0 to 5 for each muscle group.
    </Typography>
  </div>

  {#each Object.entries(MUSCLE_GROUP_CATEGORIES) as [category, groups]}
    <div class="space-y-2">
      <div class="font-semibold text-xs uppercase tracking-wide opacity-70">
        <Typography variant="body" size="sm" color="secondary" as="span">
          {category}
        </Typography>
      </div>
      <div class="space-y-2">
        {#each groups as group}
          <div class="p-3 sm:p-4 rounded-xl bg-surface-container-low space-y-3">
            <div class="flex items-start justify-between gap-3">
              <Typography variant="body" size="sm" color="default" as="span">
                {getMuscleGroupLabel(group)}
              </Typography>
              <span class="rating-badge">{selected[group] ?? 0}/5</span>
            </div>

            <div class="flex items-center gap-2" role="group" aria-label={`Rating for ${group}`}>
              <button
                type="button"
                class="step-btn"
                onclick={() => decrease(group)}
                disabled={(selected[group] ?? 0) === 0}
                aria-label={`Decrease ${group} rating`}
              >
                -
              </button>

              <div class="rating-grid">
                {#each [0, 1, 2, 3, 4, 5] as rating}
                  <button
                    type="button"
                    class={getRatingButtonClass(group, rating)}
                    onclick={() => setRating(group, rating)}
                    aria-pressed={selected[group] === rating}
                    aria-label={`Set ${group} to ${rating}`}
                  >
                    {rating}
                  </button>
                {/each}
              </div>

              <button
                type="button"
                class="step-btn"
                onclick={() => increase(group)}
                disabled={(selected[group] ?? 0) >= 5 || pointsRemaining <= 0}
                aria-label={`Increase ${group} rating`}
              >
                +
              </button>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/each}

  {#if required && !hasAnyRatedMuscle}
    <div class="text-xs mt-2">
      <Typography
        variant="body"
        size="sm"
        color="error"
        as="p"
      >
        Rate at least one muscle group above 0
      </Typography>
    </div>
  {/if}

  {#if pointsUsed > maxPoints}
    <div class="text-xs mt-2">
      <Typography variant="body" size="sm" color="error" as="p">
        Total points cannot exceed {maxPoints}
      </Typography>
    </div>
  {/if}
</div>

<style>
  .rating-badge {
    background: var(--primary-container);
    color: var(--on-primary);
    border-radius: 9999px;
    padding: 0.2rem 0.55rem;
    font-size: 0.8rem;
    font-weight: 700;
    line-height: 1;
  }

  .step-btn {
    height: 2.25rem;
    width: 2.25rem;
    border-radius: 0.7rem;
    background: var(--surface-container);
    color: var(--tertiary);
    font-weight: 700;
    font-size: 1.15rem;
    line-height: 1;
    transition: transform 120ms ease, color 120ms ease;
  }

  .step-btn:hover:not(:disabled) {
    color: var(--primary);
    transform: translateY(-1px);
  }

  .step-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .rating-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 0.4rem;
    flex: 1;
    min-width: 0;
  }

  .rating-btn {
    min-height: 2.25rem;
    border-radius: 0.65rem;
    background: var(--surface-container);
    font-weight: 700;
    font-size: 0.95rem;
    transition: transform 120ms ease, color 120ms ease, background-color 120ms ease;
  }

  .rating-btn:hover {
    transform: translateY(-1px);
  }

  .rating-btn-active-0 {
    background: #4c4a47;
    color: #f5e6d7;
  }

  .rating-btn-active-1 {
    background: #7f5d48;
    color: #fff1e6;
  }

  .rating-btn-active-2 {
    background: #a86d4f;
    color: #fff4eb;
  }

  .rating-btn-active-3 {
    background: #cd7543;
    color: #fff5ee;
  }

  .rating-btn-active-4 {
    background: #f08a49;
    color: #351200;
  }

  .rating-btn-active-5 {
    background: var(--primary-container);
    color: var(--on-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 60%, transparent);
  }

  @media (max-width: 640px) {
    .rating-btn {
      min-height: 2.4rem;
    }
  }
</style>

