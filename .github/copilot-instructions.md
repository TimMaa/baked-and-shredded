# Copilot Instructions for Workout Tracker

## Project Overview
Workout Tracker is a personal fitness application built with Svelte 5, SvelteKit, and Tailwind CSS v4. The app allows users to:
- Create workouts with names and descriptions
- Build training plans and assign workouts to specific days
- Set target reps and weight for each workout
- Track actual reps and weight completed during workouts

## Tech Stack
- **Frontend**: Svelte 5 with SvelteKit and reactive runes ($state, $derived, $effect)
- **Styling**: Tailwind CSS v4 with @tailwindcss/vite plugin
- **Database**: sql.js (JavaScript-based SQLite, no native compilation needed)
- **Build**: Vite v8.0.0
- **Language**: TypeScript

## Key Standards to Follow

### Svelte 5 Conventions
- Use runes for reactivity: `$state()`, `$derived()`, `$effect()`
- Use `<script lang="ts">` for type safety
- Implement proper two-way binding with `bind:` directives
- Use snippets for reusable template logic
- Keep components focused on a single responsibility

### Tailwind CSS v4
- Use the Tailwind v4 classes throughout the application
- Configuration is CSS-first (see app.css) - no tailwind.config.js needed
- The @tailwindcss/vite plugin is used for automatic content detection

### Database (sql.js)
- Database functions in `src/lib/db.ts` are async and return promises
- Use `await` when calling database functions
- Database persists to `data/workout.db` file on the server
- Schema includes: workouts, training_plans, plan_days, plan_workouts, workout_sessions, session_sets

### File Structure
```
src/
├── routes/           # SvelteKit file-based routing
│   ├── +layout.svelte      # Main navigation layout
│   ├── +page.svelte        # Home dashboard
│   ├── workouts/           # Workout management
│   ├── plans/              # Training plan management
│   └── execute/            # Workout execution tracking
├── lib/
│   ├── db.ts               # Database operations
│   └── components/         # Reusable Svelte components (recommended)
└── app.css                 # Global styles with Tailwind imports
```

## Development Commands

```bash
npm run dev      # Start development server at http://localhost:5173
npm run build    # Build for production
npm run preview  # Preview production build locally
npm run lint     # Run ESLint
```

## Important Notes for Contributors

1. **Deprecated Event Directives**: Svelte 5 deprecates `on:click` in favor of `onclick`. Update these as encountered.
2. **Await Database Calls**: All database functions are async - always use `await`
3. **Server Load Functions**: Use `+page.server.ts` files to load data server-side via `export const load`
4. **Form Handling**: Use SvelteKit form actions for POST/PUT/DELETE operations
5. **Component Composition**: Prefer component composition and slots over prop drilling

## Database Operations Example

```typescript
// In +page.server.ts
export const load = async () => {
  const workouts = await getAllWorkouts();
  return { workouts };
};

// In page component
const { data } = $props();
let workouts = data.workouts;
```

## Next Steps for Feature Completion

- [ ] Implement form actions for workout CRUD operations
- [ ] Implement training plan day and workout assignment UI
- [ ] Create detailed plan view (plan/:id page)
- [ ] Implement full workout execution tracking with rep/weight input
- [ ] Add workout history and statistics views
- [ ] Implement data export/import
- [ ] Add mobile-specific optimizations
- [ ] Implement offline support with service workers

## Performance Considerations

- Use `$derived` for computed values instead of `$effect`
- Implement proper loading states on forms
- Consider pagination for large workout histories
- Use SvelteKit's `invalidate()` for cache management

## Testing
Currently no test framework configured. Consider adding:
- Vitest for unit tests
- Playwright for E2E tests

## Troubleshooting

**Build errors about missing files**: Ensure all files in `src/routes/` are created.
**Database not persisting**: Check that `data/` directory exists and is writable.
**Page not loading**: Verify `+page.svelte` and `+page.server.ts` files exist in the route directory.
