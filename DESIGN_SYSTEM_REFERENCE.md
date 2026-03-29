# Design System Quick Reference

## Components

### Button
```svelte
<Button variant="primary|secondary|tertiary" size="sm|md|lg">
  Click me
</Button>
```

### Card
```svelte
<Card hoverable compact={false}>
  Content here
</Card>
```

### Typography
```svelte
<Typography variant="display|headline|body" size="lg|md|sm"
            color="primary|secondary|tertiary|success|error|default" as="h1|h2|h3|p|span">
  Text here
</Typography>
```

### Input
```svelte
<Input type="text|number|email|password|textarea"
       placeholder="..."
       bind:value={data}
       required disabled />
```

## Colors

| Color | CSS Variable | Use Case |
|-------|-------------|----------|
| Primary | `--primary` | Main actions, highlights |
| Secondary | `--secondary` | Success, positive actions |
| Tertiary | `--tertiary` | Accents, alternative actions |
| Surface | `--surface-*` | Backgrounds |

## Typography Sizes

| Scale | Font Size | Weight | Use Case |
|-------|-----------|--------|----------|
| display-lg | 3.5rem | 700 | Hero headlines |
| display-md | 2.8rem | 700 | Large titles |
| display-sm | 2rem | 700 | Section titles |
| headline-lg | 2rem | 700 | Card titles |
| headline-md | 1.75rem | 700 | Subtitles |
| headline-sm | 1.5rem | 700 | Card titles |
| body-lg | 1.125rem | 500 | Large text |
| body-md | 1rem | 500 | Body text |
| body-sm | 0.875rem | 500 | Compact text |
| body-xs | 0.75rem | 500 | Labels |

## Spacing Scale

```
0 = 0rem
1 = 0.25rem
2 = 0.5rem
3 = 0.75rem
4 = 1rem
6 = 1.5rem
8 = 2rem
12 = 3rem
16 = 4rem
```

**Usage:** `space-y-8`, `gap-6`, `p-4`, `mt-6`

## Tailwind Classes

### Display
```
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
gap-6
space-y-8
```

### Positioning
```
flex items-center justify-between
absolute relative
ml-organic-lg mr-organic-sm (asymmetric spacing)
```

### Sizing
```
w-full max-w-2xl
h-screen min-h-screen
p-6 px-4 py-2
```

### Effects
```
opacity-50 hover:opacity-100
transition-all duration-200
rounded-lg rounded-full
```

## Common Patterns

### Header + Content
```svelte
<Typography variant="display" size="sm" color="primary">
  Page Title
</Typography>

<div class="mt-8 space-y-6">
  <!-- Content -->
</div>
```

### Form Layout
```svelte
<Card>
  <Typography variant="headline" size="md">Form Title</Typography>

  <form class="mt-6 space-y-6">
    <Input type="text" placeholder="Field 1" required />
    <Input type="textarea" placeholder="Field 2" rows={4} />

    <div class="flex gap-3 pt-4">
      <Button variant="primary" type="submit">Save</Button>
      <Button variant="tertiary" type="button">Cancel</Button>
    </div>
  </form>
</Card>
```

### List Items
```svelte
<div class="space-y-4">
  {#each items as item}
    <Card class="list-item">
      <div class="flex justify-between items-center">
        <Typography variant="headline" size="sm">
          {item.name}
        </Typography>
        <div class="flex gap-2">
          <Button variant="secondary" size="sm">Edit</Button>
          <Button variant="tertiary" size="sm">Delete</Button>
        </div>
      </div>
    </Card>
  {/each}
</div>
```

### Grid of Cards
```svelte
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {#each items as item}
    <Card hoverable>
      <Typography variant="headline" size="md">
        {item.name}
      </Typography>
      <Typography variant="body" size="sm" class="mt-2">
        {item.description}
      </Typography>
    </Card>
  {/each}
</div>
```

### Empty State
```svelte
{#if items.length === 0}
  <div class="text-center py-12">
    <Typography variant="headline" size="md" color="secondary">
      No results
    </Typography>
    <Button variant="primary" class="mt-6">Create First Item</Button>
  </div>
{/if}
```

