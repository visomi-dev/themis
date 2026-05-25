---
name: Themis Dark
colors:
  surface: '#0c1325'
  surface-dim: '#0c1325'
  surface-bright: '#33384c'
  surface-container-lowest: '#070d1f'
  surface-container-low: '#151b2d'
  surface-container: '#191f32'
  surface-container-high: '#23293d'
  surface-container-highest: '#2e3448'
  on-surface: '#dce1fb'
  on-surface-variant: '#bfc8cf'
  inverse-surface: '#dce1fb'
  inverse-on-surface: '#2a3043'
  outline: '#899299'
  outline-variant: '#3f484e'
  surface-tint: '#7cd0ff'
  primary: '#c3e7ff'
  on-primary: '#00344a'
  primary-container: '#7bd0ff'
  on-primary-container: '#005979'
  inverse-primary: '#00668a'
  secondary: '#9ad1c6'
  on-secondary: '#003731'
  secondary-container: '#185249'
  on-secondary-container: '#8cc3b8'
  tertiary: '#ffdad7'
  on-tertiary: '#611213'
  tertiary-container: '#ffb3ae'
  on-tertiary-container: '#8f3432'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c4e7ff'
  primary-fixed-dim: '#7cd0ff'
  on-primary-fixed: '#001e2c'
  on-primary-fixed-variant: '#004c69'
  secondary-fixed: '#b5eee2'
  secondary-fixed-dim: '#9ad1c6'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#154f47'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ae'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#7f2927'
  background: '#0c1325'
  on-background: '#dce1fb'
  surface-variant: '#2e3448'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 62px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 30px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.06em
  code-md:
    fontFamily: jetbrainsMono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  2xl: 3rem
  3xl: 4rem
  content-max: 72rem
---

## Brand & Style

This design system is a developer-native operational notebook designed for structured clarity and cognitive ease. It moves away from the high-energy, saturated aesthetics of modern SaaS and instead embraces the "Technical Manuscript" style—a digital equivalent of a high-quality engineering ledger.

The brand personality is calm, precise, and durable. It prioritizes the preservation of context over visual theater. The interface should feel like a low-glare, high-utility tool that serves both human software engineers and AI agents with equal respect for structure.

The aesthetic is characterized by **Minimalism** blended with **Modern Corporate** precision. It utilizes heavy whitespace to separate concerns, avoids decorative elements, and relies on a sophisticated "tonal stacking" model rather than physical metaphors like shadows or skeuomorphism.

## Colors

The color palette is optimized for long-duration technical work, featuring a primary dark mode that minimizes eye strain while maintaining structural hierarchy.

The palette is built on a "low-glare blue" foundation. The **Primary** color serves as the core action and focus indicator. We use a tonal stacking approach where depth is defined by shifting the darkness of the slate-blue background rather than using pure black or gray.

- **Primary:** Used for focus states, primary buttons, and active project markers.
- **Surface Stack:** The canvas moves from `surface-lowest` (background/void) through increasing lightness to `surface-highest` (transient popovers/modals).
- **Outlines:** Borders are used sparingly as "ghost lines" (low opacity) to define dense data boundaries without creating visual noise.

## Typography

Typography is used to establish systemic authority. We use **Manrope** for headlines to provide a modern, geometric technical voice, while **Inter** ensures maximum readability for dense body text and operational logs.

- **Scale:** Headlines should be impactful but never "loud."
- **Measure:** Limit body text width to a maximum of 72 characters to preserve reading comfort in long-form documents.
- **Monospace:** **JetBrains Mono** is reserved exclusively for machine-readable content like code snippets, environment variables, and system logs. It must not be used as a decorative element.
- **Labels:** Use uppercase for labels (e.g., status, priority) to differentiate metadata from conversational content.

## Layout & Spacing

This design system uses a **fixed-fluid hybrid** model. While the overall app frame fills the screen, content is centered within a maximum width of 72rem (1152px) to maintain editorial focus.

- **Rhythm:** An 8px (0.5rem) base unit defines the rhythm.
- **Grid:** On desktop, a 12-column grid is used for layout, while mobile shifts to a single column with consistent 1rem side margins.
- **Reflow:** Layouts should prioritize vertical reading flow. Avoid complex multi-panel sidebars that create competing focal points; instead, use tonal stacking to tuck secondary metadata into side rails that only appear when necessary.

## Elevation & Depth

Depth is achieved strictly through **Tonal Layers**. Shadows are almost entirely absent to maintain the "flat manuscript" feel.

- **Level 0 (Canvas):** `surface-lowest` is the dark void of the application.
- **Level 1 (Containers):** `surface-low` defines the primary background for navigation and static panels.
- **Level 2 (Workspaces):** `surface-container` is used for the active area where the user is typing or reading (e.g., the document body).
- **Level 3 (Interactive):** `surface-high` and `surface-highest` are used for transient elements like hover states, tooltips, and floating command palettes.

Instead of shadows, use a `1px` border of `outline-variant` at 20% opacity to provide subtle definition between surfaces of similar tones if required.

## Shapes

The shape language is architectural. Elements are predominantly rectangular with a very slight softening to prevent a harsh, "legacy terminal" feel.

- **Standard Softness:** Use `rounded-md` (0.25rem) for most layout containers, cards, and data records.
- **Interaction Targets:** Buttons and inputs use `rounded-lg` (0.5rem) to provide a clearer visual affordance for clicking.
- **System Tags:** Use `rounded-sm` (0.125rem) for operational status tags.

## Components

### Buttons

Primary buttons use the `dark-primary` background with `dark-on-primary` text. They should only be used for major state-changing actions. Secondary buttons should use `surface-high` as a background to maintain the tonal stacking theme.

### Cards & Records

Cards are not treated as floating objects. They are recessed areas (`surface-container`) that hold information. Borders are avoided in favor of tonal separation.

### Inputs

Input fields should appear as recessed "wells." Use `surface-lowest` for the field background within a `surface-container` parent. Focus states are indicated by a high-contrast `dark-primary` focus ring.

### Data Tags

Tags are used for status and metadata. They use a subtle background (`surface-highest`) and monochromatic text to keep them from becoming visual distractions. Only use color (Error/Tertiary) when an immediate action or status change is critical.

### Code Blocks

Code blocks use `surface-low` as a background and require a "Copy" utility that is visible but understated. The font must be JetBrains Mono.
