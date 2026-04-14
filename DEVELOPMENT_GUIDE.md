# Development Guide - Using the Design System

## Getting Started

### Prerequisites
- Node.js 18+
- npm (comes with Node)

### Initial Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

The dev server includes hot reload - your changes appear instantly.

## File Structure

```
workout-tracker/
├── src/
│   ├── app.css                      # Design system (colors, typography, utilities)
│   ├── routes/
│   │   ├── +layout.svelte          # Global layout template
│   │   ├── +page.svelte            # Home page
│   │   ├── exercises/
│   │   │   └── +page.svelte        # Exercise management
│   │   ├── plans/
│   │   │   ├── +page.svelte        # Plan list page
│   │   │   └── [id]/
│   │   │       ├── +page.svelte    # Single plan detail
│   │   └── execute/
│   │       ├── +page.svelte        # Workout execution
│   │       └── session/             # Session-specific UI state
│   └── lib/
│       ├── data/
│       │   ├── sqlite.ts            # Database runtime + query helpers
│       │   ├── exercises.ts         # Exercise data access
│       │   ├── workouts.ts          # Workout data access
│       │   └── sessions.ts          # Session + analytics data access
│       ├── designTokens.ts          # Design system TypeScript exports
│       └── components/
│           ├── Button.svelte        # Reusable button
│           ├── Card.svelte          # Reusable card
│           ├── Typography.svelte    # Reusable typography
│           └── Input.svelte         # Reusable input
├── data/
│   └── workout.db                   # SQLite database (auto-created)
└── COMPONENT_GUIDE.md               # This guide
```

## Workflows

### Adding a New Feature

1. **Create the data function** (if needed)
   ```typescript
   // In src/lib/data/workouts.ts (or exercises.ts / sessions.ts)
   export async function getMyData() {
     return queryRows('SELECT * FROM my_table');
   }
   ```

2. **Create the page**
   ```bash
   mkdir -p src/routes/myfeature
   touch src/routes/myfeature/+page.svelte
   ```

3. **Load data client-side**
   ```typescript
   // src/routes/myfeature/+page.svelte
   import { onMount } from 'svelte';
   import { getMyData } from '$lib/data/workouts';

   let data = $state([]);
   onMount(async () => {
     data = await getMyData();
   });
   ```

4. **Build the UI with components**
   ```svelte
   <!-- src/routes/myfeature/+page.svelte -->
   <script lang="ts">
     import Card from '$lib/components/Card.svelte';
     import Button from '$lib/components/Button.svelte';
     import Typography from '$lib/components/Typography.svelte';

     const { data } = $props();
   </script>

   <div class="space-y-8">
     <Typography variant="display" size="sm" color="primary">
       My Feature
     </Typography>

     <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
       {#each data.items as item}
         <Card hoverable>
           <Typography variant="headline" size="md">
             {item.name}
           </Typography>
         </Card>
       {/each}
     </div>
   </div>
   ```

### Adding a New Component

1. **Define the component file**
   ```bash
   touch src/lib/components/MyComponent.svelte
   ```

2. **Use existing components as template**
   ```svelte
   <script lang="ts">
     import { colors, getDynamicClasses } from '$lib/designTokens';

     interface Props {
       // Define your props here
     }

     let { variant = 'primary', ...props }: Props = $props();
   </script>

   <div class="...">
     <!-- Your component markup -->
   </div>
   ```

3. **Import in your page**
   ```svelte
   <script lang="ts">
     import MyComponent from '$lib/components/MyComponent.svelte';
   </script>

   <MyComponent />
   ```

### Working with Forms

#### 1. Simple Form (No Server Action)

```svelte
<script lang="ts">
  import Input from '$lib/components/Input.svelte';
  import Button from '$lib/components/Button.svelte';

  let formData = $state({
    name: '',
    description: ''
  });

  const handleSubmit = () => {
    console.log(formData);
    // Handle locally
  };
</script>

<form onsubmit={handleSubmit}>
  <Input bind:value={formData.name} placeholder="Name" required />
  <Input bind:value={formData.description} type="textarea" placeholder="Description" />
  <Button type="submit">Save</Button>
</form>
```

#### 2. Form with Server Action

```typescript
// +page.server.ts
export const actions = {
  async addItem({ request }) {
    const formData = await request.formData();
    const name = formData.get('name');
    const description = formData.get('description');

    // Validate
    if (!name || typeof name !== 'string') {
      return { error: 'Name is required' };
    }

    // Save to database
    await createItem({ name, description });

    return { success: true };
  }
};
```

```svelte
<!-- +page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import Input from '$lib/components/Input.svelte';
  import Button from '$lib/components/Button.svelte';

  let { form } = $props();
</script>

<form use:enhance method="POST" action="?/addItem">
  <Input type="text" name="name" placeholder="Name" required />
  <Input type="textarea" name="description" placeholder="Description" />
  <Button type="submit">Save</Button>

  {#if form?.error}
    <Typography color="error">{form.error}</Typography>
  {/if}
</form>
```

### Using the Database

All database functions are **async** - always use `await`:

