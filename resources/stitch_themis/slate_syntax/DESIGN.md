---
version: alpha
name: Slate Syntax Light
description: 'Themis daylight system: an operational notebook for developer-first project context, durable decisions, task definition, and human/AI-readable execution state.'
colors:
  surface: '#faf8ff'
  surface-dim: '#cdd9ff'
  surface-bright: '#ffffff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e7ff'
  surface-container-highest: '#d9e2ff'
  on-surface: '#213156'
  on-surface-variant: '#4e5e86'
  inverse-surface: '#060e20'
  inverse-on-surface: '#959cb5'
  outline: '#6a7aa3'
  outline-variant: '#a1b1dd'
  surface-tint: '#385ca9'
  primary: '#385ca9'
  on-primary: '#f9f8ff'
  primary-container: '#a8c0ff'
  on-primary-container: '#063884'
  inverse-primary: '#8aacff'
  secondary: '#3d6758'
  on-secondary: '#e4fff2'
  secondary-container: '#cdfbe8'
  on-secondary-container: '#386253'
  tertiary: '#006d4e'
  on-tertiary: '#e5fff0'
  tertiary-container: '#8dfece'
  on-tertiary-container: '#006146'
  error: '#ac3434'
  on-error: '#fff7f6'
  error-container: '#f56965'
  on-error-container: '#65000b'
  primary-fixed: '#a8c0ff'
  primary-fixed-dim: '#92b2ff'
  on-primary-fixed: '#00245d'
  on-primary-fixed-variant: '#17428e'
  secondary-fixed: '#cdfbe8'
  secondary-fixed-dim: '#bfecd9'
  on-secondary-fixed: '#264f42'
  on-secondary-fixed-variant: '#436c5d'
  tertiary-fixed: '#8dfece'
  tertiary-fixed-dim: '#7fefc0'
  on-tertiary-fixed: '#004d36'
  on-tertiary-fixed-variant: '#006d4e'
  primary-dim: '#2a509c'
  secondary-dim: '#315b4d'
  tertiary-dim: '#005f44'
  error-dim: '#70030f'
  background: '#faf8ff'
  on-background: '#213156'
  surface-variant: '#d9e2ff'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 3.5rem
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: '-0.02em'
  headline-sm:
    fontFamily: Manrope
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: '1.3'
  body-md:
    fontFamily: Manrope
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Manrope
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: '0.05em'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: '2'
  unit: 0.5rem
  gutter: 1rem
  margin: 1.5rem
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    typography: '{typography.body-md}'
    rounded: '{rounded.DEFAULT}'
    padding: 0.75rem
  button-primary-hover:
    backgroundColor: '{colors.primary-container}'
    textColor: '{colors.on-primary-container}'
    typography: '{typography.body-md}'
    rounded: '{rounded.DEFAULT}'
    padding: 0.75rem
  button-secondary:
    backgroundColor: '{colors.surface-container-lowest}'
    textColor: '{colors.primary}'
    typography: '{typography.body-md}'
    rounded: '{rounded.DEFAULT}'
    padding: 0.75rem
  card:
    backgroundColor: '{colors.surface-container-lowest}'
    textColor: '{colors.on-surface}'
    rounded: '{rounded.DEFAULT}'
    padding: 1rem
  input:
    backgroundColor: '{colors.surface-container-lowest}'
    textColor: '{colors.on-surface}'
    typography: '{typography.body-md}'
    rounded: '{rounded.DEFAULT}'
    padding: 0.75rem
  data-tag:
    backgroundColor: '{colors.surface-container-highest}'
    textColor: '{colors.on-surface-variant}'
    typography: '{typography.label-sm}'
    rounded: '{rounded.sm}'
    padding: 0.5rem
---

## Overview

### Creative North Star: "The Operational Notebook in Daylight"

Themis is a developer-first task and project system for reducing cognitive load in engineering work. It behaves less like a generic project-management dashboard and more like a structured operational database: projects, context, documents, decisions, task scope, progress, and agent activity become durable objects that humans and code agents can read from the same source of truth.

Slate Syntax Light expresses that product philosophy as a calm daylight work surface. It should feel like a technical manuscript opened on a bright desk: structured enough to support scope, decisions, and execution state, but quiet enough that updates take seconds instead of demanding attention.

**Core Principles:**

- **Definition before execution:** Screens should make scope, requirements, decisions, and next steps legible before asking the user to act.
- **Structured context over free-form chaos:** Prefer fields, status, metadata, and markdown-backed narrative over chat-like streams.
- **Human and AI-readable by design:** Agent work, project context, and task state should be visible, reviewable, and mechanically parseable.
- **Low mental overhead:** Visual hierarchy should help thinking rather than advertise activity.

## Colors

The light palette is a luminous slate-blue paper system. It keeps Themis calm and exact while giving operational signals enough contrast to be scanned quickly.

### The "No-Line" Rule

Avoid full-opacity 1px section borders. Boundaries should come from:

