---
goal: Themis Web App Redesign - Full route migration to shared/ui and PrimeNG removal
version: 1.0
date_created: 2026-06-22
last_updated: 2026-06-22
owner: Themis Web Team
status: 'Planned'
tags: ['feature', 'design-system', 'refactor', 'primeng-removal', 'angular']
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Migrate the Themis Web App (`apps/web/app`) from the current PrimeNG + Tailwind hybrid to the in-house `shared/ui` foundation, using `resources/open-design/themis-app` as the visual source. The foundation primitives are now stable enough to consume without route-specific UI hacks, and the refactor must finish with PrimeNG, PrimeIcons, and `tailwindcss-primeui` removable from the app's dependencies.

## 1. Requirements & Constraints

- **REQ-001**: All Web App route families must use the new design system.
- **REQ-002**: Open Design prototypes in `resources/open-design/themis-app` are the visual source. Match intent, not necessarily literal HTML.
- **REQ-003**: Remove PrimeNG usage from migrated routes and eliminate PrimeNG dependencies once no imports remain.
- **REQ-004**: Preserve existing auth, activation, projects, dashboard, realtime, routing, guards, and SSR behavior.
- **REQ-005**: Improve visual cohesion, mobile behavior, accessibility, and perceived performance.
- **REQ-006**: All source copy, docs, tests, and comments remain in English.
- **SEC-001**: Auth forms must keep explicit labels, stable button names, and field-level error association for e2e and AXE.
- **A11Y-001**: Migrated routes must pass AXE checks; mobile nav must support keyboard operation, escape close, and focus restoration.
- **CON-001**: Do not redesign the public Astro website in this spec.
- **CON-002**: Do not change backend contracts unless a frontend migration exposes a confirmed API gap.
- **CON-003**: Do not rebuild route behavior in components when guards/resolvers/services already own it.
- **CON-004**: Do not introduce new visual dependencies that bypass the UI foundation.
- **GUD-001**: Migrate one route family at a time; verify after each step.
- **GUD-002**: Use Signal Forms for redesigned forms when practical; retain typed Reactive Forms only when safer.
- **GUD-003**: Validation messages must live in component helpers or shared form helpers.
- **PAT-001**: Follow Angular conventions in `AGENTS.md` (signals, `input()`/`output()`, no `Component` suffix, no `ngClass`/`ngStyle`, native control flow).
- **PAT-002**: Use `host` for structural classes; mark Tailwind class strings with `/* tw */`.
- **PAT-003**: Use `app-icon` for all icons; no PrimeIcons classes in the app.
- **PAT-004**: Use `app-button`, `app-link-button`, `app-icon-button` instead of `pButton` or `<button class="...">`.
- **PAT-005**: Use `app-alert` for form/page-level errors; `app-error-message` for per-field errors.

## 2. Implementation Steps

### Implementation Phase 0 — Audit And Mapping

- GOAL-001: Confirm the refactor is fully covered by current `shared/ui` primitives and produce a clean PrimeNG import map to drive the migration.

| Task     | Description                                                                                                                                                                                                                      | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | Run `pnpm nx show project app --json` and `pnpm nx show project app-e2e --json`; record available targets.                                                                                                                       |           |      |
| TASK-002 | Run `pnpm nx show project site --json`; record whether the Astro site still imports `primeicons` so cleanup is staged correctly.                                                                                                 |           |      |
| TASK-003 | Grep all `primeng/*`, `primeicons`, and `.p-*` references under `apps/web/app/src`; build a file-by-file removal list.                                                                                                           |           |      |
| TASK-004 | Inventory `pi pi-*` names used in `shared/layout/sidebar-menu`, `shared/layout/topbar`, `shared/layout/language-switcher`; cross-check against `apps/web/app/src/app/shared/ui/media/icon/icon-paths.ts` and add missing glyphs. |           |      |
| TASK-005 | Review every `resources/open-design/themis-app/*.html` and `critique.json`; record final route-to-design mapping.                                                                                                                |           |      |
| TASK-006 | Review e2e specs in `apps/web/app-e2e/src/**` for selectors/copy that must remain stable (auth labels, headings, button names).                                                                                                  |           |      |

