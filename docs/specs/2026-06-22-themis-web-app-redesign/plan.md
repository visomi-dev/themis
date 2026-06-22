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
