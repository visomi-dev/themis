# Delivery Plan: Themis

## Suggested Phases

### Phase 1: Task Definition Core

Build:

- task entity
- task detail screen
- scope fields
- requirements
- acceptance criteria
- status flow

### Phase 2: Daily Execution Layer

Build:

- update composer
- update log timeline
- next step field
- blockers
- stale task surfacing

### Phase 3: Initiative Layer

Build:

- initiative grouping
- initiative view
- task relationships

### Phase 4: Agent Layer

Build:

- agent-readable task view
- agent update endpoints
- structured task export

### Phase 5: Workflow Automation

Build:

- reminders for stale tasks
- automatic summaries
- optional queue-backed processing

## Recommended First Technical Slice

For this standalone monorepo, the first implementation should likely be:

- Angular frontend under the application surface
- API endpoints in `apps/web/api`
- PostgreSQL-backed persistence later in the implementation sequence
- mounted through `apps/web/server`

## SSR Compatibility Hardening

Refactor the Angular app to author server-compatible components per the [Angular SSR guide](https://angular.dev/guide/ssr#authoring-server-compatible-components). Replaces `isPlatformBrowser` / `isPlatformServer` checks with platform-specific provider implementations.

- See spec: [`docs/specs/2026-06-08-ssr-browser-refactor/`](./specs/2026-06-08-ssr-browser-refactor/)
- Branch: `feat/OC/ssr-browser-refactor`
- Version target: `1.1.0`

## Design System Alignment (Catalyst Purity)

The Catalyst Angular foundation shipped with a Material 3 token base and a Catalyst-style alias layer. The user prefers the pure Catalyst visual language; this phase retires the Material 3 layer and exposes only the Catalyst semantic token set (`bg`, `panel`, `panel-raised`, `fg`, `muted-fg`, `accent`, `danger`, `ring`, `border`). The Themis brand color becomes Tailwind `blue-600`. Components adopt Catalyst visual patterns: optical borders via `before/after`, `--btn-bg` / `--btn-border` / `--btn-icon` custom properties, and `data-*` state selectors.

- See spec: [`docs/specs/2026-06-23-catalyst-pure-tokens-alignment/`](./specs/2026-06-23-catalyst-pure-tokens-alignment/)
- Branch: `feat/OC/catalyst-pure-tokens-alignment`
- Version target: `1.3.0`

Slice plan:

- [ ] PR1: token foundation in `styles.base.css` + `docs/design-system/tokens.md` + `components.md` + `recipes.md`.
- [ ] PR2: `shared/ui` components adopt the new tokens and Catalyst `data-*` patterns.

## UI Designer App

Replace the vendored Open Design prototypes and the inherited design-system skill with a first-party Node + Tailwind v4 preview application. The app reuses `styles.base.css`, serves a local preview server with light/dark + mobile/tablet/desktop viewports, ships one seed prototype that mirrors the auth shell recipe, and is paired with a `themis-ui-prototype` opencode skill that drives the workflow. The cleanup drops `resources/open-design/themis-app/`, `.opencode/skills/themis-design-system/`, and the historical specs that referenced them. Two upstream open-design skills (`impeccable-design-polish`, `login-flow`) fill the gap left by the deleted skill; the Themis brand already lives in `docs/design-system/tokens.md` and `DESIGN.md`, so no brand skill is vendored. Node is the only runtime target — Bun is intentionally out of scope to keep the workspace runtime uniform.

- See spec: [`docs/specs/2026-06-26-ui-designer-app/`](./specs/2026-06-26-ui-designer-app/)
- Branch: `feat/OC/ui-designer-app`
- Version target: `1.4.0`

## Post-Refactor UI Review

Audit and polish the surfaces left inconsistent by the Catalyst utility-first refactor series (Catalyst Angular foundation, pure tokens alignment, site utility-first migration, UI designer app). The review follows the `web-design-reviewer` workflow: capture a baseline screenshot grid and an auth flow recording, audit visual drift at the source, apply focused fixes, re-capture, and ship the recordings as evidence. Concrete items in scope: replace the non-canonical `font-display` utility with `font-heading` across the auth routes, brand wordmark, and recipes doc; collapse duplicate background utilities in the `app-auth-layout` sticky header; replace the magic `min-h-[calc(100vh-64px)]` with `min-h-dvh`; tighten the `app-auth-card` mobile padding to a 24px outer floor; add `data-od-id` chrome hooks for visual e2e suites; add `scripts/capture-ui-snapshots.cjs` to drive the snapshot matrix; regenerate the auth flow recordings. No new tokens, no new primitives, no redesign. Out of scope for this spec: a `DESIGN.md` manuscript realignment (already documented as follow-up in the site spec), automated visual regression in CI, and any backend changes.

- See spec: [`docs/specs/2026-06-27-post-refactor-ui-review/`](./specs/2026-06-27-post-refactor-ui-review/)
- Branch: `feat/OC/post-refactor-ui-review`
- Version target: `1.5.0`

Slice plan:

- [ ] PR1: replace `font-display` with `font-heading` in the auth routes, the brand wordmark, and `recipes.md`.
- [ ] PR2: tighten the `app-auth-layout` sticky header (drop duplicate utilities, responsive height, sticky on mobile).
- [ ] PR3: tighten `app-auth-card` mobile padding to `px-6 py-6` floor and add `data-od-id="submit"` to every auth route's primary CTA.
- [ ] PR4: add `scripts/capture-ui-snapshots.cjs`, regenerate `media/auth-flow-videos/*.webm`, bump version to `1.5.0`, update the roadmap.
