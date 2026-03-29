<script lang="ts">
  import '../app.css';
</script>

<div class="surface-base min-h-screen flex flex-col">
  <nav class="nav-floating fixed top-6 left-6 right-6 z-50">
    <div class="flex justify-between items-center px-6">
      <h1 class="text-headline-lg text-primary">🌱 Tracker</h1>
      <div class="flex gap-8">
        <a href="/" class="text-body-md text-tertiary hover:text-primary transition-colors">Home</a>
        <a href="/workouts" class="text-body-md text-tertiary hover:text-primary transition-colors">Workouts</a>
        <a href="/plans" class="text-body-md text-tertiary hover:text-primary transition-colors">Plans</a>
        <a href="/execute" class="text-body-md text-tertiary hover:text-primary transition-colors">Execute</a>
      </div>
    </div>
  </nav>

  <main class="flex-1 max-w-6xl mx-auto w-full px-8 pt-32 pb-16 ml-organic-lg">
    <slot />
  </main>
</div>