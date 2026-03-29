<script lang="ts">
  import { enhance } from "$app/forms";
  import Button from "$lib/components/Button.svelte";
  import Card from "$lib/components/Card.svelte";
  import Typography from "$lib/components/Typography.svelte";
  import Input from "$lib/components/Input.svelte";
  import MuscleGroupCoverage from "$lib/components/MuscleGroupCoverage.svelte";
  import type { PageData, ActionData } from "./$types";

  let { data, form }: { data: PageData; form?: ActionData } = $props();

  let showForm = $state(false);
  let formName = $state("");
  let formDescription = $state("");
  let isSubmitting = $state(false);
  let errorMessage = $state<string | null>(null);
  let successMessage = $state<string | null>(null);

  const handleCreatePlan = async (e: Event) => {
    isSubmitting = true;
    errorMessage = null;
    successMessage = null;
  };

  const handleDeletePlan = (name: string) => {
    if (!confirm(`Are you sure you want to delete the plan "${name}"? This will also delete all associated workout sessions.`)) {
      return false;
    }
    return true;
  };

  $effect(() => {
    if (form?.success) {
      successMessage = "Operation completed successfully";
      formName = "";
      formDescription = "";
      showForm = false;
      isSubmitting = false;
      setTimeout(() => {
        successMessage = null;
      }, 3000);
    } else if (form?.message) {
      errorMessage = form.message;
      isSubmitting = false;
    }
  });
</script>

<div class="space-y-6 sm:space-y-8">
  {#if errorMessage}
    <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
      <Typography variant="body" size="md" color="tertiary" as="p">
        ❌ {errorMessage}
      </Typography>
    </div>
  {/if}

  {#if successMessage}
    <div class="p-4 bg-green-50 border border-green-200 rounded-lg">
      <Typography variant="body" size="md" color="tertiary" as="p">
        ✓ {successMessage}
      </Typography>
    </div>
  {/if}

  <div class="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
    <div>
      <Typography variant="display" size="sm" as="h1" color="secondary">
        Training Plans
      </Typography>
      <Typography variant="body" size="md" color="tertiary" as="p">
        Structure your weekly workouts
      </Typography>
    </div>
    {#if !showForm}
      <Button
        variant="primary"
        size="md"
        onclick={() => (showForm = !showForm)}
      >
        + Create Plan
      </Button>
    {/if}
  </div>

  {#if showForm}
    <Card>
      <form
        method="POST"
        action="?/createPlan"
        use:enhance
        onsubmit={handleCreatePlan}
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
                errorMessage = null;
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
          <Card>
            <div class="flex flex-col gap-3 sm:gap-6 sm:flex-row sm:justify-between sm:items-start">
              <a href="/plans/{plan.id}" class="flex-1 min-w-0 no-underline">
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
                {#if plan.focusAreas && plan.focusAreas.length > 0}
                  <div class="mt-3 pt-3 border-t border-gray-200">
                    <MuscleGroupCoverage focusAreas={plan.focusAreas} compact />
                  </div>
                {/if}
              </a>
                <div class="flex flex-col gap-2 sm:flex-row sm:gap-3 shrink-0 w-full sm:w-auto">
                <a href="/plans/{plan.id}" class="no-underline">
                  <Button variant="secondary" size="sm">
                    View / Edit
                  </Button>
                </a>
                <form method="POST" action="?/deletePlan">
                  <input type="hidden" name="id" value={plan.id} />
                  <Button
                    type="submit"
                    variant="tertiary"
                    size="sm"
                    onclick={() => handleDeletePlan(plan.name)}
                  >
                    Delete
                  </Button>
                </form>
              </div>
            </div>
          </Card>
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