### Implementation Phase 1 — Auth Routes

- GOAL-002: Migrate sign-in, sign-up, forgotten-password, verify-email, and verify-device to `shared/ui` primitives without changing guards, routes, or e2e-visible copy.

| Task     | Description                                                                                                                                                                                                                                                                                                                        | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-007 | In `apps/web/app/src/app/auth/sign-in/sign-in.ts`, remove `ButtonModule`, `InputTextModule`, `MessageModule`, `PasswordModule` imports. Keep `FormField` and `ReactiveFormsModule`; switch inputs to `app-input` and `app-password-input`; switch submit to `app-button`; switch error alert to `app-alert` placed above the form. |           |      |
| TASK-008 | In `apps/web/app/src/app/auth/sign-in/sign-in.html`, wrap the form in `app-auth-layout` + `app-card`; replace `pInputText`, `p-password`, `p-message`, and `pButton` with the new primitives; preserve label, placeholder, button text, and i18n ids (`@@signIn*`).                                                                |           |      |
| TASK-009 | In `apps/web/app/src/app/auth/sign-up/sign-up.ts`/`.html`, apply the same migration as sign-in. Keep password strength helper text and existing validators.                                                                                                                                                                        |           |      |
| TASK-010 | In `apps/web/app/src/app/auth/forgotten-password/forgotten-password.ts`/`.html`, apply the same migration. Keep the success message using `app-alert` (`tone="success"`).                                                                                                                                                          |           |      |
| TASK-011 | In `apps/web/app/src/app/auth/verification-code-form/verification-code-form.ts`/`.html`, remove `ButtonModule`, `InputOtpModule`, `MessageModule`; replace the OTP field with `app-pin-input`; replace submit with `app-button`; keep `verify` and `resend` outputs.                                                               |           |      |
| TASK-012 | Update `apps/web/app/src/app/auth/verify-email/verify-email.ts`/`.html` and `apps/web/app/src/app/auth/verify-device/verify-device.ts`/`.html` to import the migrated `VerificationCodeForm` and wrap the page with `app-auth-layout` + `app-card`.                                                                                |           |      |

### Implementation Phase 2 — App Shell

- GOAL-003: Rebuild the authenticated app shell using `app-app-shell`, `app-sidebar`, and `app-topbar`; remove `MenuModule` and `primeicons` from layout components.

| Task     | Description                                                                                                                                                                                                                                                             | Completed | Date              |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------------- | ------ | ----- | -------------------------------------------------------- | --- | --- |
| TASK-013 | In `apps/web/app/src/app/shared/layout/layout.ts`/`.html`, switch to `app-app-shell`; pass through `showAppShell()`, `mobileMenuOpen()`, and close/escape handlers.                                                                                                     |           |                   |
| TASK-014 | In `apps/web/app/src/app/shared/layout/sidebar-menu/sidebar-menu.ts`, remove `MenuModule` and `MenuItem` imports. Build sections/items as plain data; use `app-dropdown` for the user menu; replace `pi pi-*` icons with `app-icon`.                                    |           |                   |
| TASK-015 | In `apps/web/app/src/app/shared/layout/sidebar-menu/sidebar-menu.html`, render the section list using `app-sidebar-section`, `app-sidebar-item`, and `app-icon`; keep `aria-label` and `RouterLink` semantics; add escape/click-outside handling for the user dropdown. |           |                   |
| TASK-016 | In `apps/web/app/src/app/shared/layout/topbar/topbar.ts`/`.html`, remove every `pi pi-*` class; use `app-icon` with `name="search"                                                                                                                                      | "bell"    | "question-circle" | "moon" | "sun" | "bars"`. Preserve the theme and language switcher slots. |     |     |
| TASK-017 | In `apps/web/app/src/app/shared/layout/language-switcher/language-switcher.ts`/`.html`, remove `MenuModule` and `pi pi-globe`/`pi pi-angle-down`; use `app-dropdown` with `app-listbox` and `app-icon`.                                                                 |           |                   |
| TASK-018 | Verify `hideAppShell` still hides the shell on `/app/sign-in`, `/app/sign-up`, `/app/verify-email`, `/app/verify-device`, `/app/forgotten-password` via the existing route data and `Layout` signal.                                                                    |           |                   |
| TASK-019 | Run `pnpm nx test app` to confirm existing unit tests still pass; manually validate mobile nav (open/close, escape, click-outside, close-on-navigation).                                                                                                                |           |                   |

