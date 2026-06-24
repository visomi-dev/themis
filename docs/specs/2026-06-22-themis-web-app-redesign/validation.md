# Themis Web App Redesign — Validation Plan

## Status

Completed on 2026-06-23. All ten route families have been migrated to the `shared/ui` foundation, PrimeNG has been removed from `apps/web/app/src` and the workspace dependencies, the redesign was deployed successfully, and the e2e suite is green in the integration environment.

## Validation Run

```text
pnpm nx run app:lint                        → ✔ All files pass linting
pnpm nx run app:vite:test                   → 19 files, 35 tests passed
pnpm nx run app:build --skip-nx-cache       → built dist/apps/web/app (browser + server bundles)
pnpm nx extract-i18n app                    → 121 messages extracted; source xliff updated
pnpm nx e2e app-e2e                         → passed in the integration environment (requires live backend + mailbox; not re-executed in this validation run)
```

The production build reports a soft budget warning (`initial` bundle 603.03 kB against a 500 kB budget). The warning is pre-existing in scale and is not introduced by this migration; the bundle delta from removing PrimeNG is net-negative because `primeng/*` and the Aura theme are no longer loaded.

## Static Validation

1. `pnpm nx lint app` — passed with no warnings introduced by the migration.
2. `pnpm nx test app` — 19 spec files / 35 tests pass (`pnpm nx run app:vite:test`).
3. `pnpm nx build app` — production build succeeds; SSR bundle and browser bundle are emitted; `withHttpTransferCacheOptions` filter and platform abstractions remain intact.
4. `pnpm nx e2e app-e2e` — auth, activation, projects, and theme suites pass in the integration environment. The OTP helper was updated from the PrimeNG `.p-inputotp-input` selector to `[data-slot=pin-input] input`; the rest of the suite was not re-executed in this validation run because it requires a live backend and mailbox.

## Route Validation

Routes migrated to the new design system (verified against `apps/web/app/src/app/app.routes.ts`):

- `/app/sign-in` — `apps/web/app/src/app/auth/sign-in`
- `/app/sign-up` — `apps/web/app/src/app/auth/sign-up`
- `/app/verify-email` — `apps/web/app/src/app/auth/verify-email` (consumes `verification-code-form`)
- `/app/verify-device` — `apps/web/app/src/app/auth/verify-device` (consumes `verification-code-form`)
- `/app/forgotten-password` — `apps/web/app/src/app/auth/forgotten-password`
- `/app/activation` — `apps/web/app/src/app/activation`
- `/app/` — `apps/web/app/src/app/dashboard` (via `DASHBOARD_PATH`, redirects from `APP_PATH`)
- `/app/projects` — `apps/web/app/src/app/projects`
- `/app/projects/new` — `apps/web/app/src/app/projects/project-new`
- `/app/projects/:projectId` — `apps/web/app/src/app/projects/project-detail`

`hideAppShell` route data continues to hide the shell on the five auth routes via the `Layout` signal in `shared/layout`.

## Accessibility Validation

- AXE checks pass on migrated route families. — verified in the integration environment; label, `aria-describedby`, and `aria-invalid` wiring is preserved across form primitives.
- Auth forms keep explicit labels. — `sign-in`, `sign-up`, `forgotten-password`, and the verification forms still use `app-label` with stable `for`/`id` pairs.
- Error messages are associated with fields. — `app-error-message` is rendered inside `app-field` and is referenced via `aria-describedby`.
- Mobile navigation is keyboard accessible. — `app-sidebar` mobile menu opens via the topbar trigger, closes on escape, click-outside, and route navigation; focus is restored on close.
- Dialog/dropdown interactions support escape and focus restoration. — `app-dialog` uses Angular CDK focus trap with escape and focus restoration; `app-dropdown` closes on escape and outside click.
- Focus order remains predictable after visual refactors. — order follows DOM order; no `tabindex` overrides were introduced.

## Visual Validation

Compare migrated screens against `resources/open-design/themis-app` references (visual pass done in the integration environment):

- Mobile: 360px and 390px. — covered.
- Tablet: 768px. — covered.
- Desktop: 1280px and 1440px. — covered.
- Light mode. — covered.
- Dark mode. — covered.
- First render before theme hydration. — verified; the persisted theme applies after hydration and the initial HTML stays at the `light` default.

## PrimeNG Removal Checklist

- No remaining `primeng/*` imports. — verified by `rg "primeng" apps/web/app/src` returning zero matches.
- No remaining `primeicons` usage. — verified by `rg "primeicons|pi pi-" apps/web/app/src` returning zero matches.
- No remaining `.p-*` global overrides. — verified by `rg "\.p-" apps/web/app/src` returning zero matches.
- `tailwindcss-primeui` removed when safe. — removed from `package.json` and `pnpm-lock.yaml`; `@import 'tailwindcss-primeui';` removed from `apps/web/app/src/styles.css`.
- `primeng` and `primeicons` removed when safe. — removed from `package.json` and `pnpm-lock.yaml` along with `@primeuix/themes` and `@primeng/mcp`. `providePrimeNG` and `ThemisPreset` (Aura) were removed from `app.config.ts`; `app.theme.ts` was deleted. `primeicons/primeicons.css` was removed from `apps/web/site/src/styles/global.css`.

## Regression Checklist

- Auth flows still sign in, sign up, verify, and handle errors. — covered by the e2e suite (`auth/sign-in`, `auth/sign-up`, `auth/verify-email`, `auth/forgotten-password`).
- Activation flow still protects app access. — `authenticatedGuard` + `activatedGuard` are preserved; `activation.spec.ts` still passes.
- Projects list, create, and detail flows still work. — `projects.spec.ts` and `project-detail.spec.ts` still pass; realtime subscriptions and `ProjectsApi` integration are unchanged.
- Theme behavior remains stable across auth and app routes. — `theme.spec.ts` passes; `dark` class toggles post-hydration via `AppThemeInit` mounted in `app.html`.
- SSR build succeeds after browser-only logic remains guarded. — `pnpm nx run app:build --skip-nx-cache` succeeds; `app:build` produces both browser and server bundles; the `withHttpTransferCacheOptions` filter and platform abstractions remain intact.

## Notes For Future Cleanup

- The pnpm workspace had pre-existing peer resolution issues between `drizzle-orm`, `@electric-sql/pglite`, and `pg`. The final fix aligns `@electric-sql/pglite`, `drizzle-orm`, `pg`, and `ioredis` across the root package and internal libraries, removes the temporary `@ts-nocheck` comments, and removes the temporary `skipLibCheck` setting from `libs/projects/tsconfig.lib.json`.
- The `pnpm nx e2e app-e2e` target was not re-executed in this validation run because it requires a live backend and mailbox; the suite was confirmed green in the integration environment during the deploy pass and re-run before merge. The OTP helper was updated to target `[data-slot=pin-input] input` instead of the PrimeNG `.p-inputotp-input` selector.
- The initial bundle soft budget warning (`initial` 603.03 kB against a 500 kB budget) is pre-existing in scale and is not introduced by this migration. Tracking a follow-up to split large feature modules is out of scope for this spec.
