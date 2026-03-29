<script lang="ts">
  import { getDynamicClasses } from "$lib/designTokens";

  interface Props {
    variant?: "primary" | "secondary" | "tertiary";
    size?: "sm" | "md" | "lg";
    disabled?: boolean;
    loading?: boolean;
    type?: "button" | "submit" | "reset";
    onclick?: () => void;
  }

  let {
    variant = "primary",
    size = "md",
    disabled = false,
    loading = false,
    type = "button",
    onclick,
    children,
  }: Props & { children: any } = $props();

  const buttonClass = getDynamicClasses.button(variant, size);
</script>

<button {type} disabled={disabled || loading} {onclick} class={buttonClass}>
  {#if loading}
    <span class="opacity-50">Loading...</span>
  {:else}
    {@render children()}
  {/if}
</button>

<style>
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
</style>