### Implementation Phase 3 — Activation And Dashboard

- GOAL-004: Migrate activation and dashboard to the new layout, form, and feedback primitives while keeping existing services, guards, and resolvers.

| Task     | Description                                                                                                                                                                                                                                                                                                            | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-020 | In `apps/web/app/src/app/app.ts`/`.html` (root), ensure the router-outlet is rendered directly so the new shell composes via the `Layout` route. No template changes required if the shell now lives in `shared/layout`.                                                                                               |           |      |
| TASK-021 | In `apps/web/app/src/app/activation/activation.ts`/`.html`, remove `ButtonModule`, `InputTextModule`, `MessageModule`; use `app-page-header`, `app-card`, `app-stacked-layout`, `app-field`, `app-input`, `app-pin-input` (if OTP step exists), `app-button`, `app-alert`. Preserve the `authenticatedGuard` behavior. |           |      |
| TASK-022 | In `apps/web/app/src/app/dashboard/dashboard.ts`/`.html`, use `app-page-header`, `app-card`, `app-heading`, `app-text`, `app-loader`, and `app-alert` for the empty/loading/error states.                                                                                                                              |           |      |
| TASK-023 | Re-run `pnpm nx test app`; manually validate `/app/activation` and `/app/` at 360/390/768/1280/1440 in light and dark mode, including first render before hydration.                                                                                                                                                   |           |      |

### Implementation Phase 4 — Projects

- GOAL-005: Migrate projects overview, creation, and detail to `shared/ui`; preserve `ProjectsApi`, realtime updates, and navigation.

| Task     | Description                                                                                                                                                                                                                                                                                                  | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-024 | In `apps/web/app/src/app/projects/projects.ts`/`.html`, remove `ButtonModule`, `MessageModule`; render the list with `app-table` (desktop) and stacked `app-card` (mobile) using `app-badge` for status. Use `app-alert` for error and `app-loader` for loading.                                             |           |      |
| TASK-025 | In `apps/web/app/src/app/projects/project-new/project-new.ts`/`.html`, remove `ButtonModule`, `InputTextModule`, `MessageModule`; use `app-page-header`, `app-card`, `app-field`, `app-input`, `app-textarea`, `app-button`. Preserve validators and `ProjectsApi.create`.                                   |           |      |
| TASK-026 | In `apps/web/app/src/app/projects/project-detail/project-detail.ts`/`.html`, remove `ButtonModule`, `MessageModule`; use `app-page-header`, `app-card`, `app-description-list`, `app-badge`, `app-loader`, `app-dialog` (for destructive confirmations). Keep realtime subscriptions and document rendering. |           |      |
| TASK-027 | In `apps/web/app/src/app/shared/jobs/project-seed.ts` (if it touches UI), keep behavior; if it renders anything, align to `app-button`/`app-alert`.                                                                                                                                                          |           |      |
| TASK-028 | Run `pnpm nx test app`; manually validate `/app/projects`, `/app/projects/new`, `/app/projects/:projectId` at the standard breakpoints.                                                                                                                                                                      |           |      |

