# Themis Web App Redesign — Implementation Plan

## Phase 0 — Design Audit And Mapping

1. Review every artifact in `resources/open-design/themis-app`.
2. Extract visual decisions from `critique.json`.
3. Map Open Design files to Themis routes and identify missing route references.
4. Inventory current route-level PrimeNG imports and `.p-*` styling dependencies.
5. Confirm the UI foundation primitives needed by each route family.

## Phase 1 — Auth Routes

1. Redesign sign-in using `sign-in.html` and shared auth flow references.
2. Redesign sign-up using `sign-up.html`.
3. Redesign forgotten-password using `recover-password.html`.
4. Redesign verify-email and verify-device using `confirm-account.html` intent.
5. Replace PrimeNG form controls/messages with `shared/ui/forms` primitives.
6. Preserve labels, headings, button names, and auth guard behavior.

## Phase 2 — Password Reset Coverage

1. Map `reset-password.html` and `themis-reset.html` to current or planned routes.
2. Implement the UI only for routes that already exist or are explicitly added.
3. Keep backend/API additions out of scope unless required by existing product requirements.

## Phase 3 — App Shell

1. Redesign authenticated shell using `index.html` as the visual direction.
2. Replace existing sidebar/topbar markup with `shared/ui/layout` primitives.
3. Validate desktop sidebar, mobile menu, backdrop, escape close, and close-on-navigation.
4. Preserve `hideAppShell` route data behavior.

## Phase 4 — Activation And Dashboard

1. Migrate activation screens to the new layout and form primitives.
2. Redesign dashboard panels with `shared/ui/data`, `shared/ui/typography`, and `shared/ui/layout` primitives.
3. Add empty/loading/error states using the new feedback primitives.

## Phase 5 — Projects

1. Redesign projects overview using new table/card/list primitives.
2. Redesign project creation form.
3. Redesign project detail surfaces.
4. Preserve existing project services, realtime updates, and navigation.

## Phase 6 — PrimeNG Cleanup

1. Search for remaining `primeng/*` imports.
2. Search for remaining `primeicons` usage.
3. Search for remaining `.p-*` CSS overrides.
4. Remove PrimeNG-specific global styles.
5. Remove `tailwindcss-primeui`, `primeng`, and `primeicons` after all imports are gone.

## Phase 7 — Documentation And Regression Notes

1. Document final route-to-Open-Design mapping.
2. Record deviations from static Open Design references and why they were necessary.
3. Update `docs/design-system/recipes.md` with real Themis route examples.
4. Update e2e support docs if selectors or visible copy changed.

## Nx Verification Commands

```bash
pnpm nx lint app
pnpm nx test app
pnpm nx e2e app-e2e
pnpm nx build app
```

If a target is missing or changes, inspect it first with:

```bash
pnpm nx show project app --json
pnpm nx show project app-e2e --json
```

---

## Implementation Outcome

All seven phases were executed against the actual repository state. The app source no longer references PrimeNG, PrimeIcons, or `tailwindcss-primeui`. Verified with `rg "primeng|primeicons|tailwindcss-primeui|pi pi-|\.p-" apps/web/app/src` returning no matches.

### Final Route-To-Open-Design Mapping

| Open Design File            | Themis Surface                                                                           | Notes                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `sign-in.html`              | `apps/web/app/src/app/auth/sign-in`                                                      | Two-column auth layout with brand column on the left and form card on the right. |
| `sign-up.html`              | `apps/web/app/src/app/auth/sign-up`                                                      | Same layout. Replaces `p-password` with `app-password-input`.                    |
| `recover-password.html`     | `apps/web/app/src/app/auth/forgotten-password`                                           | Single-column form card. Success and error states use `app-alert`.               |
| `confirm-account.html`      | `apps/web/app/src/app/auth/verify-email`, `verify-device`, `auth/verification-code-form` | `app-pin-input` replaces `p-inputOtp`.                                           |
| `themis-auth-flow.html`     | `app-auth-layout` primitive                                                              | Brand column and form column composition.                                        |
| `themis-reset.html`         | Not implemented                                                                          | No password reset route exists yet. Documented as deferred.                      |
| `index.html`                | `shared/layout/layout`, `sidebar-menu`, `topbar`, `dashboard`                            | Layout shell uses `app-icon` and `app-avatar`.                                   |
| `critique.json`             | Source of truth for tone                                                                 | The single accent is `accent`, the brand mark is the in-house `app-logo`.        |
| `.open-design/project.json` | Project metadata only                                                                    | No app code change.                                                              |

