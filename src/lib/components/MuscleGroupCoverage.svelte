<script lang="ts">
  import Typography from "./Typography.svelte";

  interface Props {
    focusAreas: string[];
    compact?: boolean;
  }

  let { focusAreas = [], compact = false }: Props = $props();

  const muscleGroups = {
    "Upper Body": [
      "Chest (Pectorals)",
      "Back (Lats, Rhomboids, Traps)",
      "Shoulders (Deltoids)",
      "Biceps",
      "Triceps",
      "Forearms",
    ],
    "Core": ["Abs (Core/Obliques)", "Lower Back (Erector Spinae)"],
    "Lower Body": [
      "Glutes (Gluteus Maximus/Medius)",
      "Quads (Quadriceps)",
      "Hamstrings",
      "Calves",
      "Adductors/Abductors (Inner/Outer Thigh)",
    ],
  };

  const uniqueFocusAreas = $derived(Array.from(new Set(focusAreas)));

  // Calculate coverage percentage for each category
  const categoryStats = $derived.by(() => {
    const stats: Record<string, { covered: number; total: number; percentage: number }> = {};

    for (const [category, groups] of Object.entries(muscleGroups)) {
      const covered = groups.filter(g => uniqueFocusAreas.includes(g)).length;
      const total = groups.length;
      const percentage = Math.round((covered / total) * 100);
      stats[category] = { covered, total, percentage };
    }

    return stats;
  });
</script>

{#if focusAreas && focusAreas.length > 0}
  <div class="space-y-3 sm:space-y-4">
    {#if compact}
      <!-- Compact view: just the pills -->
      <div class="flex flex-wrap gap-2">
        {#each uniqueFocusAreas as area}
          <span class="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-900 rounded-full">
            {area.split('(')[0].trim()}
          </span>
        {/each}
      </div>
    {:else}
      <!-- Full view: heat map with coverage bars -->
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
                  {stats.covered}/{stats.total}
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
          {#each uniqueFocusAreas as area}
            <span class="inline-block px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-900 rounded-full">
              {area}
            </span>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}

