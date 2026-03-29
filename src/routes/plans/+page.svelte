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

  const handleAddPlan = async (e: Event) => {
    isSubmitting = true;
  };
</script>

<div class="space-y-6 sm:space-y-8">
  <div class="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
    <div>
      <Typography variant="display" size="sm" as="h1" color="secondary">
        Training Plans
      </Typography>
      <Typography variant="body" size="md" color="tertiary" as="p">
        Structure your weekly workouts
      </Typography>
    </div>
    <Button
      variant={showForm ? "tertiary" : "primary"}
      size="md"
      onclick={() => (showForm = !showForm)}
    >
      {showForm ? "Cancel" : "+ Create Plan"}
    </Button>
  </div>

  {#if showForm}
    <Card>
      <form
        method="POST"
        action="?/createPlan"
        use:enhance
        onsubmit={handleAddPlan}
      >
        <div class="space-y-4 sm:space-y-6">
          <div>
            <label for="name">
              <Typography variant="body" size="md" as="span" color="secondary">
                Plan Name
              </Typography>
            </label>
            <div class="mt-2 sm:mt-3">
              <Input
                type="text"
                id="name"
                name="name"
                required
                bind:value={formName}
                placeholder="e.g., Push Pull Legs"
              />
            </div>
          </div>

          <div>
            <label for="description">
              <Typography variant="body" size="md" as="span" color="secondary">
                Description
              </Typography>
            </label>
            <div class="mt-2 sm:mt-3">
              <Input
                type="textarea"
                id="description"
                name="description"
                rows={3}
                bind:value={formDescription}
                placeholder="Add details about this training plan..."
              />
            </div>
          </div>

          <div class="flex flex-col gap-2 sm:flex-row sm:gap-4 pt-2 sm:pt-4">
            <Button
              type="submit"
              variant="secondary"
              size="md"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Plan"}
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

  {#await data.plans}
    <div>Loading...</div>
  {:then plans}
    <div class="space-y-3 sm:space-y-4">
      {#if plans.length === 0}
        <Card>
          <Typography variant="body" size="md" color="tertiary" as="p">
            No training plans yet. Create your first plan!
          </Typography>
        </Card>
      {:else}
        {#each plans as plan (plan.id)}
          <a href="/plans/{plan.id}" class="no-underline">
            <Card>
              <div class="flex flex-col gap-3 sm:gap-6 sm:flex-row sm:justify-between sm:items-start">
                <div class="flex-1 min-w-0">
                  <Typography
                    variant="headline"
                    size="sm"
                    as="h2"
                    color="secondary"
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
                  <Typography variant="body" size="sm" color="tertiary" as="p">
                    Created {new Date(plan.created_at).toLocaleDateString()}
                  </Typography>
                </div>
                <div class="ml-0 sm:ml-6 pt-2 sm:pt-0 flex-shrink-0">
                  <Typography variant="body" size="md" color="primary">
                    View →
                  </Typography>
                </div>
              </div>
            </Card>
          </a>
        {/each}
      {/if}
    </div>
  {/await}
</div>

<style>
  a {
    text-decoration: none;
    color: inherit;
  }
</style>
