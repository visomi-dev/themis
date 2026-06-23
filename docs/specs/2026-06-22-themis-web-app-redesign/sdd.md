# Themis Web App Redesign — Software Design Document

## Decision

The app redesign will be a second, dependent effort after the UI foundation is in place. It will consume `apps/web/app/src/app/shared/ui` primitives and use `resources/open-design/themis-app` as the visual reference set for route-level implementation.

The redesign should avoid route-specific UI hacks. If a screen needs a reusable primitive, the primitive belongs in the UI foundation first or in a clearly named shared route-level component.

## Dependency

This spec starts after the UI foundation provides at least:

- Actions: button/link/icon button.
- Typography: heading/text/divider.
- Forms: field/input/select/checkbox/radio/switch/error primitives.
- Layout: auth layout, app shell, sidebar, topbar, container, page header.
- Data: badge/avatar/table/description list.
- Feedback: alert and loading/empty-state patterns.

## Open Design Mapping

| Open Design File            | Themis Surface                                  |
| --------------------------- | ----------------------------------------------- |
| `sign-in.html`              | `apps/web/app/src/app/auth/sign-in`             |
| `sign-up.html`              | `apps/web/app/src/app/auth/sign-up`             |
| `recover-password.html`     | `apps/web/app/src/app/auth/forgotten-password`  |
| `reset-password.html`       | Password reset route when implemented/available |
| `confirm-account.html`      | Email/device verification surfaces              |
| `themis-auth-flow.html`     | Shared auth flow composition                    |
| `themis-reset.html`         | Password recovery/reset composition             |
| `index.html`                | Authenticated shell/dashboard direction         |
| `critique.json`             | Design review guidance and refinements          |
| `.open-design/project.json` | Open Design project metadata                    |

## Refactor Strategy

1. Keep behavior stable first, then change visuals.
2. Migrate one route family at a time.
3. Replace PrimeNG imports as each route is migrated.
4. Move duplicated route chrome into `shared/ui` or `shared/layout` only when it is reusable.
5. Run route-specific unit/e2e checks after each route family.

## Route Architecture

- Keep lazy route components with `loadComponent`.
- Keep auth and activation checks in guards, not components.
- Keep critical route data in resolvers or existing services.
- Keep SSR/browser-specific logic in existing browser/server abstractions.
- Keep async view state as signals.

## Forms Strategy

- Auth and password forms should use the new `shared/ui/forms` primitives.
- Prefer Signal Forms for newly rewritten flows when practical.
- Retain typed Reactive Forms only when it keeps migration risk low.
- Validation messages must remain centralized in component helpers or shared form helpers.
- Tests must keep stable labels and button names.

## PrimeNG Removal Strategy

PrimeNG removal happens incrementally:

1. Remove PrimeNG from auth routes.
2. Remove PrimeNG from activation routes.
3. Remove PrimeNG from app shell/dashboard/projects.
4. Remove `.p-*` overrides from `apps/web/app/src/styles.css`.
5. Remove `tailwindcss-primeui`, `primeng`, and `primeicons` after imports are gone.

## Risks

| Risk                                            | Mitigation                                                        |
| ----------------------------------------------- | ----------------------------------------------------------------- |
| Open Design static HTML conflicts with app flow | Preserve Themis behavior and map the visual intent, not markup    |
| Route migration breaks auth tests               | Migrate auth first with stable labels, headings, and button names |
| PrimeNG removal is too broad                    | Remove per route family and verify after each step                |
| UI foundation lacks a needed primitive          | Add the primitive to `shared/ui` before route-specific hacks      |
| SSR regressions                                 | Keep browser-only code inside existing platform abstractions      |

## Success Criteria

- All Web App route families use the new design system.
- Open Design references are reflected in the app's auth and shell experience.
- PrimeNG and PrimeIcons can be removed from dependencies.
- App e2e tests pass for auth, activation, dashboard, projects, and theme behavior.
- The refactor keeps existing backend/API behavior intact.
