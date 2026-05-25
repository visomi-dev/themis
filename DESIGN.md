---
name: Themis Light
colors:
  surface: '#faf8ff'
  surface-dim: '#dbd9e0'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3fa'
  surface-container: '#efedf4'
  surface-container-high: '#e9e7ee'
  surface-container-highest: '#e3e1e8'
  on-surface: '#1a1b20'
  on-surface-variant: '#434651'
  inverse-surface: '#2f3035'
  inverse-on-surface: '#f2f0f7'
  outline: '#747782'
  outline-variant: '#c4c6d3'
  surface-tint: '#385ca9'
  primary: '#1b4490'
  on-primary: '#ffffff'
  primary-container: '#385ca9'
  on-primary-container: '#ccd9ff'
  inverse-primary: '#b0c6ff'
  secondary: '#535f70'
  on-secondary: '#ffffff'
  secondary-container: '#d7e3f8'
  on-secondary-container: '#596576'
  tertiary: '#633b49'
  on-tertiary: '#ffffff'
  tertiary-container: '#7d5260'
  on-tertiary-container: '#ffcbda'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d9e2ff'
  primary-fixed-dim: '#b0c6ff'
  on-primary-fixed: '#001945'
  on-primary-fixed-variant: '#1a438f'
  secondary-fixed: '#d7e3f8'
  secondary-fixed-dim: '#bbc7db'
  on-secondary-fixed: '#101c2b'
  on-secondary-fixed-variant: '#3c4858'
  tertiary-fixed: '#ffd9e3'
  tertiary-fixed-dim: '#eeb8c8'
  on-tertiary-fixed: '#31111d'
  on-tertiary-fixed-variant: '#633b48'
  background: '#faf8ff'
  on-background: '#1a1b20'
  surface-variant: '#e3e1e8'
typography:
  headline-xl:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  container-max: 1440px
---

## Brand & Style

The design system is an exercise in **Precision Minimalism** and **Technical Sophistication**. It is designed for high-density information environments—research, engineering, and data-driven operations—where clarity is the primary utility.

The aesthetic is inspired by the "structured clinical notebook": a refined, tactile digital surface that prioritizes quiet control over visual noise. By utilizing a high-clarity light base, the UI evokes a sense of professional transparency and alertness. The target audience consists of professionals who require deep focus and low cognitive load during intensive sessions. The design style avoids heavy shadows and aggressive borders, relying instead on high-precision typography and subtle tonal shifts to delineate information architecture in a clean, brightly-lit environment.

## Colors

This color palette transitions from clean, high-energy foundations to precise technical highlights. The primary **Technical Blue (#385ca9)** acts as the anchor for all interactive elements, providing a clear visual signal against the light operational surfaces.

Optimized for light mode, this system uses a neutral, cool-toned base to maintain a fresh and open feel. Depth is created through **tonal stacking**: as elements rise in the hierarchy (modals, popovers, active panes), they become subtly darker or use more pronounced container tints to indicate proximity to the user.

- **Primary:** Reliable, clear-view technical blue.
- **Secondary:** Muted slate for utility and supporting metadata.
- **Neutral:** A range of crisp whites and light greys derived from the base to maintain a unified temperature.

## Typography

The typography system uses a tri-font strategy to separate intent, ensuring high legibility against light backgrounds.

1. **Manrope (Headlines):** Used for structural navigation and page titles. Its modern, geometric curves provide a humanistic touch to an otherwise technical layout.
2. **Inter (Body):** The workhorse for all prose, data entries, and descriptions. Chosen for its exceptional legibility and neutral character.
3. **JetBrains Mono (Labels/Technical):** Reserved for machine-readable content, status tags, timestamps, and code snippets. This font reinforces the "structured notebook" aesthetic.

Hierarchy is maintained through consistent weight application: bold headers, regular body text, and medium-weight monospaced labels.

## Layout & Spacing

The design system utilizes a **Fixed-Fluid Hybrid Grid** built on an 8px base unit.

- **Desktop:** A 12-column grid with a maximum container width of 1440px. Content is centered with generous 48px margins to provide visual "breathing room."
- **Tablet:** Transitions to an 8-column grid with 24px gutters.
- **Mobile:** A 4-column fluid grid with 16px margins.

Spacing should favor a "loose-internal, tight-external" philosophy: elements within a logical group (like a header and its sub-label) are kept close, while the groups themselves are separated by significant whitespace to prevent visual clutter.

## Elevation & Depth

In this light-mode design system, depth is communicated through **Tonal Layering** and **Micro-Borders** rather than traditional drop shadows.

The base background is the brightest surface. As components "rise" toward the user (such as cards, modals, or menus), they gain a progressively darker surface tint or subtle grey container background. This "tonal-as-height" model ensures clear separation in high-density layouts.

To maintain the "quiet control" aesthetic, use 1px hair-line borders in a color only slightly darker than the surface they sit on. This provides just enough definition to separate containers without the heavy-handedness of traditional drop shadows.

## Shapes

The shape language is consistently **Rounded (0.5rem base)**. This soft geometry balances the technicality of the monospaced labels and the inherent sharpness of clean, light-mode interfaces.

- **Standard Elements (Buttons, Inputs, Cards):** 0.5rem (8px).
- **Larger Containers (Modals, Sidebars):** 1rem (16px).
- **Small Utilities (Tags, Badges):** 0.25rem (4px).

This moderate rounding ensures the interface feels contemporary and approachable while remaining structured enough for professional applications.

## Components

- **Buttons:** Primary buttons use the Technical Blue (#385ca9) with white high-contrast text. Secondary buttons are ghost-style with a subtle tonal background and primary-colored text.
- **Input Fields:** Fields are styled as "inset" containers using a slightly deeper surface tint with a 1px bottom border that transitions to the primary blue on focus.
- **Cards:** Cards should not have shadows. Use a tonal shift to the next darker container level or a 1px subtle border to define the card boundary.
- **Chips/Status:** Always use JetBrains Mono for text within chips. Use muted, de-saturated background tints to keep the UI calm.
- **Lists:** Use 1px dividers only when data density is extremely high; otherwise, use vertical spacing to separate list items.
- **Navigation:** The sidebar should utilize a subtle neutral tint to provide a clear structural anchor for the user’s journey, differentiating it from the main white workspace.
