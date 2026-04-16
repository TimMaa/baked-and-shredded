<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Card from "$lib/components/Card.svelte";
  import Typography from "$lib/components/Typography.svelte";
  import { importWorkoutHistoryFromCsv, type WorkoutCsvImportResult } from "$lib/data/import";
  import { getDatabaseRuntimeStatus } from "$lib/data/sqlite";

  const databaseStatus = getDatabaseRuntimeStatus();
  const isNativePlatform = databaseStatus.isNativePlatform;

  let workoutName = $state("");
  let csvFile = $state<File | null>(null);
  let isImporting = $state(false);
  let errorMessage = $state<string | null>(null);
  let result = $state<WorkoutCsvImportResult | null>(null);

  let fileInputEl = $state<HTMLInputElement | undefined>(undefined);

  function handleFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    csvFile = input.files?.[0] ?? null;
    errorMessage = null;
    result = null;
  }

  async function handleImport(event: SubmitEvent) {
    event.preventDefault();

    if (!csvFile) {
      errorMessage = "Please select a CSV file.";
      return;
    }

    if (!workoutName.trim()) {
      errorMessage = "Please enter a workout name.";
      return;
    }

    isImporting = true;
    errorMessage = null;
    result = null;

    try {
      result = await importWorkoutHistoryFromCsv(csvFile, workoutName);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Import failed.";
    } finally {
      isImporting = false;
    }
  }

  function handleReset() {
    workoutName = "";
    csvFile = null;
    errorMessage = null;
    result = null;
    if (fileInputEl) fileInputEl.value = "";
  }
</script>

<svelte:head>
  <title>Import History - Baked &amp; Shredded</title>
</svelte:head>

<header>
  <a href="#maincontent" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-1 focus:text-sm focus:font-medium focus:text-black">
    Skip to main content
  </a>
</header>

