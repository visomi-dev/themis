# Design System Guidance

These instructions apply to Tailwind, visual design, UI polish, accessibility, and Themis design-token work.

## Tailwind And CSS

- Tailwind is the primary styling tool. Use utility classes directly in templates.
- Never use raw CSS variables for colors or design tokens in component code. Define reusable tokens inside `@theme` blocks in global styles.
- Use `@utility` to define custom utilities.
- Dark mode uses the configured `dark` variant: `@custom-variant dark (&:where(.dark, .dark *))`.
- Global CSS imports should be ordered as fonts first, then Tailwind, then icon libraries.
- Component CSS is for keyframes, element-level styles that cannot be expressed as Tailwind utilities, and `@starting-style` transitions.

## Core Tokens

- Display and headlines use Manrope through `--font-family-display`.
- Body text uses Inter through `--font-family`.
- Monospace text uses JetBrains Mono through `--font-family-mono`.
- Preserve the surface hierarchy: `surface`, `surface-container-low`, `surface-container`, `surface-container-high`, `surface-container-highest`.
- Avoid solid 1px borders for sectioning; use tonal shifts.
- Use ghost borders with `outline-variant` at low opacity for inputs.
- Default card radius is `0.25rem`; small element radius is `0.125rem`.

## Mobile-First Layout

- Always provide mobile-first spacing and increase at `md:` or `lg:`.
- Section padding should usually start at `px-4 py-8` and scale to `md:px-12 md:py-16`.
- Card padding should usually start at `p-4` and scale to `md:p-6` or `md:p-8`.
- Grid gaps should usually start at `gap-4` and scale to `md:gap-6` or `lg:gap-8`.
- Hero titles should usually start around `text-4xl` and scale to `md:text-6xl` or `lg:text-8xl`.
- Button groups should stack on mobile and use `sm:flex-row` when horizontal layout is appropriate.
- CTAs should usually be full-width on mobile with `w-full sm:w-auto`.

## Accessibility

- UI work must follow WCAG AA minimums for focus management, color contrast, and ARIA usage.
- Use semantic HTML5 elements.
- Use accessible labels and visible focus states.
- Use `NgOptimizedImage` for static images, except base64 images.
- Changes intended to improve accessibility should pass AXE checks when feasible.

## Visual Quality

- Preserve the existing Themis visual language and avoid generic interchangeable layouts.
- For frontend design tasks, create distinctive production-grade interfaces while staying within the design tokens.
- Do not add broad design-system abstractions unless repeated usage proves they are needed.
