# Sprout & Soil Design System - Component Guide

## Overview

The Sprout & Soil Design System is a centralized, reusable design framework for building consistent, organic, and accessible UI components. All styles, tokens, and components are organized for easy usage and maintenance.

## Design Principles

- **Organic Precision**: Intentional asymmetry and natural curves
- **No-Line Rule**: Use background shifts instead of borders
- **Tonal Layering**: Depth through color and opacity, not shadows
- **Premium Feel**: Glass morphism and glowing accents in dark mode

## Color Palette

### Primary Color: Organic Terracotta (Sweet Potato)
- **Primary**: `#ffb59c` - Main action color
- **Container**: `#f26b38` - Used in buttons and highlights
- **On Primary**: `#5c1a00` - Text on primary backgrounds

### Secondary Color: Vibrant Sprout
- **Secondary**: `#aad54b` - Success and positive actions
- **Container**: `#769d12` - Used in secondary buttons
- **On Secondary**: `#253500` - Text on secondary backgrounds

### Tertiary Color: Warm Sand
- **Tertiary**: `#eebd8e` - Accents and tertiary actions
- **Container**: `#c88f3f` - Background states
- **On Tertiary**: `#3d2600` - Text on tertiary backgrounds

### Surface Colors (Earth Palette)
```
Surface (base):              #161311
Surface Dim:                 #161311
Surface Container Low:       #1e1b19
Surface Container:           #2d2927
Surface Container High:      #383432
Surface Container Highest:   #3d3936
Surface Bright:              #3c3836
```

## Typography Scale

### Display (Lexend) - Big Wins
- **display-lg**: 3.5rem / 700 weight - Hero numbers, streaks
- **display-md**: 2.8rem / 700 weight - Large headlines
- **display-sm**: 2rem / 700 weight - Section titles

### Headlines (Lexend)
- **headline-lg**: 2rem / 700 weight - Main section titles
- **headline-md**: 1.75rem / 700 weight - Subsection titles
- **headline-sm**: 1.5rem / 700 weight - Card titles

### Body (Plus Jakarta Sans)
- **body-lg**: 1.125rem / 500 weight - Large body text
- **body-md**: 1rem / 500 weight - Standard body text
- **body-sm**: 0.875rem / 500 weight - Compact text
- **body-xs**: 0.75rem / 500 weight - Labels and hints

## Component API Reference

### Button Component

```svelte
<Button variant="primary" | "secondary" | "tertiary" size="sm" | "md" | "lg" disabled={boolean}>
  Button Label
</Button>
```

**Props:**
- `variant`: Button style (default: `primary`)
- `size`: Button size (default: `md`)
- `disabled`: Disable button state
- `loading`: Show loading state
- `type`: HTML button type (`button`, `submit`, `reset`)
- `onclick`: Click handler

**Variants:**
- **primary** (Sweet Potato): Main call-to-action, gradient background
- **secondary** (Sprout): Success/positive actions, solid background
- **tertiary** (Ghost): Neutral actions, underline only

**Example:**
```svelte
<Button variant="primary" size="lg" onclick={() => handleSave()}>
  Save Workout
</Button>
```

### Card Component

```svelte
<Card hoverable={boolean} compact={boolean}>
  Card content
</Card>
```

**Props:**
- `hoverable`: Enable hover effects (default: `true`)
- `compact`: Use compact padding (default: `false`)
- `as`: HTML element to render as (`div`, `article`, `section`)

**Features:**
- Organic potato shape with xl rounding
- No borders - defined by background shifts
- Elevation through color layering
- Smooth hover transitions

**Example:**
```svelte
<Card hoverable>
  <Typography variant="headline" size="md">Card Title</Typography>
  <Typography variant="body" size="sm">Card content goes here</Typography>
</Card>
```

### Typography Component

```svelte
<Typography variant="display|headline|body" size="lg|md|sm" color="primary|secondary|tertiary|success|error|default" as="h1|h2|h3|p|span">
  Text content
</Typography>
```

**Props:**
- `variant`: Typography category (default: `body`)
- `size`: Size within category (default: `md`)
- `color`: Text color (default: `default`)
- `as`: HTML element to render as (default: `p`)

**Examples:**
```svelte
<!-- Display: Big number -->
<Typography variant="display" size="lg" color="primary">100</Typography>

<!-- Headline: Section title -->
<Typography variant="headline" size="md" as="h2" color="secondary">
  Training Plans
</Typography>

<!-- Body: Standard paragraph -->
<Typography variant="body" size="md" color="default">
  Create and manage your workouts...
</Typography>
```

### Input Component

```svelte
<Input
  type="text|number|email|password|textarea"
  placeholder="..."
  bind:value={variable}
  disabled={boolean}
  required={boolean}
  rows={number}
/>
```

