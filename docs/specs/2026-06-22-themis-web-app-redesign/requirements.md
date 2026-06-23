# Themis Web App Redesign — Requirements

## Context

After the Catalyst Angular UI Foundation exists in `apps/web/app/src/app/shared/ui`, Themis Web App should be fully refactored to use the new design system and the Open Design prototypes stored in `resources/open-design/themis-app`.

This spec depends on `docs/specs/2026-06-22-catalyst-angular-ui-foundation`.

Open Design references:

- `resources/open-design/themis-app/index.html`
- `resources/open-design/themis-app/sign-in.html`
- `resources/open-design/themis-app/sign-up.html`
- `resources/open-design/themis-app/recover-password.html`
- `resources/open-design/themis-app/reset-password.html`
- `resources/open-design/themis-app/confirm-account.html`
- `resources/open-design/themis-app/themis-auth-flow.html`
- `resources/open-design/themis-app/themis-reset.html`
- `resources/open-design/themis-app/critique.json`
- `resources/open-design/themis-app/.open-design/project.json`

## Goals

1. Refactor the full Themis Web App UI to the new design system.
2. Use `resources/open-design/themis-app` as the visual source for the redesigned app surfaces.
3. Remove PrimeNG usage from migrated routes and eliminate PrimeNG dependencies once no imports remain.
4. Preserve existing auth, activation, projects, dashboard, realtime, routing, guards, and SSR behavior.
5. Improve visual cohesion, mobile behavior, accessibility, and perceived performance.
6. Keep all source copy, docs, tests, and comments in English.

## Non-Goals

1. Do not redesign the public Astro website in this spec unless explicitly added later.
2. Do not change backend contracts unless a frontend migration exposes a confirmed API gap.
3. Do not rebuild route behavior in components when guards/resolvers/services already own it.
4. Do not introduce new visual dependencies that bypass the UI foundation.

## Target Routes And Surfaces

| Area       | Routes/Surfaces                                                |
| ---------- | -------------------------------------------------------------- |
| Auth       | sign-in, sign-up, verify-email, verify-device, password flows  |
| Activation | first-run activation                                           |
| Shell      | authenticated app layout, sidebar, topbar, mobile navigation   |
| Dashboard  | authenticated landing route                                    |
| Projects   | projects overview, project creation, project detail            |
| Shared     | loading states, empty states, form errors, alerts, account nav |

## Functional Requirements

- Replace route-level PrimeNG components with `shared/ui` primitives.
- Keep route guards and route data behavior intact.
- Keep all critical route data loading in resolvers or existing shared services where applicable.
- Use signals for async UI state and short-lived feedback.
- Use Signal Forms for redesigned forms when practical; retain typed Reactive Forms only when safer for incremental migration.
- Preserve i18n conventions for Angular templates and `$localize` strings.

## Visual Requirements

- Match the intent of the Open Design prototypes, not necessarily every static HTML detail.
- Use the new token layer and UI primitives rather than ad hoc Tailwind blocks.
- Preserve desktop and mobile behavior.
- Use tonal surfaces instead of heavy borders where the design system calls for it.
- Maintain dark mode and first-render theme stability.

## Accessibility Requirements

- Migrated routes must pass AXE checks.
- Auth forms must keep explicit labels and stable button names for tests.
- Mobile navigation must support keyboard operation and escape close behavior.
- Error messages must be associated with fields.
- Focus order must be predictable across forms, shell navigation, and dialogs.
