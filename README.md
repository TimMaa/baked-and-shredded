# Workout Tracker

A personal workout tracking application built with Svelte 5, SvelteKit, and Tailwind CSS v4. Track your workouts, create training plans, and log your reps and weight during exercise sessions.

## Features

- **Workout Management**: Create workouts with names and descriptions
- **Training Plans**: Build weekly training plans and assign workouts to specific days
- **Rep & Weight Tracking**: Define target reps and weight for each workout in your plan
- **Workout Execution**: Track actual reps and weight completed during your workout sessions
- **Mobile-Friendly**: Fully responsive design for tracking workouts on your phone

## Tech Stack

- **Frontend**: Svelte 5 with SvelteKit
- **Styling**: Tailwind CSS v4
- **Database**: SQLite with better-sqlite3
- **Build Tool**: Vite
- **Language**: TypeScript

## Project Structure

```
src/
├── routes/           # SvelteKit file-based routing
│   ├── +layout.svelte     # Main layout with navigation
│   ├── +page.svelte       # Home page
│   ├── workouts/          # Workout management
│   ├── plans/             # Training plan management
│   └── execute/           # Workout execution tracking
├── lib/
│   ├── db.ts              # Database operations and schema
│   └── components/        # Reusable components
└── app.css                # Global styles with Tailwind
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open http://localhost:5173 in your browser

### Building for Production

```bash
npm run build
npm run preview
```

## Usage

### 1. Create Workouts
Navigate to **Workouts** and add your exercises with names and descriptions (e.g., "Bench Press" with description "3 sets, 5-10 reps").

### 2. Create Training Plans
Go to **Plans** and create a new training plan. You can name it something like "Push/Pull/Legs".

### 3. Configure Plan Days
Once a plan is created, you can assign workouts to specific days of the week and set:
- Target reps for each workout
- Target weight for each workout

### 4. Execute Workout
In **Execute**, select your training plan and the day you want to work out. The app will guide you through your exercises and let you log:
- Actual reps completed
- Weight lifted

## Database Schema

The application uses SQLite with the following main tables:

- `workouts` - Your available exercises
- `training_plans` - Your weekly training programs
- `plan_days` - Days within a training plan
- `plan_workouts` - Exercises assigned to plan days with targets
- `workout_sessions` - Individual workout sessions
- `session_sets` - Logged reps and weight during sessions

## Development Tips

### Svelte 5 Runes System

This project uses Svelte 5's reactive runes system:
- `$state()` - Reactive local state
- `$derived()` - Computed values
- `$effect()` - Side effects
- `$props()` - Component props with destructuring

### Tailwind CSS v4

Tailwind v4 configuration is CSS-first:
- No `postcss.config.js` needed
- No `tailwind.config.js` needed
- Configured via `@import "tailwindcss"` in CSS
- Custom theme values in `app.css` using CSS variables

### Adding New Pages

1. Create a new directory in `src/routes/` (e.g., `src/routes/reports/`)
2. Create `+page.svelte` for the page and `+page.server.ts` for server logic
3. Add navigation link in `src/routes/+layout.svelte`

## Next Steps

- Add workout edit/delete functionality
- Implement plan day and workout assignment UI
- Create history/statistics view
- Add data export functionality
- Implement offline support with IndexedDB fallback
- Mobile app with better touch controls

## License

MIT