### Implementation Phase 5 — Form Field Helper Cleanup

- GOAL-006: Remove the last PrimeNG dependency from `shared/form/form-field` and confirm all form usages are aligned.

| Task     | Description                                                                                                                                                                                                                                                                                                         | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-029 | In `apps/web/app/src/app/shared/form/form-field/form-field.ts`/`.html`, remove `MessageModule`. Rebuild the field chrome using `app-field`, `app-label`, `app-description`, and `app-error-message`.                                                                                                                |           |      |
| TASK-030 | Audit every usage of `app-form-field` in `apps/web/app/src/app` and update consumers to pass `error` as a signal/string and to wrap the control with the appropriate primitive (`app-input`, `app-password-input`, `app-textarea`, `app-select`, `app-checkbox`, `app-radio-group`, `app-switch`, `app-pin-input`). |           |      |
| TASK-031 | Run `pnpm nx test app`; ensure the `verification-code-form` and `auth/sign-in` tests still pass.                                                                                                                                                                                                                    |           |      |

### Implementation Phase 6 — PrimeNG Removal

- GOAL-007: Remove PrimeNG, PrimeIcons, and `tailwindcss-primeui` from the app and site so the workspace no longer depends on Prime packages.

| Task     | Description                                                                                                                                                                                     | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-032 | In `apps/web/app/src/app/app.config.ts`, remove `providePrimeNG(...)`, the `primeng/config` import, and the `ThemisPreset` import.                                                              |           |      |
| TASK-033 | Delete `apps/web/app/src/app/app.theme.ts` (and its `spec` if any) once no longer imported.                                                                                                     |           |      |
| TASK-034 | In `apps/web/app/src/styles.css`, remove `@import 'tailwindcss-primeui';` and `@import 'primeicons/primeicons.css' layer(utilities);`. Remove every `.p-*` rule and any related `@layer` block. |           |      |
| TASK-035 | Grep `apps/web/app/src` to confirm zero remaining `primeng/`, `primeicons`, `pi pi-`, and `.p-` references.                                                                                     |           |      |
| TASK-036 | In `package.json`, remove `primeng`, `primeicons`, `tailwindcss-primeui`, and `@primeng/mcp` (the dev-only MCP is only useful while PrimeNG is in use). Run `pnpm install`.                     |           |      |
| TASK-037 | Remove `primeicons/primeicons.css` from `apps/web/site/src/styles/global.css` and confirm the site builds without Prime packages.                                                               |           |      |

### Implementation Phase 7 — Documentation And Regression Notes

- GOAL-008: Update design system docs, the spec's plan, and the e2e notes so future contributors see the final route-to-design mapping and any deviations.

| Task     | Description                                                                                                                                                                                | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-038 | Update `docs/design-system/recipes.md` with concrete examples for auth (`sign-in`/`sign-up`/`forgotten-password`/`verification`), shell, dashboard, and projects using the new primitives. |           |      |
| TASK-039 | Append a final route-to-Open-Design mapping and recorded deviations to `docs/specs/2026-06-22-themis-web-app-redesign/plan.md`.                                                            |           |      |
| TASK-040 | Review `docs/testing/auth-testing.md`; update only if visible copy or selectors changed. If unchanged, note that auth tests remained stable.                                               |           |      |
| TASK-041 | Run the full validation suite: `pnpm nx lint app && pnpm nx test app && pnpm nx build app && pnpm nx e2e app-e2e`. Capture results in the PR description.                                  |           |      |

## 3. Alternatives

- **ALT-001**: Keep PrimeNG in the app long-term and layer the new design system on top. Rejected because PrimeNG styling conflicts with the token layer, the bundle is large, and the SDD explicitly mandates removal once imports are gone.
- **ALT-002**: Rewrite the entire app in a single PR. Rejected because the SDD's "migrate one route family at a time" rule exists to keep e2e green and the diff reviewable.
- **ALT-003**: Replace the `app-pin-input` OTP cell semantics with multiple `app-input`s. Rejected because `app-pin-input` already implements auto-advance, focus management, and 6-digit validation equivalent to the Open Design intent.
- **ALT-004**: Drop the legacy `FormField` helper. Deferred to a follow-up; the SDD says "replace `app-form-field` PrimeNG dependency" — the wrapper is still useful as a thin composition of `app-field`/`app-label`/`app-error-message`.

