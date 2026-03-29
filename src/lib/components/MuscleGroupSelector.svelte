<script lang="ts">
  import Typography from "./Typography.svelte";

  interface Props {
    selected?: string[];
    required?: boolean;
  }

  let { selected = $bindable([]), required = false }: Props = $props();

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

  const toggleMuscleGroup = (group: string) => {
    if (selected.includes(group)) {
      selected = selected.filter((m) => m !== group);
    } else {
      selected = [...selected, group];
    }
  };

  const isSelected = (group: string) => selected.includes(group);
</script>

<div class="space-y-4">
  {#each Object.entries(muscleGroups) as [category, groups]}
    <div class="space-y-2">
      <div class="font-semibold text-xs uppercase tracking-wide opacity-70">
        <Typography variant="body" size="sm" color="secondary" as="span">
          {category}
        </Typography>
      </div>
      <div class="flex flex-wrap gap-2">
        {#each groups as group}
          <button
            type="button"
            onclick={() => toggleMuscleGroup(group)}
            class="px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 border-2 cursor-pointer
              {isSelected(group)
              ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/30 scale-105'
              : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600'}"
          >
            {group}
          </button>
        {/each}
      </div>
    </div>
  {/each}

  {#if selected.length > 0}
    <div class="mt-4 pt-4 border-t border-gray-200">
      <div class="mb-2 font-semibold">
        <Typography variant="body" size="sm" color="secondary" as="h4">
          Selected ({selected.length}):
        </Typography>
      </div>
      <div class="flex flex-wrap gap-2">
        {#each selected as group}
          <div class="inline-flex items-center gap-2 px-2 py-1 bg-blue-100 border border-blue-300 rounded-full">
            <span class="text-sm font-medium text-blue-900">{group}</span>
            <button
              type="button"
              onclick={() => toggleMuscleGroup(group)}
              class="inline-flex items-center justify-center w-4 h-4 text-blue-600 hover:text-blue-900 ml-1"
              aria-label="Remove {group}"
            >
              ×
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if required && selected.length === 0}
    <div class="text-xs mt-2">
      <Typography
        variant="body"
        size="sm"
        color="error"
        as="p"
      >
        Please select at least one muscle group
      </Typography>
    </div>
  {/if}
</div>

