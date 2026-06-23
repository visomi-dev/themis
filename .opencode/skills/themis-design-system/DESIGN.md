# Themis Design System

Themis is a structured operational surface for defining, documenting, updating, and executing technical work. Source evidence from `/home/visomi/Projects/GitHub/visomi-dev/themis` shows an Nx monorepo with an Astro marketing site, Angular application, Express API, BullMQ worker, Socket.IO realtime runtime, and a gateway server. The product model is a developer-first task ledger: projects, tasks, documents, decisions, seed jobs, execution history, and agent-readable context live together so humans and code agents can share durable state.

The system should feel like a technical manuscript rather than a generic SaaS dashboard: calm, exact, low-glare, and structured. Use tonal surface hierarchy, quiet controls, compact status metadata, and typography-led layouts. The UI must make agent activity reviewable without turning the product into chat-first noise.

## Source Evidence

- `context/source-context.md` defines the design-system project boundary and required package outputs.
- `context/local-code/themis.md` records the local evidence intake and copied source snapshots.
- `context/local-code/themis/files/styles.base.css` is the shared token source for light and dark themes.
- `context/local-code/themis/files/DESIGN.md` and `context/local-code/themis/files/DESIGN_DARK.md` provide source design rules.
- `source_examples/` preserves high-signal Angular templates and source files for sidebar, logo, projects, project detail, and sign-in surfaces.
- `assets/` and `build/` preserve real Themis marks and screenshot evidence.

## Product Context

Themis supports software engineers, technical leads, engineering managers, solo builders, product-minded collaborators, and AI/code agents. Primary surfaces include:

- Public landing site explaining AI-integrated technical execution.
- Authentication and activation flows with language/theme controls.
- Project dashboard and project registry.
- Project detail surface with project seed actions, status metadata, documents, and progress.
- Navigation shell with collapsible desktop sidebar, mobile overlay, user menu, and theme toggle.

Core capabilities evidenced by source files:

- Create and inspect projects.
- Preserve summaries, documents, sources, status, created dates, and seed job progress.
- Structure work so humans and agents can understand state without reconstructing context from chat.
- Support light and dark modes from the same token vocabulary.

## Visual Foundations

Themis is calm technical minimalism. The mood is precise, durable, and operational. Avoid decorative dashboards, playful illustration systems, and overloaded card grids. Depth is created by tonal stacking rather than heavy elevation.

Principles:

- One clear focal surface per screen.
- Use surface shifts before borders; use ghost borders only when density demands separation.
- Keep action color deliberate: primary blue/cyan for primary actions, focus, and active navigation.
- Use tertiary/success/error only for meaningful status.
- Prefer structured rows, panels, side rails, and document wells over floating cards.
- Use machine-readable labels and timestamps sparingly, with mono typography.

## Color

Use `colors_and_type.css` as the reusable token file. Do not invent tokens outside this palette unless a future source update adds them.

### Light: Slate & Syntax

- Canvas: `--color-background: #faf8ff`.
- Base surface: `--color-surface: #faf8ff`.
- Raised/contained surfaces: `--color-surface-container-lowest: #ffffff`, `--color-surface-container-low: #f4f3fa`, `--color-surface-container: #efedf4`, `--color-surface-container-high: #e9e7ee`, `--color-surface-container-highest: #e3e1e8`.
- Primary action: `--color-primary: #1b4490`.
- Product anchor/focus container: `--color-primary-container: #385ca9`.
- Text: `--color-on-surface: #1a1b20`, `--color-on-surface-variant: #434651`.
- Borders/ghost lines: `--color-outline: #747782`, `--color-outline-variant: #c4c6d3`.
- Error: `--color-error: #ba1a1a`.
- Success: `--color-success: #1b6e3a`.

### Dark: Slate & Syntax Night Edition

- Canvas: `--color-background: #0c1325`.
- Deep base: `--color-surface-container-lowest: #070d1f`.
- Workspace surfaces: `--color-surface-container-low: #151b2d`, `--color-surface-container: #191f32`, `--color-surface-container-high: #23293d`, `--color-surface-container-highest: #2e3448`.
- Primary action: `--color-primary: #c3e7ff`.
- Cyan focus/product container: `--color-primary-container: #7bd0ff`.
- Text: `--color-on-surface: #dce1fb`, `--color-on-surface-variant: #bfc8cf`.
- Borders/ghost lines: `--color-outline: #899299`, `--color-outline-variant: #3f484e`.
- Error: `--color-error: #ffb4ab`.
- Success: `--color-success: #81c784`.

### Usage Rules

- Use `background`/`surface` for full page canvases.
- Use the surface container ladder to communicate hierarchy: base canvas, nav rail, content well, action panel, transient popover.
- Primary appears on buttons, active navigation, focus rings, progress, and important agent signals.
- Tertiary and success indicate domain state, not decoration.
- Error must only signal failures, destructive actions, or blockers.

## Typography

The source uses a tri-font strategy:

- Display/headings: `Manrope`, fallback `Inter`, system sans.
- Body/UI: `Inter`, system sans.
- Mono/technical labels: `JetBrains Mono`, `SFMono-Regular`, monospace.

Type scale:

- Display large: 56px / 62px, Manrope 700, `-0.02em`.
- Headline XL: 40px / 48px, Manrope 700, `-0.02em`.
- Headline LG: 32px / 40px, Manrope 600-700, `-0.01em`.
- Headline MD: 24px / 32px, Manrope 600.
- Body LG: 18px / 28-30px, Inter 400.
- Body MD: 16px / 24-26px, Inter 400.
- Body SM: 14px / 20-22px, Inter 400.
- Label MD: 12-13px / 12-16px, JetBrains Mono or Inter 700, uppercase/tracked for metadata.