## 4. Dependencies

- **DEP-001**: `apps/web/app/src/app/shared/ui` primitives listed in the audit.
- **DEP-002**: `apps/web/app/src/app/shared/ui/media/icon` for all iconography (no PrimeIcons).
- **DEP-003**: `apps/web/app/src/app/shared/auth`, `shared/activation`, `shared/projects`, `shared/realtime` services and guards.
- **DEP-004**: `resources/open-design/themis-app/*.html` and `critique.json` as visual reference.
- **DEP-005**: Tailwind tokens defined in `apps/web/app/src/styles.css` via `@theme` blocks.
- **DEP-006**: Nx projects: `app`, `app-e2e`, `site`, `shared`, and `projects`.

## 5. Files

- **FILE-001**: `apps/web/app/src/app/app.config.ts` — drop PrimeNG provider.
- **FILE-002**: `apps/web/app/src/app/app.theme.ts` — delete.
- **FILE-003**: `apps/web/app/src/styles.css` — remove PrimeNG and PrimeIcons imports and `.p-*` rules.
- **FILE-004**: `apps/web/app/src/app/auth/sign-in/sign-in.{ts,html,css}` — migrate.
- **FILE-005**: `apps/web/app/src/app/auth/sign-up/sign-up.{ts,html,css}` — migrate.
- **FILE-006**: `apps/web/app/src/app/auth/forgotten-password/forgotten-password.{ts,html,css}` — migrate.
- **FILE-007**: `apps/web/app/src/app/auth/verify-email/verify-email.{ts,html,css}` — migrate.
- **FILE-008**: `apps/web/app/src/app/auth/verify-device/verify-device.{ts,html,css}` — migrate.
- **FILE-009**: `apps/web/app/src/app/auth/verification-code-form/verification-code-form.{ts,html,css}` — migrate.
- **FILE-010**: `apps/web/app/src/app/activation/activation.{ts,html,css}` — migrate.
- **FILE-011**: `apps/web/app/src/app/dashboard/dashboard.{ts,html,css}` — migrate.
- **FILE-012**: `apps/web/app/src/app/projects/projects.{ts,html,css}` — migrate.
- **FILE-013**: `apps/web/app/src/app/projects/project-new/project-new.{ts,html,css}` — migrate.
- **FILE-014**: `apps/web/app/src/app/projects/project-detail/project-detail.{ts,html,css}` — migrate.
- **FILE-015**: `apps/web/app/src/app/shared/layout/layout.{ts,html,css}` — switch to `app-app-shell`.
- **FILE-016**: `apps/web/app/src/app/shared/layout/sidebar-menu/sidebar-menu.{ts,html,css}` — drop `MenuModule` and `primeicons`.
- **FILE-017**: `apps/web/app/src/app/shared/layout/topbar/topbar.{ts,html,css}` — replace `pi pi-*` with `app-icon`.
- **FILE-018**: `apps/web/app/src/app/shared/layout/language-switcher/language-switcher.{ts,html,css}` — replace `MenuModule` with `app-dropdown`.
- **FILE-019**: `apps/web/app/src/app/shared/form/form-field/form-field.{ts,html,css}` — remove `MessageModule`.
- **FILE-020**: `apps/web/app/src/app/shared/ui/media/icon/icon-paths.ts` — add any missing icon names used by the shell.
- **FILE-021**: `package.json` — remove `primeng`, `primeicons`, `tailwindcss-primeui`, `@primeuix/themes`, and `@primeng/mcp` once app and site are clean.
- **FILE-022**: `docs/design-system/recipes.md` — add real route examples.
- **FILE-023**: `docs/specs/2026-06-22-themis-web-app-redesign/plan.md` — append final mapping and deviations.
- **FILE-024**: `docs/testing/auth-testing.md` — touch up only if copy changed.