## Responsive Breakpoints

```
xs: 320px (default)
sm: 640px (mobile landscape, small tablet)
md: 768px (tablet)
lg: 1024px (desktop)
xl: 1280px (large desktop)
2xl: 1536px (extra large)
```

**Usage:** `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

## CSS Custom Properties

```css
/* Colors */
--primary: #ffb59c
--secondary: #aad54b
--tertiary: #eebd8e
--surface-base: #161311
--surface-container: #2d2927

/* Spacing */
--spacing-4: 1rem
--spacing-6: 1.5rem
--spacing-8: 2rem

/* Typography */
--font-display: 'Lexend'
--font-body: 'Plus Jakarta Sans'

/* Rounding */
--radius-lg: 1.125rem
--radius-xl: 1.5rem

/* Shadows */
--elevation-1: ...
```

## Import Statements

### Components
```typescript
import Button from '$lib/components/Button.svelte';
import Card from '$lib/components/Card.svelte';
import Typography from '$lib/components/Typography.svelte';
import Input from '$lib/components/Input.svelte';
```

### Database
```typescript
import {
  getAllWorkouts,
  createWorkout,
  updateWorkout,
  deleteWorkout
} from '$lib/db';
```

### Design Tokens
```typescript
import {
  colors,
  spacing,
  typography,
  getDynamicClasses
} from '$lib/designTokens';
```

### Forms & Navigation
```typescript
import { enhance } from '$app/forms';
import { invalidate } from '$app/navigation';
```

## State Management

### Reactive Variables
```typescript
let count = $state(0);
let filtered = $derived(items.filter(i => i.active));

function handleClick() {
  count++;
}
```

### Form Binding
```svelte
<Input bind:value={data.name} />
<Input bind:value={data.description} type="textarea" />
```

### Effects
```typescript
$effect(() => {
  console.log('Name changed to:', name);
});
```

## Common Database Operations

```typescript
// Get all
const workouts = await getAllWorkouts();

// Create
await createWorkout({
  name: 'Bench Press',
  description: 'Upper chest'
});

// Update
await updateWorkout(id, {
  name: 'Updated name'
});

// Delete
await deleteWorkout(id);

// Get one
const workout = await getWorkout(id);
```

## Server Actions

```typescript
export const actions = {
  async create({ request }) {
    const data = await request.formData();
    const name = data.get('name');

    // Validate
    if (!name) return { error: 'Name required' };

    // Save
    await createWorkout({ name, description: data.get('description') });

    return { success: true };
  },

  async delete({ request }) {
    const id = await request.formData().get('id');
    await deleteWorkout(id);
    return { success: true };
  }
};
```

## Keyboard Shortcuts

```
CTRL+S          Save file
CTRL+/          Toggle comment
CTRL+K CTRL+C   Comment
CTRL+SHIFT+R    Hard refresh browser
F12             Open DevTools
CTRL+SHIFT+I    Open DevTools alternate
```

## File Locations

| What | Where |
|------|-------|
| Pages | `src/routes/*/+page.svelte` |
| Data Loading | `src/routes/*/+page.server.ts` |
| Components | `src/lib/components/*.svelte` |
| Design System | `src/app.css` |
| Design Tokens | `src/lib/designTokens.ts` |
| Database | `src/lib/db.ts` |
| Built Database | `data/workout.db` |

## Commands

```bash
npm run dev        # Start dev server (http://localhost:5173)
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Check for errors
```

## Tips & Tricks

- ✨ **Components first**: Always reach for Button/Card/Typography before writing HTML
- 🎨 **Use design tokens**: Never hardcode colors, always use CSS variables
- 📦 **Keep components small**: One responsibility per component
- 🔄 **TypeScript props**: Define interfaces for all component props
- ⚡ **Async/await**: All database functions are async, always use await
- 🎯 **Responsive first**: Mobile styles first, then md: lg: for larger screens
- 💾 **FormData binding**: Use `bind:value` on input components for forms
- 🌳 **Asymmetry rules**: Use `ml-organic-*` to break rigid layouts
