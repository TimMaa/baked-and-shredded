# Baked and Shredded

Personal Workout Tracker PWA. React 19 + Vite 8 + TypeScript 5.8 + Tailwind CSS 4 + shadcn/ui. Client-side only (IndexedDB), deployed as static site to Cloudflare Pages.

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

## Project setup reference

This section documents the full project setup so it can be replicated for new apps.

### Scaffolding

Started from `create vite` with the React + TypeScript template (`@vitejs/plugin-react` using Oxc). Produces `index.html`, `src/main.tsx`, `vite.config.ts`, three tsconfig files, and `.oxlintrc.json`.

### Path alias

`@/*` maps to `./src/*`, configured in three places:

- **`tsconfig.app.json`** — `paths: { "@/*": ["./src/*"] }` (IDE resolution + type checking)
- **`package.json`** — `imports: { "@/*": "./src/*" }` (Node.js subpath imports)
- **`vite.config.ts`** — `resolve.alias: { "@": path.resolve(import.meta.dirname, "./src") }` (bundler resolution)

### TypeScript

Project references pattern with three configs:

| File | Scope | Notable settings |
|---|---|---|
| `tsconfig.app.json` | `src/` (excludes `src/sw` if using PWA) | `target: es2023`, `jsx: react-jsx`, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly` |
| `tsconfig.node.json` | `vite.config.ts` | `module: nodenext`, same lint flags |
| `tsconfig.sw.json` | `src/sw/` (only if using PWA) | `lib: ["ES2023", "WebWorker"]`, minimal — service worker needs WebWorker types |

`strict` is not enabled. The lint-style flags (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`) catch common issues without the friction of strict null checks.

### Linting

OxLint (`oxlint` package), not ESLint. Config in `.oxlintrc.json`:

```json
{
  "plugins": ["react", "typescript", "oxc"],
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

No formatter (no Prettier/Biome), no test framework, no pre-commit hooks. Keeps tooling minimal.

### UI layer

**shadcn/ui v4** with the `base-nova` style. This uses **Base UI** (`@base-ui/react`) primitives instead of Radix. Configured in `components.json`:

```json
{
  "style": "base-nova",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

Add components with `npx shadcn add <component>`. They land in `src/components/ui/`.

Key differences from Radix-based shadcn: `DialogTrigger` has no `asChild` prop — use controlled state instead (open/onOpenChange on the Dialog root).

**Tailwind CSS 4** via the `@tailwindcss/vite` plugin. No `tailwind.config.js` needed — configuration lives in `src/index.css` using `@theme inline` blocks and CSS custom properties.

**Color system**: oklch-based with light/dark themes defined as CSS variables in `src/index.css`. Primary hue is 35 (terracotta). Dark mode uses `@custom-variant dark (&:is(.dark *))` with `next-themes`.

**Styling utilities**:
- `cn()` function in `src/lib/utils.ts` — combines `clsx` + `tailwind-merge`
- `class-variance-authority` (cva) for component variants
- `tw-animate-css` for animation utilities

**Icons**: `lucide-react`.
**Font**: Geist Variable via `@fontsource-variable/geist`, set as `--font-sans` in CSS.

### Architecture

```
src/
  main.tsx              Entry point (StrictMode + createRoot)
  App.tsx               BrowserRouter, routes, PWA hooks, error boundary
  index.css             Tailwind imports, theme tokens, light/dark variables

  pages/                Route-level components (one per route)
  components/
    ui/                 shadcn components (generated, don't hand-edit)
    layout/             AppShell, BottomNav
    workouts/           Workout and exercise domain components
    sessions/           Session execution components (stopwatch, set tracker)
  hooks/                Custom hooks (data access, PWA, utility)
  lib/                  Utilities and API clients (db, api, utils)
  types/                TypeScript interfaces
  sw/                   Service worker (separate tsconfig, only if using PWA)
```

**Routing**: React Router DOM v7, classic `BrowserRouter` + `Routes` + `Route` pattern. No data routers, no loaders, no code splitting.

**State management**: No external library. Custom hooks wrapping IndexedDB calls with `useState`/`useEffect`/`useCallback`. Each hook manages its own loading/error state and exposes a `refresh()` function.

**Data persistence**: IndexedDB via the `idb` library. Singleton connection in `src/lib/db.ts`. Object stores defined in the `upgrade` callback — no migration files. Stores for this app: exercises, workouts, workoutExercises, sessions, sessionSets.

**Forms**: Plain controlled inputs with `useState`. No React Hook Form or Formik.

**Data fetching**: Plain `fetch()` for external APIs. No TanStack Query or SWR.

**Layout**: Mobile-first single-column (`max-w-md` centered) with fixed bottom nav. `AppShell` component wraps all routes.

### PWA

`vite-plugin-pwa` with `injectManifest` strategy:

- **Manifest** defined inline in `vite.config.ts` — name, icons (192/512 PNG), theme color, standalone display, portrait orientation
- **Service worker** at `src/sw/service-worker.ts` — Workbox precaching + any background sync/notification logic
- **Separate tsconfig** (`tsconfig.sw.json`) — needs `WebWorker` lib, excluded from main app tsconfig
- **`usePWA` hook** — manages install prompt (`beforeinstallprompt`), service worker update detection, online/offline status
- **PWA meta tags** in `index.html` — `theme-color`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`
- 
### External APIs

Environment variables use the `VITE_*` prefix (exposed to client bundle). Template in `.env.example`:

```
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

API clients in `src/lib/`:
- **`gemini.ts`** — Google Gemini AI (`gemini-3.1-flash-lite`). Workout analytics, recommendations, plan adjustments and exercise classification. Uses `@google/genai` SDK.


### Deployment

**Cloudflare Pages** static hosting. No Workers, no wrangler.toml, no server-side logic.

The `deploy` script does three things:
1. `tsc -b && vite build` — type check + bundle into `dist/`
2. `npx wrangler pages deploy dist --project-name baked-and-shredded` — upload to Cloudflare Pages
3. `node scripts/cleanup-deployments.mjs` — delete all but the 2 most recent deployments

No CI/CD pipeline — deploy runs manually from local.

To set up for a new project: create a Cloudflare Pages project in the dashboard (or `wrangler pages project create <name>`), then update the `--project-name` flag and the `PROJECT` constant in `scripts/cleanup-deployments.mjs`.

---

## Placeholder reference

| Placeholder | Example (Planty) | Description |
|---|---|---|
| Placeholder | Value | Description |
|---|---|---|
| `{{PROJECT_NAME}}` | Baked & Shredded | App name |
| `{{PROJECT_DESCRIPTION}}` | Personal workout tracker PWA | One-line description |
| `{{PRIMARY_HUE}}` | 35 | oklch hue for the color system (0-360) |
| `{{PRIMARY_COLOR_NAME}}` | terracotta | Human-readable color name |
| `{{DOMAIN_DIR_1}}` | workouts/ | Workout/exercise domain components |
| `{{DOMAIN_DIR_2}}` | sessions/ | Session execution components |
| `{{OBJECT_STORES}}` | exercises, workouts, workoutExercises, sessions, sessionSets | IndexedDB store names |
| `{{CLOUDFLARE_PROJECT_NAME}}` | baked-and-shredded | Cloudflare Pages project name |
| `{{ENV_VARS}}` | VITE_GEMINI_API_KEY=... | .env.example contents |
| `{{API_CLIENT_FILE}}` | gemini.ts | API client filename |
| `{{API_CLIENT_DESCRIPTION}}` | Google Gemini AI for workout analytics | What the API client does |
