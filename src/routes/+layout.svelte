<script lang="ts">
  import '../app.css';
</script>

<div class="surface-base min-h-screen flex flex-col">
  <nav class="nav-floating fixed top-3 sm:top-6 left-3 sm:left-6 right-3 sm:right-6 z-50">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 px-3 sm:px-6">
      <h1 class="text-headline-sm sm:text-headline-lg text-primary">🌱 Tracker</h1>
      <div class="flex flex-wrap gap-3 sm:gap-8 text-sm sm:text-body-md">
        <a href="/" class="text-tertiary hover:text-primary transition-colors">Home</a>
        <a href="/workouts" class="text-tertiary hover:text-primary transition-colors">Workouts</a>
        <a href="/plans" class="text-tertiary hover:text-primary transition-colors">Plans</a>
        <a href="/execute" class="text-tertiary hover:text-primary transition-colors">Execute</a>
      </div>
    </div>
  </nav>

  <main class="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 md:px-8 pt-24 sm:pt-32 pb-8 sm:pb-16">
    <slot />
  </main>
</div>