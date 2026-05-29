# Themis Design System Package

Reusable Open Design package for Themis, a structured developer task ledger for defining, documenting, updating, and executing technical work with durable human and AI-agent context.

## Product Overview

Themis is evidenced from the local source folder `/home/visomi/Projects/GitHub/visomi-dev/themis` and copied snapshots under `context/local-code/themis/files/`. The repository is an Nx monorepo with an Astro marketing site, Angular web application, Express API, BullMQ worker, Socket.IO realtime runtime, and gateway server.

The product is not a generic chat tool. It is a project-first operational ledger where humans and code agents share durable state: projects, tasks, documents, source summaries, decisions, seed jobs, execution history, and reviewable context. The visual system should therefore feel like a technical manuscript: precise, low-glare, structured, and reviewable.

Primary UI surfaces evidenced by package/source files:

- Public landing site explaining AI-integrated technical execution.
- Sign-in/auth flow with language and theme controls.
- App shell with responsive sidebar, mobile drawer behavior, topbar, logo, user menu, and theme toggle.
- Projects registry with project name, summary, status, date, and actions.
- Project detail view with status/source badges, seed job action, seed progress, documents, and metadata.
- Preserved brand marks and screenshots: wordmark, isotype, favicon, projects overview, and sign-in evidence.

Core capabilities evidenced by source and package files:

- Create and inspect structured projects.
- Preserve summaries, documents, source context, status, created dates, and execution seed progress.
- Support reviewable agent activity without making the product chat-first noise.
- Render consistent light/dark themes from the same token vocabulary.

## Source Context References

- Linked source folder: `/home/visomi/Projects/GitHub/visomi-dev/themis`.
- Intake/evidence note: `context/local-code/themis.md`.
- Copied snapshots: `context/local-code/themis/files/`.
- Canonical token evidence: `context/local-code/themis/files/styles.base.css`.
- Source design rules: `context/local-code/themis/files/DESIGN.md` and `context/local-code/themis/files/DESIGN_DARK.md`.
- Source-backed component examples: `source_examples/`.
- Preserved source assets: `assets/` and runtime-intent copies in `build/`.

## Package Contents

- `DESIGN.md` - canonical rules document for future design work.
- `colors_and_type.css` - reusable CSS variables, light/dark theme tokens, type helpers, panel classes, and button classes.
- `SKILL.md` - Claude Design-style skill entry with frontmatter, package contents, source context, usage workflow, and highlights.
- `PROVENANCE.md` - evidence collection, preservation, and audit notes.
- `assets/` - preserved `wordmark.svg`, `isotype.svg`, `favicon.svg`, `projects-overview.png`, and `themis-sign-in.png`.
- `build/` - runtime-intent preserved originals: `build/wordmark.svg`, `build/isotype.svg`, and `build/favicon.ico`.
- `source_examples/` - substantial source-backed examples copied outside `context/`: `logo.html`, `sidebar-menu.html`, `sidebar-menu.ts`, `sign-in.html`, `projects.html`, and `project-detail.html`.
- `preview/` - focused review cards for colors, typography, spacing, components, inputs, and brand assets.
- `ui_kits/app/` - runnable React/Babel interface kit using modular components and `../../colors_and_type.css`.
- `context/` - source snapshots and intake notes used to ground the package.

## Preview Manifest

- `preview/colors-theme-light.html` - Inspect Slate & Syntax light tokens, surface ladder, primary/action color, status colors, and a source-backed project row derived from `projects.html` patterns.
- `preview/colors-theme-dark.html` - Inspect Night Edition dark tokens, low-glare slate surfaces, cyan focus/action color, and dark operational project-detail panels.
- `preview/typography-specimens.html` - Inspect Manrope heading hierarchy, Inter body/UI copy, JetBrains Mono technical labels, and source-backed terms like Project, Document, Seed job, and Execution log.
- `preview/spacing-radius.html` - Inspect the 8px rhythm and radius scale through source-backed modules: sidebar-menu item, projects row, and project-detail/auth panel surfaces.
- `preview/components-buttons.html` - Inspect source-backed action controls modeled on project-detail seed actions, document actions, sidebar active state, and status tags.
- `preview/components-inputs.html` - Inspect auth/form patterns modeled on `sign-in.html` and `form-field.html`: labels, autocomplete, help/error copy, checkbox row, and full-width submit action.
- `preview/brand-assets.html` - Inspect preserved source assets loaded visibly from `assets/` and `build/`, including wordmark/isotype SVGs, favicon assets, and screenshot evidence.