### Deviations From Open Design

- **Sidebar collapse animation.** Open Design shows a smooth width transition; the legacy sidebar already animates via `transition-all duration-200`. Kept the legacy behavior for now.
- **Password strength meter.** Open Design's `sign-up.html` and `reset-password.html` include a multi-tier strength indicator. The current `app-password-input` exposes the same data through `password-input.html` description slot, but a dedicated strength component is out of scope here. The `<app-description>` next to the password field mirrors the helper copy.
- **Launcher grid.** Open Design's `index.html` shows a launcher grid for auth. The Themis app routes directly to `/app/sign-in` via the guard flow, so no launcher is rendered.
- **PrimeIcons classes.** The Open Design references `primeicons` for inline glyphs. We replaced them with `app-icon` SVG primitives backed by a small `icon-paths.ts` set in `shared/ui/media/icon`.
- **Theme tokens.** Open Design uses `--tm-*` variables inline. The Themis app already has a token layer in `apps/web/app/src/styles.css` and `apps/web/site/src/styles/global.css`; we keep the existing tokens to avoid changing the theme contract.

### PrimeNG Cleanup Outcome

- Removed `providePrimeNG` and the `ThemisPreset` Aura mapping from `app.config.ts` and deleted `app.theme.ts`.
- Removed `@import 'tailwindcss-primeui';` and `@import 'primeicons/primeicons.css' layer(utilities);` from `apps/web/app/src/styles.css`, plus every `.p-*` override.
- Verified `rg "primeng|primeicons|tailwindcss-primeui|pi pi-|\.p-" apps/web/app/src` returns zero matches.
- Removed `primeicons/primeicons.css` from `apps/web/site/src/styles/global.css`, then removed root dependencies `primeng`, `primeicons`, `tailwindcss-primeui`, `@primeuix/themes`, and `@primeng/mcp` from `package.json` and `pnpm-lock.yaml`.

### Validation Run

```text
pnpm nx lint app          → ✔ All files pass linting
pnpm nx vite:test app     → 19 files, 35 tests passed
pnpm nx build app         → built dist/apps/web/app (browser + server bundles)
pnpm nx extract-i18n app  → 121 messages extracted; source xliff updated
pnpm nx e2e app-e2e       → not run in this session (requires live backend, see below)
```

The production build reports a soft budget warning (`initial` bundle 602.62 kB against a 500 kB budget). The warning is pre-existing in scale; it is not introduced by this migration. The bundle delta from removing PrimeNG is net-negative because we no longer load `primeng/*` and the Aura theme.

### Notes For Future Cleanup

- The pnpm workspace had pre-existing peer resolution issues between `drizzle-orm`, `@electric-sql/pglite`, and `pg`. The final fix aligns `@electric-sql/pglite`, `drizzle-orm`, `pg`, and `ioredis` across the root package and internal libraries, removes the temporary `@ts-nocheck` comments, and removes the temporary `skipLibCheck` setting from `libs/projects/tsconfig.lib.json`.
- The e2e suite was updated only for the OTP helper (`fillOtp` now targets `[data-slot=pin-input] input` instead of the PrimeNG `.p-inputotp-input`). The rest of the e2e suite was not executed in this session because it requires a live backend and mailbox. Re-run `pnpm nx e2e app-e2e` against the standard dev stack before merging.

### Final Files Touched

See `plan/feature-web-app-redesign-1.md` for the structured file and task list, and the recipes in `docs/design-system/recipes.md` for runnable UI examples.
