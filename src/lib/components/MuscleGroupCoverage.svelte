<script lang="ts">
  import Typography from "./Typography.svelte";
  import {
    createDefaultMuscleRatings,
    getMuscleGroupLabel,
    MUSCLE_GROUP_CATEGORIES,
    normalizeMuscleRatings,
    type MuscleRatings,
  } from "$lib/muscleGroups";

  interface Props {
    focusAreas?: string[];
    muscleRatings?: MuscleRatings;
    compact?: boolean;
  }

  let { focusAreas = [], muscleRatings, compact = false }: Props = $props();

  const muscleGroups = MUSCLE_GROUP_CATEGORIES;

  const normalizedRatings = $derived.by(() => {
    if (muscleRatings) {
      return normalizeMuscleRatings(muscleRatings);
    }

    const base = createDefaultMuscleRatings();
    for (const group of focusAreas) {
      if (group in base) {
        base[group] = 1;
      }
    }
    return base;
  });

  const ratedMuscles = $derived.by(() =>
    Object.entries(normalizedRatings)
      .filter(([, rating]) => rating > 0)
      .sort((a, b) => b[1] - a[1])
  );

  const totalPoints = $derived.by(() =>
    Object.values(normalizedRatings).reduce((sum, rating) => sum + rating, 0)
  );

  // Calculate weighted category effectiveness based on rating points.
  const categoryStats = $derived.by(() => {
    const stats: Record<string, { points: number; maxPoints: number; percentage: number }> = {};

    for (const [category, groups] of Object.entries(muscleGroups)) {
      const points = groups.reduce((sum, group) => sum + (normalizedRatings[group] ?? 0), 0);
      const maxPoints = groups.length * 5;
      const percentage = maxPoints > 0 ? Math.min(100, Math.round((points / maxPoints) * 100)) : 0;
      stats[category] = { points, maxPoints, percentage };
    }

    return stats;
  });
</script>

{#if ratedMuscles.length > 0}
  <div class="space-y-3 sm:space-y-4">
    {#if compact}
      <!-- Compact view: show top rated muscles -->
      <div class="flex flex-wrap gap-2">
        {#each ratedMuscles.slice(0, 5) as [area, rating]}
          <span class="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-900 rounded-full">
            {getMuscleGroupLabel(area)} ({rating})
          </span>
        {/each}
        {#if ratedMuscles.length > 5}
          <span class="inline-block px-2 py-1 text-xs font-medium bg-surface-container text-tertiary rounded-full">
            +{ratedMuscles.length - 5} more
          </span>
        {/if}
      </div>
    {:else}
      <!-- Full view: heat map with coverage bars -->
      <Typography variant="body" size="sm" color="tertiary" as="p">
        Total effectiveness points: {totalPoints}
      </Typography>
      <div class="space-y-3">
        {#each Object.entries(categoryStats) as [category, stats]}
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <div class="font-semibold">
                <Typography variant="body" size="sm" color="secondary" as="span">
                  {category}
                </Typography>
              </div>
              <div>
                <Typography variant="body" size="sm" color="tertiary" as="span">
                  {stats.points}/{stats.maxPoints}
                </Typography>
              </div>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-300"
                style="width: {stats.percentage}%; background: linear-gradient(to right, rgb(59, 130, 246), rgb(6, 182, 212));"
              ></div>
            </div>
          </div>
        {/each}
      </div>

      <!-- Show all selected groups -->
      <div class="mt-3 pt-3 border-t border-gray-200">
        <div class="mb-2 font-semibold">
          <Typography variant="body" size="sm" color="secondary" as="h4">
            Targeted Muscle Groups:
          </Typography>
        </div>
        <div class="flex flex-wrap gap-2">
          {#each ratedMuscles as [area, rating]}
            <span class="inline-block px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-900 rounded-full">
              {getMuscleGroupLabel(area)} ({rating})
            </span>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}

