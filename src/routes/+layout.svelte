<script lang="ts">
  import { onMount } from 'svelte';
  import Typography from "$lib/components/Typography.svelte";
  import { getDatabaseRuntimeStatus, initializeAppDatabase } from '$lib/data/sqlite';
  import "../app.css";

  let { children } = $props();

  let databaseState = $state(getDatabaseRuntimeStatus());

  onMount(async () => {
    databaseState = getDatabaseRuntimeStatus();

    if (!databaseState.isNativePlatform) {
      return;
    }

    try {
      await initializeAppDatabase();
    } catch {
      // Surface the failure via the status banner below.
    } finally {
      databaseState = getDatabaseRuntimeStatus();
    }
  });
</script>

<div class="surface-base min-h-screen flex flex-col">
  <nav
    class="nav-floating fixed top-3 sm:top-6 left-3 sm:left-6 right-3 sm:right-6 z-50"
  >
    <div
      class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 px-3 sm:px-6"
    >
      <a
        href="/"
        class="flex items-center gap-4 transition-colors"
      >
        <img src="/favicon.png" alt="logo" class="h-12 w-12" />
        <Typography as="h1" color="primary" size="lg"
          >Baked & Shredded</Typography
        >
      </a>
      <div class="hidden sm:flex flex-wrap gap-8 text-body-md">
        <a
          href="/exercises"
          class="text-tertiary hover:text-primary transition-colors">Exercises</a
        >
        <a
          href="/plans"
          class="text-tertiary hover:text-primary transition-colors">Workouts</a
        >
        <a
          href="/execute"
          class="text-tertiary hover:text-primary transition-colors">Execute</a
        >
        <a
          href="/history"
          class="text-tertiary hover:text-primary transition-colors">History</a
        >
        <a
          href="/import"
          class="text-tertiary hover:text-primary transition-colors">Import</a
        >
      </div>
    </div>
  </nav>

  <main
    class="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 md:px-8 pt-24 sm:pt-32 pb-8 sm:pb-16"
  >
    {#if databaseState.isNativePlatform && databaseState.state === 'initializing'}
      <div class="mb-4 rounded-2xl border border-(--color-border-strong) bg-(--color-surface-raised) px-4 py-3" role="status" aria-live="polite">
        <Typography as="p" variant="body" size="sm" color="secondary">
          Preparing offline storage for this device...
        </Typography>
      </div>
    {:else if databaseState.isNativePlatform && databaseState.state === 'error' && databaseState.errorMessage}
      <div class="mb-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3" role="status" aria-live="polite">
        <Typography as="p" variant="body" size="sm" color="secondary">
          Offline storage could not be initialized: {databaseState.errorMessage}
        </Typography>
      </div>
    {/if}

    {@render children?.()}
  </main>
</div>
