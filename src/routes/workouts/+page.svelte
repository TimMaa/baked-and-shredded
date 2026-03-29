<script lang="ts">
  import { enhance } from "$app/forms";
  import Button from "$lib/components/Button.svelte";
  import Card from "$lib/components/Card.svelte";
  import Typography from "$lib/components/Typography.svelte";
  import Input from "$lib/components/Input.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let showForm = $state(false);
  let formName = $state("");
  let formDescription = $state("");
  let isSubmitting = $state(false);

  const handleAddWorkout = async (e: Event) => {
    isSubmitting = true;
  };
</script>

<div class="space-y-8">
  <div class="flex justify-between items-start">
    <div>
      <Typography variant="display" size="sm" as="h1" color="primary">
        Your Workouts
      </Typography>
      <Typography variant="body" size="md" color="tertiary" as="p">
        Build your exercise library
      </Typography>
    </div>
    <Button
      variant={showForm ? "tertiary" : "primary"}
      size="lg"
      onclick={() => (showForm = !showForm)}
    >
      {showForm ? "Cancel" : "+ Add Workout"}
    </Button>
  </div>

  {#if showForm}
    <Card>
      <form
        method="POST"
        action="?/addWorkout"
        use:enhance
        onsubmit={handleAddWorkout}
      >
        <div class="space-y-6">
          <div>
            <label for="name">
              <Typography
                variant="body"
                size="md"
                as="span"
                color="secondary"
              >
                Workout Name
              </Typography>
            </label>
            <div class="mt-3">
              <Input
                type="text"
                id="name"
                name="name"
                required
                bind:value={formName}
                placeholder="e.g., Bench Press"
              />
            </div>
          </div>

          <div>
            <label for="description">
              <Typography variant="body" size="md" as="span" color="secondary">
                Description
              </Typography>
            </label>
            <div class="mt-3">
              <Input
                type="textarea"
                id="description"
                name="description"
                rows={3}
                bind:value={formDescription}
                placeholder="Add notes about this workout..."
              />
            </div>
          </div>

          <div class="flex gap-4 pt-4">
            <Button
              type="submit"
              variant="secondary"
              size="md"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Workout"}
            </Button>
            <Button
              type="button"
              variant="tertiary"
              size="md"
              onclick={() => {
                showForm = false;
                formName = "";
                formDescription = "";
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </Card>
  {/if}

  <div class="space-y-4">
    {#await data.workouts}
      <div>Loading...</div>
    {:then workouts}
      {#if workouts.length === 0}
        <Card>
          <Typography
            variant="body"
            size="md"
            color="tertiary"
            as="p"
          >
            No workouts yet. Create your first one!
          </Typography>
        </Card>
      {:else}
        {#each workouts as workout (workout.id)}
          <Card>
            <div class="flex justify-between items-start gap-6">
              <div class="flex-1">
                <Typography
                  variant="headline"
                  size="sm"
                  as="h2"
                  color="primary"
                >
                  {workout.name}
                </Typography>
                {#if workout.description}
                  <Typography
                    variant="body"
                    size="sm"
                    color="tertiary"
                    as="p"
                  >
                    {workout.description}
                  </Typography>
                {/if}
              </div>
              <div class="flex gap-3 flex-shrink-0">
                <Button variant="tertiary" size="sm">Edit</Button>
                <Button variant="tertiary" size="sm">Delete</Button>
              </div>
            </div>
          </Card>
        {/each}
      {/if}
    {/await}
  </div>
</div>