```typescript
// Import from local data modules
import {
  createWorkoutLocal,
  getAllWorkoutsLocal,
  updateWorkoutLocal,
  deleteWorkoutLocal
} from '$lib/data/workouts';

const workouts = await getAllWorkoutsLocal();
await createWorkoutLocal('Bench Press', 'Upper chest');
await updateWorkoutLocal(id, 'New Name', 'Description');
await deleteWorkoutLocal(id);
```

## Styling Guidelines

### Using Colors

```svelte
<!-- Use color props on components -->
<Typography color="primary">Primary text</Typography>
<Typography color="secondary">Secondary text</Typography>
<Typography color="tertiary">Tertiary text</Typography>

<!-- In CSS, use custom properties -->
<style>
  .my-element {
    color: var(--primary);
    background: var(--surface-container);
  }
</style>
```

### Using Spacing

```svelte
<!-- Tailwind spacing classes -->
<div class="space-y-8">Item spacing</div>
<div class="gap-6">Grid gap</div>
<div class="p-6">Padding</div>

<!-- Organic spacing for asymmetry -->
<div class="ml-organic-lg">Left indent for visual interest</div>
```

### Creating Custom Classes

```css
/* In app.css, add your custom class */
.my-custom {
  padding: var(--spacing-6);
  background: var(--surface-container);
  border-radius: var(--radius-lg);
  color: var(--primary);
}
```

## TypeScript Tips

### Component Props with TypeScript

```svelte
<script lang="ts">
  interface Props {
    title: string;
    count: number;
    variant?: 'primary' | 'secondary';
  }

  let { title, count, variant = 'primary' }: Props = $props();
</script>
```

### Using Type Guards

```typescript
function validateWorkout(data: unknown): data is Workout {
  return (
    typeof data === 'object' &&
    data !== null &&
    'name' in data &&
    'description' in data
  );
}
```

## Common Patterns

### Empty State

```svelte
<div class="text-center py-12">
  <Typography variant="headline" size="md" color="secondary">
    No workouts yet
  </Typography>
  <Typography variant="body" size="md" color="tertiary" class="mt-2">
    Create your first workout to get started
  </Typography>
  <Button variant="primary" class="mt-6">Create Workout</Button>
</div>
```

### Loading State

```svelte
<script lang="ts">
  let isLoading = $state(false);

  const handleSave = async () => {
    isLoading = true;
    try {
      await saveData();
    } finally {
      isLoading = false;
    }
  };
</script>

<Button loading={isLoading} onclick={handleSave}>
  Save
</Button>
```

### List with No Dividers

```svelte
<div class="space-y-4">
  {#each items as item (item.id)}
    <Card class="list-item">
      <div class="flex justify-between items-center">
        <Typography variant="headline" size="sm">
          {item.name}
        </Typography>
        <Button variant="tertiary" size="sm">Edit</Button>
      </div>
    </Card>
  {/each}
</div>
```

### Responsive Grid

```svelte
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {#each items as item}
    <Card>{item.name}</Card>
  {/each}
</div>
```

## Debugging

### Check Component Rendering

```svelte
<pre>{JSON.stringify($props(), null, 2)}</pre>
```

### Log Database Calls

```typescript
console.log('Before:', workouts.length);
const new = await createWorkout({...});
console.log('After:', new);
```

### View Tailwind Classes Applied

Right-click → Inspect → Elements tab shows applied classes

### Browser DevTools

- **Computed** tab: See all CSS properties (including custom properties)
- **Styles** tab: See source file and line numbers
- **Console**: TypeScript errors and logs

## Common Issues

### "Cannot find module" Error
```bash
npm install  # Reinstall dependencies
npm run dev  # Restart dev server
```

### Component Not Styling
- Check imports: Did you import the component?
- Check props: Are the variant/size values correct?
- Check CSS: Is the class name spelled right in app.css?

### Database Not Saving
- Verify `data/` directory exists
- Check browser console for errors
- Ensure database functions use `await`

### Hot Reload Not Working
- Save file (CTRL+S)
- Check terminal for build errors
- Hard refresh browser (CTRL+SHIFT+R)

## Performance Tips

1. **Use `$derived` for computed values**
   ```typescript
   const filtered = $derived(items.filter(i => i.active));
   ```

2. **Lazy load images**
   ```svelte
   <img loading="lazy" src="..." />
   ```

3. **Use `page:invalidate()` sparingly**
   ```typescript
   import { invalidate } from '$app/navigation';
   await invalidate('/api/data');
   ```

4. **Limit list renders with `{#key}`**
   ```svelte
   {#key selectedPlan}
     <PlanDetails plan={selectedPlan} />
   {/key}
   ```

## Next Steps

1. **Implement Form Actions**: Add POST/PUT/DELETE handlers for CRUD operations
2. **Build Plan Detail Page**: Create `/plans/[id]` route with day/workout assignment
3. **Add Session Logging**: Implement rep/weight tracking interface
4. **Mobile Optimization**: Tune touch targets and input sizes for phone use

## Resources

- [Svelte 5 Docs](https://svelte.dev)
- [SvelteKit Docs](https://kit.svelte.dev)
- [Tailwind CSS Docs](https://tailwindcss.com)
- [COMPONENT_GUIDE.md](./COMPONENT_GUIDE.md) - Component API reference
- [DESIGN.md](./DESIGN.md) - Design philosophy
