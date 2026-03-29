# Design System Strategy: The Sprout & Soil Framework

## 1. Overview & Creative North Star: "Organic Precision"
This design system moves away from the rigid, sterile grids of traditional fitness apps to embrace **Organic Precision**. The North Star is the concept of a "digital garden"—a space that feels grounded and earthy but is powered by high-performance energy. 

To break the "template" look, we utilize **intentional asymmetry**. Layouts should mimic the natural, irregular curves of organic forms. We avoid sharp 90-degree intersections, opting instead for overlapping "nested" containers and editorial-style typography that breaks the container bounds. This system isn't just about tracking calories; it’s about growth, using a sophisticated interplay of deep, loamy backgrounds and "glowing" metabolic accents.

---

## 2. Color Theory & Tonal Depth
We utilize a Material 3-based palette but apply it with an editorial eye.

### The "No-Line" Rule
**Standard 1px borders are strictly prohibited.** Boundaries must be defined through background shifts. 
- A card (`surface-container-low`) should sit on a background (`surface`) without a stroke. 
- Use the **Spacing Scale** (e.g., `3.5` or `4`) to create breathing room that defines edges.

### Surface Hierarchy & Nesting
Treat the UI as physical layers. 
- **Base Level:** `surface` (#161311).
- **Sectioning:** Use `surface-container-low` (#1e1b19) for large content areas.
- **Interactive Elements:** Use `surface-container-high` (#2d2927) for cards to create a natural "lift."

### The "Glass & Gradient" Rule
To evoke a premium "glowing" feel in dark mode:
- **Hero CTAs:** Use a linear gradient from `primary` (#ffb59c) to `primary-container` (#f26b38) at a 135° angle.
- **Floating Navigation:** Use `surface-bright` (#3c3836) at 70% opacity with a `20px` backdrop-blur to create a "frosted soil" effect.

---

## 3. Typography: Bold Motivation
The typography pairing balances high-energy "Lexend" for performance and "Plus Jakarta Sans" for clear, professional utility.

*   **Display (Lexend):** Used for "Big Wins"—weight loss numbers, streak counts, or "Go!" prompts. The `display-lg` (3.5rem) should feel massive and unmissable.
*   **Headlines (Lexend):** Used for page titles and section headers. High-contrast sizing between `headline-lg` and `body-md` is required to create an editorial rhythm.
*   **Body & Labels (Plus Jakarta Sans):** Used for all functional data. The geometric nature of Plus Jakarta Sans ensures that even at `body-sm`, fitness metrics remain legible during high-intensity movement.

---

## 4. Elevation & Depth: Tonal Layering
We reject the "drop shadow" defaults. Depth is achieved through light and opacity.

*   **The Layering Principle:** Instead of a shadow, place a `surface-container-highest` (#383432) element inside a `surface-dim` (#161311) container. The shift in "warmth" provides all the separation needed.
*   **Ambient Shadows:** For floating action buttons, use a shadow with a 24px blur, 8% opacity, using the `primary` color (#ffb59c) as the shadow tint. This creates a "glow" rather than a "shadow."
*   **The "Ghost Border" Fallback:** If high-density data requires a container, use the `outline-variant` (#58423a) at **15% opacity**. This creates a "whisper" of a line that guides the eye without cluttering the UI.

---

## 5. Components & Primitives

### Buttons
*   **Primary (The Sweet Potato):** Background `primary-container` (#f26b38), text `on-primary` (#5c1a00). Use `xl` (3rem) rounding to create a "tuber" shape.
*   **Secondary (The Sprout):** Background `secondary-container` (#769d12), text `on-secondary` (#253500). Used exclusively for "Success" or "Start Workout" actions.
*   **Tertiary:** No background. Bold `lexend` text in `tertiary` (#eebd8e) with a subtle `2px` underline in `surface-variant`.

### Input Fields
*   **The "Hollow" Input:** Background `surface-container-lowest` (#100e0c). Instead of a full border, use a bottom-only "thick" stroke (3px) of `outline` (#a78a81) that transforms into `primary` (#ffb59c) on focus.

### Cards & Lists
*   **The "Potato" Card:** Use rounding scale `lg` (2rem) or `xl` (3rem). 
*   **Anti-Divider Policy:** Do not use horizontal lines between list items. Use a `1.5` (0.5rem) vertical gap and a subtle background shift (`surface-container`) on alternating items or on hover.

### Specialized App Components
*   **Growth Tracker (The Vine):** A vertical progress stepper using `secondary` (#aad54b) with "leaf" nodes instead of circles.
*   **Macro-Tuber Charts:** Donut charts for nutrition using `primary` (Carbs), `tertiary` (Fats), and `secondary` (Protein), with extra-thick strokes and rounded ends.

---

## 6. Do’s and Don'ts

### Do:
*   **Do** use asymmetrical margins. For example, give a header a `10` (3.5rem) left margin and a `16` (5.5rem) right margin to feel more "organic."
*   **Do** lean into the "Tonal Layering." If a screen feels flat, don't add a shadow; change the background color of the parent container.
*   **Do** use the `xl` (3rem) rounding for large containers to mimic the soft shape of a potato.

### Don’t:
*   **Don’t** use pure black (#000000). The `background` (#161311) is a rich, warm "earth" black that provides the foundation for the glowing oranges.
*   **Don’t** use 1px solid borders. It breaks the organic metaphor and makes the app feel like a generic spreadsheet.
*   **Don’t** use standard "Alert Red" for errors if possible. Use the `error` (#ffb4ab) tone, which is a desaturated "earthy" red that fits the palette better.