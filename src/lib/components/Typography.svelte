<script lang="ts">
  import { getDynamicClasses } from '$lib/designTokens';

  interface Props {
    variant?: 'display' | 'headline' | 'body';
    size?: 'lg' | 'md' | 'sm' | 'xs';
    color?: 'primary' | 'secondary' | 'tertiary' | 'success' | 'error' | 'default';
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
  }

  let {
    variant = 'body',
    size = 'md',
    color = 'default',
    as = 'p',
    children
  }: Props & { children: any } = $props();

  const normalizedSize = $derived(size === 'xs' && variant !== 'body' ? 'sm' : size);
  const textClass = $derived(getDynamicClasses.text(variant, normalizedSize));
  const colorClass = $derived(color === 'default' ? '' : `text-${color}`);
</script>

<svelte:element
  this={as}
  class="{textClass} {colorClass}"
>
  {@render children()}
</svelte:element>
