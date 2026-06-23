---
version: alpha
name: Slate Syntax Dark
description: 'Themis night system: a low-glare operational notebook for developer-first project context, durable decisions, task definition, and human/AI-readable execution state.'
colors:
  surface: '#080e1b'
  surface-dim: '#080e1b'
  surface-bright: '#1d2c49'
  surface-container-lowest: '#000000'
  surface-container-low: '#0b1323'
  surface-container: '#10192c'
  surface-container-high: '#141f35'
  surface-container-highest: '#19253f'
  on-surface: '#dde5ff'
  on-surface-variant: '#9eabcb'
  inverse-surface: '#f9f9ff'
  inverse-on-surface: '#4f5565'
  outline: '#697593'
  outline-variant: '#3c4863'
  surface-tint: '#bdceff'
  primary: '#bdceff'
  on-primary: '#2d4477'
  primary-container: '#aac0fb'
  on-primary-container: '#233b6d'
  inverse-primary: '#485e92'
  secondary: '#b3ccc1'
  on-secondary: '#2e453c'
  secondary-container: '#132a22'
  on-secondary-container: '#90a99e'
  tertiary: '#daffeb'
  on-tertiary: '#006b4d'
  tertiary-container: '#8cfecf'
  on-tertiary-container: '#006146'
  error: '#ff716c'
  on-error: '#490006'
  error-container: '#8a1a1e'
  on-error-container: '#ff9993'
  primary-fixed: '#aac0fb'
  primary-fixed-dim: '#9cb2ec'
  on-primary-fixed: '#092557'
  on-primary-fixed-variant: '#2d4476'
  secondary-fixed: '#dcf7ea'
  secondary-fixed-dim: '#cee8dc'
  on-secondary-fixed: '#364d44'
  on-secondary-fixed-variant: '#526960'
  tertiary-fixed: '#8cfecf'
  tertiary-fixed-dim: '#7eefc2'
  on-tertiary-fixed: '#004d37'
  on-tertiary-fixed-variant: '#006d4f'
  primary-dim: '#9cb2ec'
  secondary-dim: '#a5beb3'
  tertiary-dim: '#7eefc2'
  error-dim: '#c94947'
  background: '#080e1b'
  on-background: '#dde5ff'
  surface-variant: '#19253f'
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
    backgroundColor: '{colors.surface-container-low}'
    textColor: '{colors.primary}'
    typography: '{typography.body-md}'
    rounded: '{rounded.DEFAULT}'
    padding: 0.75rem
  card:
    backgroundColor: '{colors.surface-container-low}'
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

### Creative North Star: "The Operational Notebook at Night"

Themis is a developer-first task and project system for reducing cognitive load in engineering work. It behaves less like a generic project-management dashboard and more like a structured operational database: projects, context, documents, decisions, task scope, progress, and agent activity become durable objects that humans and code agents can read from the same source of truth.

Slate Syntax Dark expresses that philosophy as a low-glare technical manuscript. It is built for long-form focus, setup work, project context review, and execution tracking when the user needs quiet control instead of dashboard noise.

**Core Principles:**

- **Definition before execution:** Scope, requirements, decisions, and next steps must be legible before action.
- **Structured context over free-form chaos:** Use fields, status, metadata, and markdown-backed narrative rather than chat-like streams.
- **Human and AI-readable by design:** Agent work should become visible, structured, and reviewable operational state.
- **Low mental overhead:** The interface should help thinking without asking to be admired.

## Colors

The dark palette is a stack of deep architectural slates with muted blue and green operational signals. It is optimized for developer-native environments, long reading sessions, and dense context surfaces.

### The "No-Line" Rule

Standard 1px solid borders are prohibited for sectioning. Boundaries come from:

1. **Background Shifts:** Transition from `surface` to `surface-container-low`, or nest `surface-container-lowest` inside `surface-container-low` for recessed work areas.
2. **Negative Space:** Use spacing as the primary separator between project objects and task records.
3. **Typed Signals:** Use labels, status chips, and small accents to expose progress and agent state.

### Surface Hierarchy & Nesting

Treat the UI as a series of low-glare operational layers:

- **Base Layer:** `surface` (#080e1b) for the global background.
- **Structural Sections:** `surface-container-low` (#0b1323) for navigation, project lists, and setup shells.
- **Active Workspaces:** `surface-container` (#10192c) for project detail, task detail, and document readers.
- **Floating Elements:** `surface-container-high` / `surface-container-highest` for command palettes, popovers, and agent/status overlays.

### Operational Accents

- `primary` is for intentional user actions, selected navigation, active context, and focus.
- `tertiary` is for live, success, accepted, or agent-completed states.
- `error` is reserved for blockers, failed jobs, invalid configuration, or broken setup state.

## Typography

Use **Manrope** exclusively. Its geometric clarity keeps both marketing copy and dense operational UI in the same voice.

- **Display:** Use `display-lg` for product-level statements, project names, or major empty states.
- **Headlines:** Use `headline-sm` for sections such as Projects, Decisions, Documents, Scope, and Next Step.
- **Body:** `body-md` is the default for descriptions, task summaries, setup instructions, and markdown previews.
- **Labels:** `label-sm` is for metadata, environment keys, status labels, timestamps, and agent/source badges.

## Layout

Themis is project-first and context-first. Favor editorial reading flow over KPI grids.

- Put project identity first, then current understanding, then durable documentation and decisions.
- Use one strong context snippet or next step instead of many equal-weight metrics.
- Keep setup and activation screens copy-and-paste friendly; code/config blocks are first-class surfaces.
- Let side metadata stay secondary to the document or task body.

## Elevation & Depth

Depth is achieved through **Tonal Stacking**. Place active workspaces on `surface-container`, nest dense or editable records on `surface-container-lowest`, and reserve higher containers for transient utility surfaces.

### Ambient Shadows

When a surface must float, use a tinted shadow from black at roughly 40% opacity with a 32px blur and -4px spread. Prefer occlusion over visible drop-shadow styling.

### The "Ghost Border" Fallback

If a separator is required for accessibility, use `outline-variant` at 15%–20% opacity. This creates a hairline suggestion without visual cages.

## Shapes

The interface should feel architectural and exact:

- `DEFAULT` (0.25rem) for buttons, cards, inputs, documents, and panels.
- `sm` (0.125rem) for tags, status markers, and compact data badges.
- `full` only for avatars, pills, or controls that semantically need a capsule.

## Components

### Buttons

- **Primary:** Used for task creation, API key creation, save/continue, and other irreversible progress actions. Use `primary` with `on-primary`; optional restrained gradient to `primary-container` is allowed for public-site CTAs.
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
- **Do** keep dark mode low-glare; never use pure white for body text.

### Don't:

- **Don't** make Themis feel like a noisy enterprise dashboard or startup analytics tool.
- **Don't** use celebratory onboarding energy for activation; it should feel like infrastructure setup.
- **Don't** hide requirements or rationale in unstructured visual blobs.
- **Don't** add decorative icons or metric grids without operational value.
- **Don't** use standard shadows when a surface shift will communicate depth more quietly.

_Director's Final Note: Themis succeeds when a project, task, or decision feels like a reliable operational object. If a screen asks for attention without improving clarity, reduce it._