**Props:**
- `type`: Input type (default: `text`)
- `placeholder`: Placeholder text
- `value`: Bound value
- `disabled`: Disable input
- `required`: Mark as required
- `rows`: Textarea rows (only for textarea type)
- `name`: Input name
- `id`: Input id
- `oninput`: Input event handler
- `onchange`: Change event handler

**Features:**
- Hollow input design (bottom border only)
- Focus states with primary color
- Full-width by default
- Smooth transitions

**Example:**
```svelte
<Input
  type="text"
  placeholder="Workout name"
  bind:value={workoutName}
  required
/>
```

## Layout Utilities

### Organic Spacing

Use asymmetrical spacing to break rigid grids:

```class
ml-organic-sm  - margin-left: 2.5rem (left indent, small)
ml-organic-lg  - margin-left: 3.5rem (left indent, large)
mr-organic-sm  - margin-right: 3rem (right margin, small)
mr-organic-lg  - margin-right: 4rem (right margin, large)
```

### Surface Classes

```class
surface-base                - Base background
surface-container-low       - Low elevation
surface-container           - Default elevation
surface-container-high      - High elevation
surface-container-highest   - Highest elevation
nav-floating                - Frosted glass navigation
```

### List Styling (No Dividers)

```svelte
<div class="space-y-4">
  {#each items as item}
    <Card class="list-item">
      <Typography variant="headline" size="sm">{item.name}</Typography>
    </Card>
  {/each}
</div>
```

List items automatically get:
- Alternating background colors
- Hover state with elevation
- Spacing gaps instead of dividers

## Color Intent Helpers (Coming Soon)

Use `designTokens.ts` helpers for consistent state coloring:

```typescript
import { getColorForState, getBackgroundForState } from '$lib/designTokens';

const errorColor = getColorForState('error');
const successBg = getBackgroundForState('success');
```

## Shadow & Elevation

Use CSS custom properties for consistent shadows:

```class
glow-primary     - Primary color glow
glow-secondary   - Secondary color glow
```

## Responsive Design

The design system follows Tailwind's responsive breakpoints:

```
xs: 320px
sm: 640px    - Tablet minimum
md: 768px    - Tablet standard
lg: 1024px   - Desktop minimum
xl: 1280px   - Desktop standard
2xl: 1536px  - Large desktop
```

**Usage:**
```svelte
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  <!-- Single column on mobile, 2 columns on tablet, 3 on desktop -->
</div>
```

## Do's and Don'ts

### ✅ Do
- Use asymmetrical margins for organic feel
- Layer colors for depth (no drop shadows)
- Apply consistent border radius (xl or lg)
- Use tonal layering for card elevation
- Build with components instead of raw HTML
- Follow the typography scale consistently

### ❌ Don't
- Use 1px solid borders (use background shifts)
- Use pure black (#000000) - use surface colors (#161311)
- Apply standard drop shadows
- Mix Alert Red in error states - use earthy red (#ffb4ab)
- Create inline styles - use design tokens
- Break the spacing scale

## Creating New Components

When creating new components, follow this pattern:

```svelte
<script lang="ts">
  import { getDynamicClasses, colors } from '$lib/designTokens';

  interface Props {
    variant?: 'primary' | 'secondary';
    // ... other props
  }

  let { variant = 'primary', children, ...rest }: Props = $props();

  const componentClass = getDynamicClasses.button(variant);
</script>

<div class={componentClass}>
  <slot />
</div>

<style>
  /* Component-scoped styles */
</style>
```

## Files Reference

- **`src/app.css`**: Root design tokens, utility classes, and global styles
- **`src/lib/designTokens.ts`**: TypeScript token definitions and helpers
- **`src/lib/components/Button.svelte`**: Reusable button component
- **`src/lib/components/Card.svelte`**: Reusable card component
- **`src/lib/components/Typography.svelte`**: Reusable typography component
- **`src/lib/components/Input.svelte`**: Reusable input component

## Quick Start Example

```svelte
<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import Button from '$lib/components/Button.svelte';
  import Typography from '$lib/components/Typography.svelte';
  import Input from '$lib/components/Input.svelte';
</script>

<div class="space-y-8">
  <Typography variant="display" size="sm" as="h1" color="primary">
    Welcome
  </Typography>

  <Card>
    <Typography variant="headline" size="md">Create Your Workout</Typography>

    <div class="space-y-6 mt-6">
      <Input type="text" placeholder="Workout name" />
      <Input type="textarea" placeholder="Description" rows={3} />

      <div class="flex gap-4">
        <Button variant="primary">Save</Button>
        <Button variant="tertiary">Cancel</Button>
      </div>
    </div>
  </Card>
</div>
```

## Need Help?

Refer to:
1. **DESIGN.md** - Design philosophy and principles
2. **src/app.css** - All CSS custom properties and utilities
3. **src/lib/designTokens.ts** - TypeScript token definitions
4. **Existing pages** - Working examples of components in use