1. **Background Shifts:** Move between `surface`, `surface-container-low`, and `surface-container-lowest` to separate project context, task state, documents, and decision logs.
2. **Negative Space:** Use deliberate whitespace for grouping instead of visual cages.
3. **Typed Signals:** Use labels, status chips, and small accents for state changes rather than decorative chrome.

### Surface Hierarchy & Nesting

Treat the UI as a stack of durable records:

- **Base Layer:** `surface` (#faf8ff) for the page canvas.
- **Primary Workspaces:** `surface-container-lowest` (#ffffff) for task detail, project documents, and editable forms.
- **Structural Sections:** `surface-container-low` (#f2f3ff) for navigation, project lists, context summaries, and setup surfaces.
- **Floating Elements:** `surface-container-high` / `surface-container-highest` for command palettes, popovers, and agent/status overlays.

### Operational Accents

- `primary` is for intentional user actions, selected navigation, active project context, and focus.
- `tertiary` is for live, success, accepted, or agent-completed states.
- `error` is reserved for blockers, failed jobs, invalid configuration, or broken setup state.

## Typography

Use **Manrope** exclusively across the product and public site. Themis should speak with one precise voice whether it is explaining the product, showing a project context snapshot, or rendering a task execution log.

- **Display:** Use `display-lg` for product-level statements, project names, or major empty states.
- **Headlines:** Use `headline-sm` for section titles such as Projects, Decisions, Documents, Scope, and Next Step.
- **Body:** `body-md` is the default for descriptions, task summaries, setup instructions, and markdown previews.
- **Labels:** `label-sm` is for metadata, environment keys, status labels, timestamps, and agent/source badges.

## Layout

Themis is project-first and context-first. Favor editorial reading flow over KPI grids.

- Put project identity first, then current understanding, then durable documentation and decisions.
- Use one strong context snippet or next step instead of many equal-weight metrics.
- Keep setup and activation screens copy-and-paste friendly; code/config blocks are first-class surfaces.
- Let side metadata stay secondary to the document or task body.

## Elevation & Depth

Depth comes from **Tonal Stacking**, not decorative shadows. Place foreground records on `surface-container-lowest`, group related context on `surface-container-low`, and reserve higher containers for transient utilities.

### Ambient Shadows

Use shadows only when a surface must float above operational data. Keep them soft and tinted: `on-surface` at 4%–8% opacity with a 32px blur.

### The "Ghost Border" Fallback

Use `outline-variant` at 15%–20% opacity only for accessibility, inputs, focus states, or table-like density where tonal separation is not enough.

## Shapes

The interface should feel architectural and exact:

- `DEFAULT` (0.25rem) for buttons, cards, inputs, documents, and panels.
- `sm` (0.125rem) for tags, status markers, and compact data badges.
- `full` only for avatars, pills, or controls that semantically need a capsule.

## Components

### Buttons

- **Primary:** Used for task creation, API key creation, save/continue, and other irreversible progress actions. Prefer `primary` with `on-primary`; optional restrained gradient to `primary-container` is allowed for public-site CTAs.
- **Secondary:** Ghost or tonal button for navigation and low-risk choices. Use `primary` text and a ghost border.
- **Tertiary:** Text-only for low-priority navigation and dismissals.

### Cards, Lists & Records

- **Project Cards:** Should read like durable records, not promotional cards. Include project name, summary, state, last update, and one next-step/context signal.
- **Task Detail:** Scope, acceptance criteria, blockers, decisions, and execution log must be visually distinct but not overboxed.
- **Documents:** Markdown-backed content should feel native: readable width, strong typographic rhythm, and quiet side metadata.

### Input Fields & Setup Blocks

- Inputs default to `surface-container-lowest` with subtle ghost borders.
- Focus uses `primary` plus a 2px outer glow at 10% opacity.
- Code/config blocks should use tonal surfaces and monospace only for actual code, commands, keys, or protocol text.

### Data Tags

Use `surface-container-highest`, `label-sm`, and `sm` radius. Tags communicate state, source, environment, priority, or agent provenance; they should never become decorative confetti.

## Do's and Don'ts

### Do:

- **Do** optimize for clarity, continuity, and low mental overhead.
- **Do** make scope, decisions, blockers, and next steps easy to scan.
- **Do** show agent activity as structured operational state that humans can review.
- **Do** use tonal hierarchy before borders or shadows.
- **Do** keep public-site messaging aligned with integrated AI agents and developers sharing one operational surface.

### Don't:

- **Don't** make Themis feel like a noisy enterprise dashboard or startup analytics tool.
- **Don't** use celebratory onboarding energy for activation; it should feel like infrastructure setup.
- **Don't** hide requirements or rationale in unstructured visual blobs.
- **Don't** add decorative icons or metric grids without operational value.
- **Don't** mix Inter back into the system; Manrope is the shared voice across light and dark.

_Director's Final Note: Themis succeeds when a project, task, or decision feels like a reliable operational object. If a screen asks for attention without improving clarity, reduce it._
