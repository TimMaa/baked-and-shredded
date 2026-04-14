# Copilot Instructions for Workout Tracker

## Project Overview
Workout Tracker is a personal fitness application built with Svelte 5, SvelteKit, and Tailwind CSS v4. The app allows users to:
- Create and organize exercises with descriptions and muscle group targets
- Create workouts by combining exercises with specific rep and weight targets
- Build training plans and assign workouts to specific days
- Track actual reps and weight completed during workout sessions
- View muscle group coverage across workouts

## Tech Stack
- **Frontend**: Svelte 5 with SvelteKit and reactive runes ($state, $derived, $effect)
- **Styling**: Tailwind CSS v4 with @tailwindcss/vite plugin
- **Database**: Capacitor SQLite via local data modules in `src/lib/data/*`
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

### Database (local SQLite modules)

### File Structure
### Database (local SQLite modules)
 - Data functions in `src/lib/data/*.ts` are async and return promises
 - Use `await` when calling data functions
 - Local storage is managed through Capacitor SQLite (`src/lib/data/sqlite.ts`)
 - Schema includes: exercises, workouts, workout_exercises, workout_sessions, session_sets
 - Muscle group ratings are stored in `focus_areas` for coverage calculations

### Database Functions Reference
 - Exercises: `getAllExercisesLocal()`, `createExerciseLocal()`, `updateExerciseLocal()`, `deleteExerciseLocal()`
 - Workouts: `getAllWorkoutsLocal()`, `getWorkoutLocal()`, `getWorkoutWithExercisesLocal()`, `createWorkoutLocal()`, `updateWorkoutLocal()`, `deleteWorkoutLocal()`
 - Sessions: `createWorkoutSessionLocal()`, `logSessionSetLocal()`, `completeWorkoutSessionLocal()`, `getWorkoutSessionHistoryLocal()`

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
│   ├── data/               # Local SQLite data modules
│   └── components/         # Reusable Svelte components (recommended)
└── app.css                 # Global styles with Tailwind imports
```
```
src/
├── routes/           # SvelteKit file-based routing
│   ├── +layout.svelte      # Main navigation layout
│   ├── +page.svelte        # Home dashboard with feature cards
│   ├── exercises/          # Exercise management with muscle group targeting
│   ├── workouts/           # Workout management
│   ├── plans/              # Training plan management
│   │   └── [id]/          # Detailed plan view with exercise details
│   └── execute/            # Workout execution tracking
├── lib/
│   ├── data/               # Local SQLite data modules for all entities
│   ├── muscleGroups.ts    # Muscle group constants and calculations
│   ├── designTokens.ts    # Design system tokens
│   ├── components/        # Reusable Svelte components
│   │   ├── Button.svelte
│   │   ├── Card.svelte
│   │   ├── Input.svelte
│   │   ├── Typography.svelte
│   │   ├── MuscleGroupSelector.svelte
│   │   ├── MuscleGroupCoverage.svelte
│   │   └── WeekCalendarView.svelte
│   └── data/              # Static data files (exercises CSV)
└── app.css                # Global styles with Tailwind imports
```
### File Structure
```
src/
├── routes/           # SvelteKit file-based routing
│   ├── +layout.svelte      # Main navigation layout
│   ├── +page.svelte        # Home dashboard with feature cards
│   ├── exercises/          # Exercise management with muscle group targeting
│   ├── workouts/           # Workout management
│   ├── plans/              # Training plan management
│   │   └── [id]/          # Detailed plan view with exercise details
│   └── execute/            # Workout execution tracking
├── lib/
│   ├── data/               # Local SQLite data modules for all entities
│   ├── muscleGroups.ts    # Muscle group constants and calculations
│   ├── designTokens.ts    # Design system tokens
│   ├── components/        # Reusable Svelte components
│   │   ├── Button.svelte
│   │   ├── Card.svelte
│   │   ├── Input.svelte
│   │   ├── Typography.svelte
│   │   ├── MuscleGroupSelector.svelte
│   │   ├── MuscleGroupCoverage.svelte
│   │   └── WeekCalendarView.svelte
│   └── data/              # Static data files (exercises CSV)
├── data/                  # Runtime data directory (workout.db)
└── app.css                # Global styles with Tailwind imports
```

## Development Commands
### Database (local SQLite modules)
 - Data functions in `src/lib/data/*.ts` are async and return promises
 - Use `await` when calling data functions
 - Local storage is managed through Capacitor SQLite (`src/lib/data/sqlite.ts`)
 - Schema includes: exercises, workouts, workout_exercises, workout_sessions, session_sets
 - Muscle group ratings are stored in `focus_areas` for coverage calculations

### Database Functions Reference
 - Exercise operations: `getAllExercisesLocal()`, `createExerciseLocal()`, `updateExerciseLocal()`, `deleteExerciseLocal()`
 - Workout operations: `getAllWorkoutsLocal()`, `getWorkoutLocal()`, `getWorkoutWithExercisesLocal()`, `createWorkoutLocal()`, `updateWorkoutLocal()`, `deleteWorkoutLocal()`
 - Session operations: `createWorkoutSessionLocal()`, `logSessionSetLocal()`, `completeWorkoutSessionLocal()`, `getWorkoutSessionHistoryLocal()`

### File Structure
```
src/
├── routes/           # SvelteKit file-based routing
│   ├── +layout.svelte      # Main navigation layout
│   ├── +page.svelte        # Home dashboard with feature cards
│   ├── exercises/          # Exercise management with muscle group targeting
│   ├── workouts/           # Workout management
│   ├── plans/              # Training plan management
│   │   └── [id]/          # Detailed plan view with exercise details
│   └── execute/            # Workout execution tracking
├── lib/
│   ├── data/               # Local SQLite data modules for all entities
│   ├── muscleGroups.ts    # Muscle group constants and calculations
│   ├── designTokens.ts    # Design system tokens
│   ├── components/        # Reusable Svelte components
│   │   ├── Button.svelte
│   │   ├── Card.svelte
│   │   ├── Input.svelte
│   │   ├── Typography.svelte
│   │   ├── MuscleGroupSelector.svelte
│   │   ├── MuscleGroupCoverage.svelte
│   │   └── WeekCalendarView.svelte
│   ├── muscleGroups.ts    # Muscle group definitions
│   └── data/              # Static data files (exercises CSV)
├── data/                  # Runtime data directory (workout.db)
└── app.css                # Global styles with Tailwind imports
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
6. **Form Actions Implemented**: Exercises and workouts pages already have working form actions for CRUD operations. Use as reference when implementing new forms.
7. **Muscle Group System**: The `muscleGroups.ts` file defines all available muscle groups. Use `MuscleGroupSelector` and `MuscleGroupCoverage` components for consistent UI.
8. **Design Theme**: The app follows a "Digital Garden" metaphor with nature-inspired language and values. Keep UX patterns consistent with existing components.

## Form Actions & Server Actions Status

**Currently Implemented:**
- Exercises page: Full CRUD with `create`, `update`, `delete` actions
- Plans page: Plan creation and workout assignment actions
- Plans/[id] page: Detailed workout assignment forms

**Pattern to Follow:**
```typescript
// In +page.server.ts
export const actions = {
  create: async ({ request }) => {
    const data = await request.formData();
    // Process and validate
    const result = await createItem(/* ... */);
    return { success: true, message: 'Created successfully' };
  },
  delete: async ({ request }) => {
    // Handle deletion
    return { success: true };
  },
};
```

## Database Operations Example

```typescript
// In +page.server.ts
export const load = async () => {
  const workouts = await getAllWorkouts();
  return { workouts };
```

## Next Steps for Feature Completion
## Performance Considerations
## Feature Status & Next Steps


**Build errors about missing files**: Ensure all files in `src/routes/` are created.
## Performance Considerations
 
```typescript
// In +page.server.ts
export const load = async () => {
  const exercises = await getAllExercises();
  const workouts = await getAllWorkouts();
  return { exercises, workouts };
};

// In page component
const { data } = $props();
let exercises = data.exercises;
let workouts = data.workouts;
```

## Feature Status & Next Steps

- [x] Design system with typography and components

- [ ] Pagination for workout history

## Performance Considerations
- sql.js runs in-memory; consider lazy loading for very large datasets

## Testing
- Playwright for E2E tests

## Troubleshooting

**Build errors about missing files**: Ensure all files in `src/routes/` and their corresponding server files are created.
**Database not persisting**: Check that `data/` directory exists and is writable by the Node process.
**Page not loading**: Verify `+page.svelte` and `+page.server.ts` files exist in the route directory.
- The app uses sql.js which runs in-memory; consider lazy loading for very large datasets

## Testing
- Playwright for E2E tests

## Troubleshooting

**Build errors about missing files**: Ensure all files in `src/routes/` and their corresponding server files are created.
**Database not persisting**: Check that `data/` directory exists and is writable by the Node process.
**Page not loading**: Verify `+page.svelte` and `+page.server.ts` files exist in the route directory.
## Database Operations Example

```typescript
// In +page.server.ts
export const load = async () => {
  const exercises = await getAllExercises();
  const workouts = await getAllWorkouts();
  return { exercises, workouts };
};

// In page component
const { data } = $props();
let exercises = data.exercises;
let workouts = data.workouts;
```

## Feature Status & Next Steps

### ✅ Completed Features
- [x] Exercise management (CRUD with muscle group targeting)
- [x] Workout management (CRUD - combine exercises into workouts)
- [x] Training plans (Create and view plans with day assignments)
- [x] Detailed plan view (plans/:id page with full exercise details)
- [x] Workout execution page (Select and start workout sessions)
- [x] Muscle group coverage visualization (MuscleGroupCoverage component)
- [x] Form actions for exercises (create, update, delete)
- [x] Form actions for workout/plan operations
- [x] Mobile-responsive design (Tailwind CSS v4)
- [x] Design system with typography and components

### 🚀 In Progress / To Do
- [ ] Complete workout execution tracking (submit completed reps/weight for each set)
- [ ] Persist workout session data to database
- [ ] Workout history and session logs
- [ ] Statistics and analytics views (volume, frequency by muscle group)
- [ ] Data export/import functionality
- [ ] Offline support with service workers
- [ ] Unit and E2E tests (no test framework configured yet)
- [ ] Performance optimizations for large datasets
- [ ] Pagination for workout history

## Performance Considerations

- Use `$derived` for computed values instead of `$effect`
- Implement proper loading states on forms
- Consider pagination for large workout histories
- Use SvelteKit's `invalidate()` for cache management
- sql.js runs in-memory; consider lazy loading for very large datasets

## Testing
Currently no test framework configured. Consider adding:
- Vitest for unit tests
- Playwright for E2E tests

## Troubleshooting

**Build errors about missing files**: Ensure all files in `src/routes/` and their corresponding server files are created.
**Database not persisting**: Check that `data/` directory exists and is writable by the Node process.
**Page not loading**: Verify `+page.svelte` and `+page.server.ts` files exist in the route directory.
**Muscle groups not showing**: Verify `muscleGroups.ts` is imported and the component uses `MuscleGroupSelector` or `MuscleGroupCoverage`.
**Muscle groups not showing**: Verify `muscleGroups.ts` is imported and the component uses `MuscleGroupSelector` or `MuscleGroupCoverage`.
**Muscle groups not showing**: Verify `muscleGroups.ts` is imported and the component uses `MuscleGroupSelector` or `MuscleGroupCoverage`.