## 6. Testing

- **TEST-001**: `pnpm nx lint app` — must pass with zero warnings introduced by the migration.
- **TEST-002**: `pnpm nx test app` — run after each phase; all existing unit tests must stay green.
- **TEST-003**: `pnpm nx build app` — SSR build must succeed; confirm `withHttpTransferCacheOptions` filter and platform abstractions remain intact.
- **TEST-004**: `pnpm nx e2e app-e2e` — auth, activation, projects, and theme suites must stay green.
- **TEST-005**: AXE scan on migrated routes (`/app/sign-in`, `/app/sign-up`, `/app/forgotten-password`, `/app/verify-email`, `/app/verify-device`, `/app/activation`, `/app/`, `/app/projects`, `/app/projects/new`, `/app/projects/:projectId`).
- **TEST-006**: Manual mobile/desktop visual pass at 360/390/768/1280/1440 in light and dark, including first-render before theme hydration.
- **TEST-007**: PrimeNG removal grep — `pnpm exec rg "primeng/|primeicons|tailwindcss-primeui|pi pi-|\.p-" apps` and package/lockfile searches must return zero matches.

## 7. Risks & Assumptions

- **RISK-001**: `app-icon` may not cover every PrimeIcons name used in the shell. Mitigation: TASK-004 inventories names and TASK-016/TASK-017/TASK-020 add missing paths before migration.
- **RISK-002**: `app-pin-input` semantics differ subtly from `p-inputOtp` (e.g. paste handling). Mitigation: validation in TASK-011 covers paste/auto-advance; manual e2e at TASK-041 covers verify-email and verify-device.
- **RISK-003**: Removing `providePrimeNG` and the Aura preset changes the global CSS layer order. Mitigation: TASK-034 removes the corresponding `@import`s and the build is validated at TASK-041.
- **RISK-004**: The Astro site could still depend on `primeicons.css`. Mitigation: TASK-037 removes the import and validates `site:lint`, `site:typecheck`, and `site:build` before removing the workspace packages.
- **RISK-005**: e2e selectors break if visible copy changes. Mitigation: TASK-006 inventories selectors up front and copy is preserved in TASK-007 through TASK-012.
- **ASSUMPTION-001**: The UI foundation primitives listed in Phase 0 are production-ready and need no breaking API changes during the refactor.
- **ASSUMPTION-002**: `pnpm install` and the Nx targets behave as recorded by `pnpm nx show project`.
- **ASSUMPTION-003**: No backend contract changes are required; if a gap surfaces, it is recorded and deferred per SDD risk mitigation.

## 8. Related Specifications / Further Reading

- [docs/specs/2026-06-22-themis-web-app-redesign/sdd.md](../specs/2026-06-22-themis-web-app-redesign/sdd.md)
- [docs/specs/2026-06-22-themis-web-app-redesign/requirements.md](../specs/2026-06-22-themis-web-app-redesign/requirements.md)
- [docs/specs/2026-06-22-themis-web-app-redesign/validation.md](../specs/2026-06-22-themis-web-app-redesign/validation.md)
- [docs/specs/2026-06-22-catalyst-angular-ui-foundation/sdd.md](../specs/2026-06-22-catalyst-angular-ui-foundation/sdd.md)
- [docs/design-system/tokens.md](../design-system/tokens.md)
- [docs/design-system/recipes.md](../design-system/recipes.md)
- [docs/design-system/components.md](../design-system/components.md)
- [docs/testing/auth-testing.md](../testing/auth-testing.md)
- [resources/open-design/themis-app/](../resources/open-design/themis-app/)
