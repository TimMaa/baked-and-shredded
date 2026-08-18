# Baked and Shredded

Personal Workout Tracker PWA. React 19 + Vite 6 + TypeScript 5.8 + Tailwind CSS 4 + shadcn/ui. Client-side only (IndexedDB), deployed as static site to Cloudflare Pages.

## Commands

```
npm run dev        # Vite dev server
npm run build      # tsc -b && vite build
npm run lint       # oxlint
npm run preview    # vite preview (serve built output)
npm run serve      # build + preview
npm run deploy     # build + wrangler pages deploy + cleanup old deployments
```

## Workflow

All work happens on `main`. Temporary local branches are fine for exploration, but only `main` is pushed to the remote. No feature branches, no PRs.

## Architecture

```
src/
  main.tsx              Entry point (StrictMode + createRoot)
  App.tsx               BrowserRouter, routes, ThemeProvider (next-themes)
  index.css             Tailwind imports, theme tokens, light/dark variables

  pages/                Route-level components (one per route)
    HomePage.tsx          Feature cards, settings (theme toggle, data export/import)
    ExercisesPage.tsx     Exercise library CRUD, muscle group selector, CSV import
    WorkoutsPage.tsx      Workout plan list, create/delete
    WorkoutDetailPage.tsx Workout editor: exercises, inline param editing, reorder
    ExecutePage.tsx       Live session: auto-advance, exercise switch, stopwatch
    HistoryPage.tsx       Analytics, session drill-down, date range filter

  components/
    ui/                 shadcn components (generated, don't hand-edit)
    layout/             AppShell, BottomNav
    workouts/           MuscleGroupSelector, MuscleGroupCoverage, ExerciseSelector
    sessions/           SessionStopwatch

  hooks/
    useExercises.ts     CRUD for exercises
    useWorkouts.ts      CRUD for workouts (enriched with exercise count, focus areas)
    useWorkoutDetail.ts Single workout: exercises, add/remove/reorder/inline-edit params
    useWorkoutSession.ts Session state machine: start, resume, auto-advance, end
    useHistory.ts       Session history, workout analytics, exercise deviation analytics
    usePWA.ts           Install prompt, SW update detection, online/offline

  lib/
    db.ts               IndexedDB singleton via `idb`. All CRUD + getActiveSession()
    muscleGroups.ts     13 muscle groups, 25-point budget, rating utilities
    dataTransfer.ts     Export/import all data as JSON
    utils.ts            cn() (clsx + tailwind-merge)

  types/index.ts        Exercise, Workout, WorkoutExercise, Session, SessionSet
  sw/service-worker.ts  Workbox precaching (separate tsconfig)
```

### Key patterns

**Session persistence**: `useWorkoutSession` resumes active sessions (completedAt === null) from IndexedDB on mount. No session data is lost on refresh or navigation.

**Auto-advance with override**: After confirming a set, `computeNextSet()` suggests the next logical set. Remaining exercises render as tappable chips for easy switching (supports super-setting).

**Inline editing**: Workout exercise parameters (sets/reps/weight/unit) are editable in-place via pencil icon on WorkoutDetailPage.

**Data model**: 5 IndexedDB stores — `exercises`, `workouts`, `workoutExercises` (indexes: byWorkout, byExercise), `sessions` (indexes: byWorkout, byStartedAt), `sessionSets` (indexes: bySession, byExercise).

**Routing**: React Router DOM v7, classic `BrowserRouter` + `Routes` + `Route`. No data routers, no loaders, no code splitting.

**State management**: No external library. Custom hooks wrapping IndexedDB calls with `useState`/`useEffect`/`useCallback`.

**Forms**: Plain controlled inputs with `useState`. No form libraries.

**Layout**: Mobile-first single-column (`max-w-md` centered) with fixed bottom nav.

## UI layer

**shadcn/ui v4** with `base-nova` style (Base UI primitives, not Radix). Add components: `npx shadcn add <component>`.

Key difference from Radix-based shadcn: `DialogTrigger` has no `asChild` — use controlled state (open/onOpenChange on Dialog root).

**Tailwind CSS 4** via `@tailwindcss/vite` plugin. Config lives in `src/index.css` using `@theme inline`.

**Color system**: oklch-based potato-inspired palette. Light mode: creamy background (hue 75), russet-brown primary (hue 55). Dark mode: deep earthy brown, golden accents (hue 65). Dark mode via `@custom-variant dark (&:is(.dark *))` + `next-themes` (defaultTheme="light").

**Icons**: `lucide-react`. **Font**: Geist Variable (`@fontsource-variable/geist`).

## TypeScript

Project references with three configs:

| File | Scope | Notable settings |
|---|---|---|
| `tsconfig.app.json` | `src/` (excludes `src/sw`) | `target: es2023`, `jsx: react-jsx`, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly` |
| `tsconfig.node.json` | `vite.config.ts` | `module: nodenext` |
| `tsconfig.sw.json` | `src/sw/` | `lib: ["ES2023", "WebWorker"]` |

`strict` is not enabled. Lint-style flags catch common issues without strict null friction.

## Linting

OxLint (not ESLint). Config in `.oxlintrc.json`. No formatter, no test framework, no pre-commit hooks.

## PWA

`vite-plugin-pwa` with `injectManifest` strategy. Manifest defined inline in `vite.config.ts`. Service worker at `src/sw/service-worker.ts` (Workbox precaching). `usePWA` hook manages install prompt and updates.

## External APIs

Environment variables use `VITE_*` prefix. Template in `.env.example`:

```
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

API client: `src/lib/gemini.ts` — Google Gemini AI (`gemini-3.1-flash-lite`) for workout analytics, recommendations, exercise classification. Uses `@google/genai` SDK.

## Deployment

Cloudflare Pages static hosting. No Workers, no server-side logic.

The `deploy` script: type-check + build → wrangler pages deploy → cleanup old deployments (keep 2 most recent). Runs manually from local, no CI/CD.

## Data export/import

`src/lib/dataTransfer.ts`: `exportAllData()` dumps all 5 stores to JSON download. `importData()` parses and writes to IndexedDB. Migration from old SQLite app via `scripts/export-sqlite.mjs`.
