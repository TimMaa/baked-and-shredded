<script lang="ts">
  import { getDynamicClasses } from '$lib/designTokens';

  interface Props {
    compact?: boolean;
    hoverable?: boolean;
    as?: 'div' | 'article' | 'section';
  }

  let { compact = false, hoverable = true, as = 'div', children }: Props & { children: any } = $props();

  const cardClass = $derived(getDynamicClasses.card(compact));
  const hoverClass = $derived(hoverable ? 'hover:shadow-lg' : '');
</script>

<svelte:element
  this={as}
  class="{cardClass} {hoverClass}"
>
  {@render children()}
</svelte:element>

<style>
  :global([class*="card"]:hover) {
    transform: translateY(-1px);
  }
</style>
