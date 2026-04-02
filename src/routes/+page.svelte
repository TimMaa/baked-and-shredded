<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import Typography from '$lib/components/Typography.svelte';
</script>

<div class="space-y-8 sm:space-y-12">
  <section>
    <Typography variant="display" size="lg" as="h1" color="primary">
      Your Digital Garden
    </Typography>
    <Typography variant="body" size="lg" color="primary" as="p">
      Cultivate strength and growth through mindful training
    </Typography>
  </section>

  <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
    <a href="/exercises" class="no-underline">
      <Card hoverable>
        <div class="space-y-4">
          <div class="text-5xl">💪</div>
          <Typography variant="headline" size="md" as="h2" color="primary">
            Manage Exercises
          </Typography>
          <Typography variant="body" size="sm" color="default" as="p">
            Create and organize your exercises with descriptions and muscle targets
          </Typography>
        </div>
      </Card>
    </a>

    <a href="/plans" class="no-underline">
      <Card hoverable>
        <div class="space-y-4">
          <div class="text-5xl">📋</div>
          <Typography variant="headline" size="md" as="h2" color="secondary">
            Build Workouts
          </Typography>
          <Typography variant="body" size="sm" color="default" as="p">
            Combine exercises into weekly programs and structure your training by day
          </Typography>
        </div>
      </Card>
    </a>

    <a href="/execute" class="no-underline">
      <Card hoverable>
        <div class="space-y-4">
          <div class="text-5xl">🏃</div>
          <Typography variant="headline" size="md" as="h2" color="tertiary">
            Execute Workout
          </Typography>
          <Typography variant="body" size="sm" color="default" as="p">
            Log your reps and weight during workout sessions
          </Typography>
        </div>
      </Card>
    </a>

    <a href="/history" class="no-underline">
      <Card hoverable>
        <div class="space-y-4">
          <div class="text-5xl">📈</div>
          <Typography variant="headline" size="md" as="h2" color="primary">
            History & Analytics
          </Typography>
          <Typography variant="body" size="sm" color="default" as="p">
            Review completion trends, adherence, and deviation hotspots
          </Typography>
        </div>
      </Card>
    </a>
  </div>
</div>

<style>
  a {
    text-decoration: none;
    color: inherit;
  }
</style>
