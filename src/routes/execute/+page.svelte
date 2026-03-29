<script lang="ts">
  import Button from "$lib/components/Button.svelte";
  import Card from "$lib/components/Card.svelte";
  import Typography from "$lib/components/Typography.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let selectedPlan = $state<number | null>(null);
  let selectedDay = $state<string | null>(null);
  let sessionStarted = $state(false);

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  function startSession() {
    if (selectedPlan && selectedDay) {
      sessionStarted = true;
    }
  }

  function endSession() {
    sessionStarted = false;
    selectedPlan = null;
    selectedDay = null;
  }
</script>

<div class="space-y-8">
  <div>
    <Typography variant="display" size="sm" as="h1" color="tertiary">
      Execute Workout
    </Typography>
    <Typography variant="body" size="md" color="tertiary" as="p">
      Track your reps and weight in real time
    </Typography>
  </div>

  {#if !sessionStarted}
    {#await data.plans}
      <div>Loading...</div>
    {:then plans}
      <div class="space-y-6">
        <Card>
          <Typography variant="headline" size="md" as="h2" color="primary">
            Select Training Plan
          </Typography>
          {#if plans.length === 0}
            <Typography variant="body" size="md" color="tertiary" as="p">
              No training plans available. <a
                href="/plans"
                class="text-primary hover:text-tertiary">Create one first</a
              >
            </Typography>
          {:else}
            <div class="space-y-3">
              {#each plans as plan (plan.id)}
                <label
                  class="flex items-center p-4 rounded-lg cursor-pointer transition-all"
                  class:selected={selectedPlan === plan.id}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={plan.id}
                    bind:group={selectedPlan}
                    class="w-5 h-5"
                  />
                  <div class="ml-4">
                    <Typography
                      variant="body"
                      size="md"
                      as="span"
                      color={selectedPlan === plan.id ? "primary" : "default"}
                    >
                      {plan.name}
                    </Typography>
                    {#if plan.description}
                      <Typography
                        variant="body"
                        size="sm"
                        color="tertiary"
                        as="p"
                      >
                        {plan.description}
                      </Typography>
                    {/if}
                  </div>
                </label>
              {/each}
            </div>
          {/if}
        </Card>

        {#if selectedPlan}
          <Card>
            <Typography variant="headline" size="md" as="h2" color="secondary">
              Select Day
            </Typography>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {#each daysOfWeek as day (day)}
                <button
                  onclick={() => (selectedDay = day)}
                  class="p-4 rounded-lg font-semibold transition-all text-body-md"
                  class:selected={selectedDay === day}
                >
                  {day.substring(0, 3)}
                </button>
              {/each}
            </div>
          </Card>

          {#if selectedDay}
            <Button variant="secondary" size="lg" onclick={startSession}>
              Start Workout - {selectedDay}
            </Button>
          {/if}
        {/if}
      </div>
    {/await}
  {:else}
    <Card>
      <div class="flex justify-between items-center mb-8">
        <Typography variant="headline" size="lg" as="h2" color="primary">
          Workout Session - {selectedDay}
        </Typography>
        <Button variant="tertiary" size="md" onclick={endSession}>
          End Session
        </Button>
      </div>

      <div class="space-y-4">
        <Typography variant="body" size="md" color="tertiary" as="p">
          Workout tracking interface coming soon
        </Typography>
        <Typography variant="body" size="sm" color="tertiary" as="p">
          Track each exercise with reps and weight lifted
        </Typography>
      </div>
    </Card>
  {/if}
</div>

<style>
  label.selected {
    background-color: var(--surface-container);
  }

  button.selected {
    background-color: var(--secondary-container);
    color: var(--on-secondary);
  }

  a {
    text-decoration: none;
  }
</style>