<main id="maincontent" tabindex="-1" class="space-y-6 sm:space-y-8">
  <div>
    <Typography as="h1" variant="headline" size="lg">Import Workout History</Typography>
    <Typography as="p" variant="body" size="md" color="secondary" className="mt-1">
      Import completed sessions from a CSV spreadsheet export.
    </Typography>
  </div>

  {#if !isNativePlatform}
    <Card hoverable={false}>
      <Typography as="p" variant="body" size="md" color="secondary">
        Import is only available inside the Android app where local storage is available.
      </Typography>
    </Card>
  {:else}
    <Card hoverable={false}>
      <Typography as="h2" variant="headline" size="md" className="mb-4">CSV format</Typography>
      <Typography as="p" variant="body" size="sm" color="secondary" className="mb-3">
        The file must contain these columns (header row required, case-insensitive):
      </Typography>
      <div class="overflow-x-auto" role="region" aria-label="Expected CSV columns">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-b border-(--color-border)">
              <th class="text-left py-2 pr-4 font-medium">Column</th>
              <th class="text-left py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody class="text-(--color-text-secondary)">
            <tr class="border-b border-(--color-border)">
              <td class="py-2 pr-4 font-mono">Exercise</td>
              <td class="py-2">Exercise name</td>
            </tr>
            <tr class="border-b border-(--color-border)">
              <td class="py-2 pr-4 font-mono">Date</td>
              <td class="py-2">Session date in DD.MM.YYYY — rows without a date are skipped</td>
            </tr>
            <tr class="border-b border-(--color-border)">
              <td class="py-2 pr-4 font-mono">Sets</td>
              <td class="py-2">Planned number of sets</td>
            </tr>
            <tr class="border-b border-(--color-border)">
              <td class="py-2 pr-4 font-mono">kg</td>
              <td class="py-2">Weight used in kg (European decimal comma accepted, e.g. 7,5)</td>
            </tr>
            <tr class="border-b border-(--color-border)">
              <td class="py-2 pr-4 font-mono">Goal</td>
              <td class="py-2">Target reps (or seconds for timed exercises like Plank)</td>
            </tr>
            <tr>
              <td class="py-2 pr-4 font-mono">Reps (1…n)</td>
              <td class="py-2">Actual reps or seconds per set — add as many columns as needed</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Typography as="p" variant="body" size="sm" color="secondary" className="mt-3">
        Exercises and the workout are created automatically if they do not exist yet.
        Sessions that already exist (same workout + date) are skipped.
      </Typography>
    </Card>

    <Card hoverable={false}>
      <form onsubmit={handleImport} aria-label="Import workout history" novalidate>
        <fieldset class="space-y-5" disabled={isImporting}>
          <legend class="sr-only">Import options</legend>

          <div>
            <label for="workout-name" class="block text-sm font-medium mb-1">
              Workout name <span aria-hidden="true">*</span>
            </label>
            <input
              id="workout-name"
              type="text"
              placeholder="e.g. Workout A"
              bind:value={workoutName}
              required
              aria-describedby="workout-name-hint"
              class="w-full"
            />
            <p id="workout-name-hint" class="mt-1 text-xs text-(--color-text-secondary)">
              The workout is matched by name (case-insensitive) or created if it does not exist.
            </p>
          </div>

          <div>
            <label for="csv-file" class="block text-sm font-medium mb-1">
              CSV file <span aria-hidden="true">*</span>
            </label>
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              required
              aria-required="true"
              aria-describedby="csv-file-hint"
              onchange={handleFileChange}
              bind:this={fileInputEl}
              class="block w-full text-sm text-(--color-text-primary) file:mr-3 file:rounded-lg file:border file:border-(--color-border) file:bg-(--color-surface-raised) file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-(--color-text-primary) file:cursor-pointer hover:file:bg-(--color-surface-hover) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--color-focus)"
            />
            {#if csvFile}
              <p class="mt-1 text-xs text-(--color-text-secondary)">
                Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
              </p>
            {/if}
            <p id="csv-file-hint" class="mt-1 text-xs text-(--color-text-secondary)">
              Select the exported CSV file from your spreadsheet.
            </p>
          </div>
        </fieldset>

        {#if errorMessage}
          <div
            class="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3"
            role="alert"
            aria-live="assertive"
          >
            <Typography as="p" variant="body" size="sm">
              {errorMessage}
            </Typography>
          </div>
        {/if}

        <div class="mt-6 flex flex-wrap gap-3">
          <Button type="submit" variant="primary" loading={isImporting} disabled={isImporting}>
            {isImporting ? "Importing…" : "Import sessions"}
          </Button>
          {#if result !== null || csvFile !== null || workoutName}
            <Button type="button" variant="secondary" onclick={handleReset} disabled={isImporting}>
              Reset
            </Button>
          {/if}
        </div>
      </form>
    </Card>

    {#if result !== null}
      <Card hoverable={false}>
        <div
          role="status"
          aria-live="polite"
          aria-label="Import result"
        >
          {#if result.sessionsImported > 0 || result.sessionsSkipped > 0}
            <div class="flex items-center gap-2 mb-4">
              <span class="text-green-600 text-xl" aria-hidden="true">✓</span>
              <Typography as="h2" variant="headline" size="md">Import complete</Typography>
            </div>

            <dl class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              <div class="rounded-xl border border-(--color-border) p-4">
                <dt class="text-xs text-(--color-text-secondary) mb-1">Sessions imported</dt>
                <dd class="text-2xl font-bold">{result.sessionsImported}</dd>
              </div>
              <div class="rounded-xl border border-(--color-border) p-4">
                <dt class="text-xs text-(--color-text-secondary) mb-1">Sets logged</dt>
                <dd class="text-2xl font-bold">{result.setsImported}</dd>
              </div>
              {#if result.sessionsSkipped > 0}
                <div class="rounded-xl border border-(--color-border) p-4">
                  <dt class="text-xs text-(--color-text-secondary) mb-1">Sessions skipped</dt>
                  <dd class="text-2xl font-bold text-(--color-text-secondary)">{result.sessionsSkipped}</dd>
                </div>
              {/if}
            </dl>

            {#if result.sessionsSkipped > 0}
              <Typography as="p" variant="body" size="sm" color="secondary" className="mb-4">
                Skipped sessions already existed in the database for this workout.
              </Typography>
            {/if}

            <Button variant="secondary" onclick={() => { window.location.href = '/history/'; }}>
              View in History
            </Button>
          {:else}
            <Typography as="p" variant="body" size="md" color="secondary">
              No new sessions were imported. All sessions in the file may already exist.
            </Typography>
          {/if}

          {#if result.errors.length > 0}
            <div class="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
              <Typography as="p" variant="body" size="sm" className="font-medium mb-2">
                Warnings ({result.errors.length})
              </Typography>
              <ul class="list-disc list-inside space-y-1">
                {#each result.errors as error (error)}
                  <li class="text-sm text-(--color-text-secondary)">{error}</li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      </Card>
    {/if}
  {/if}
</main>

<style>
  .sr-only {
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }

  .sr-only:focus,
  .sr-only:active {
    clip: auto;
    clip-path: none;
    height: auto;
    overflow: visible;
    position: static;
    white-space: normal;
    width: auto;
  }
</style>