Keep this manifest synchronized whenever preview files are added, renamed, or removed.

## Preserved Assets, Build Files, And Source Examples

Use preserved files directly in future artifacts. Do not redraw the Themis mark or replace runtime evidence with prose-only notes.

- Brand assets: `assets/wordmark.svg`, `assets/isotype.svg`, `assets/favicon.svg`.
- Screenshot evidence: `assets/projects-overview.png`, `assets/themis-sign-in.png`.
- Runtime/build representatives: `build/wordmark.svg`, `build/isotype.svg`, `build/favicon.ico`.
- Component evidence: `source_examples/sidebar-menu.html`, `source_examples/sidebar-menu.ts`, `source_examples/logo.html`, `source_examples/sign-in.html`, `source_examples/projects.html`, `source_examples/project-detail.html`.

## UI Kit

`ui_kits/app/` is the reusable applied interface kit for app/workspace surfaces. It is intentionally product-like, not a static marketing page.

- `ui_kits/app/index.html` loads React, ReactDOM, Babel, `../../colors_and_type.css`, each modular JSX file, and mounts `window.App` into `#root`.
- `ui_kits/app/components/Sidebar.jsx` models the source sidebar/logo/navigation posture.
- `ui_kits/app/components/AssistantsList.jsx` models the project/agent list rail.
- `ui_kits/app/components/ChatArea.jsx` models the workspace/project detail area with seed progress and document context.
- `ui_kits/app/components/MessageBubble.jsx` models compact reviewable comments/messages.
- `ui_kits/app/components/InputBar.jsx` models an operational composer/action input.
- `ui_kits/app/components/App.jsx` composes the modules into one runnable workspace.
- `ui_kits/app/README.md` documents structure, source basis, usage workflow, and design notes.

## Reuse Workflow

1. Read `DESIGN.md` before generating artifacts; it is the canonical design-system contract.
2. Import `colors_and_type.css` first and bind tokens instead of inventing new palette names.
3. Pick the appropriate theme: light by default, `data-theme="dark"` or `.dark` for Night Edition.
4. Use `assets/` or `build/` for real marks and runtime icons.
5. Inspect `source_examples/` when matching sidebar, logo, sign-in, projects, or project-detail behavior.
6. Review the exact `preview/` card relevant to your surface before final output.
7. Start app/workspace prototypes from `ui_kits/app/` when possible and keep component composition modular.
8. Preserve Themis voice: concise technical nouns, honest placeholders, no invented metrics, no decorative chat-first noise.

## Review Workflow

1. Open `preview/brand-assets.html` to confirm preserved files load from `assets/` and `build/`.
2. Open `preview/colors-theme-light.html` and `preview/colors-theme-dark.html` to compare theme hierarchy.
3. Open `preview/components-buttons.html`, `preview/components-inputs.html`, and `preview/spacing-radius.html` to verify source-backed component posture.
4. Open `ui_kits/app/index.html` to confirm the runnable interface kit composes all modular components.
5. Cross-check `README.md`, `SKILL.md`, and `DESIGN.md` when changing file structure or preview names.

## Design Notes

- Use tonal stacking instead of heavy shadows.
- Use Manrope for structural headings, Inter for UI/body, and JetBrains Mono for technical labels.
- Prefer structured rows, document wells, project metadata, status badges, and seed job panels over anonymous card grids.
- Reserve primary blue/cyan for primary actions, active navigation, focus, and important agent signals.
- Avoid fake metrics, generic emoji feature rows, warm beige AI canvases, decorative icon clutter, and designer/demo controls inside product UI.

## Provenance

This package was regenerated inside the project workspace from local source evidence. The bounded intake wrapper was unavailable in the earlier runtime, so evidence was manually copied from the linked local folder into `context/local-code/themis/files/` and summarized in `context/local-code/themis.md`. Source-backed examples and preserved assets were then copied outside `context/` for future agents and package consumers.