Rules:

- Use Manrope for page titles, section headings, product marks, and large editorial statements.
- Use Inter for dense rows, form text, navigation, and descriptions.
- Use JetBrains Mono for task IDs, agent IDs, technical labels, timestamps, code, and machine-readable metadata only.
- Keep body measure under 72 characters for long descriptions.

## Spacing, Radius, And Elevation

Spacing is 8px-based and mobile-first.

- Base unit: 8px.
- Mobile margins: 16px.
- Tablet gutters: 24px.
- Desktop page margin: 48px.
- Container max: 1440px for broad app/landing layouts, 1152px for focused manuscript content.
- Section padding: mobile `32px`, desktop `64px`.
- Card/panel padding: mobile `16px`, desktop `24-32px`.

Radius:

- Small tags: `0.25rem` or `0.125rem` in the darker manuscript style.
- Buttons/inputs: `0.5rem`.
- Panels/modals: `0.75rem` to `1rem`.
- Avoid large pill shapes except avatars, counters, and compact badges.

Elevation:

- Default to no shadow.
- Use tonal surface shifts for hierarchy.
- Use `--shadow-panel` only for overlay panels, active nav selections, auth panels, and mobile drawers where separation is necessary.
- Ghost borders should be `outline-variant` at low opacity.

## Layout And Composition

The product is project-first and mobile-first.

- App shell: collapsible left navigation on desktop, mobile overlay drawer, topbar, scrollable main content.
- Project views: max-width content column with header, status metadata, action panel, and document rows.
- Lists: use rows with column headers on desktop; collapse into stacked metadata on mobile.
- Auth: split layout on large screens with brand/positioning copy on the left and a contained form panel on the right.
- Landing: large Manrope hero, product screenshot/panel, value sections, technical task cards, and restrained CTA rhythm.
- Avoid designer controls, viewport toggles, style knobs, or design-process cards inside product UIs.

Responsive contracts:

- Mobile starts as a single column with `16px` margins and full-width CTAs.
- Tablet can introduce two-column content only when hierarchy remains clear.
- Desktop can use side rails, 12-column grid, and fixed/fluid max widths.
- Never squeeze dense desktop tables onto mobile; reflow row metadata vertically.

## Components

### Buttons

- Primary: `background: var(--color-primary)`, `color: var(--color-on-primary)`, `radius: 0.5rem`, font weight 700.
- Secondary: transparent or tonal surface with `outline`/`outline-variant` ghost border.
- Text buttons: primary color, semibold, underline only on hover where links are expected.
- Disabled states reduce opacity and should not rely only on color.

### Inputs And Forms

- Inputs are recessed wells: transparent or tonal background, quiet bottom/ghost border, focus ring in primary.
- Labels are Inter semibold, 14px.
- Help and error copy lives below fields using `on-surface-variant` or error tokens.
- Auth forms use explicit labels, stable button names, and accessible autocomplete attributes.

### Navigation

- Sidebar uses `surface-container` or `surface-container-lowest` depending on mode and breakpoint.
- Active nav may use tonal surface, subtle shadow, and primary left border.
- Section labels are uppercase, tracked, low contrast.
- Mobile nav is a full-height overlay with a dim backdrop.

### Panels, Cards, And Records

- Treat cards as recessed records, not floating marketing cards.
- Use tonal backgrounds and compact padding.
- Use borders only for dense data rows, selected states, or destructive/status differentiation.
- Status tags are small, rounded, and high-signal.

### Project And Agent Modules

- Project list row: project name, summary, status, date, actions.
- Project detail: status/source badges, title, summary, created date, seed job action, seed progress, document rows.
- Agent insight modules: compact signal list, decision log, task artifact row, security/audit status.
- Code/log areas: mono text, copy affordance, low-glare surface.

### Brand Marks

- Use preserved `assets/wordmark.svg` and `assets/isotype.svg` when possible.
- The Angular source also supports color-inheriting inline marks for dynamic themes.
- Do not redraw the mark unless implementing a tiny color-inheriting UI variant.

## Motion And Interaction

- Standard transitions: 100-200ms for hover/focus, 200ms for sidebar/layout changes, 300ms for upward enter/leave.
- Motion should clarify state changes, not decorate.
- Respect reduced motion by disabling non-essential transforms and animations.
- Focus states must be visible and primary-colored.
- Interactive controls need at least 44px mobile hit targets.

## Voice And Brand

Voice is concise, technical, and operational.

- Prefer nouns like `Project`, `Document`, `Decision`, `Execution log`, `Agent insight`, `Seed job`, `Workspace`.
- Use short verbs: `Run`, `Create`, `View`, `Delete`, `Copy`, `Approve`.
- Avoid hype, vague productivity claims, and invented metrics.
- When data is unknown, show an honest placeholder or omit the metric.
- The product can speak bilingually where source supports English/Spanish, but component names and token docs should stay English for reuse.

## Anti-Patterns

- No aggressive purple gradients.
- No generic emoji icon rows.
- No warm beige/peach/pink AI canvas unless future brand evidence changes the palette.
- No rounded cards with decorative left-color stripes unless the stripe is an active/status signal from source patterns.
- No anonymous metric grids or fake performance numbers.
- No heavy shadows for structural hierarchy.
- No decorative icons where a label or row state is clearer.
- No designer/demo controls inside end-user product prototypes.
- No monochrome-only greyscale outputs; always use the source palette and primary/domain/status colors intentionally.

## Reuse Checklist

- Import `colors_and_type.css` first.
- Use preserved assets from `assets/` or `build/` for marks.
- Review `preview/` cards before generating a new artifact.
- Inspect `source_examples/` for source-backed Angular patterns.
- Start new product examples from `ui_kits/app/` when building an app/workspace surface.
