# Themis Web App Redesign — Validation Plan

## Static Validation

1. `pnpm nx lint app`
2. `pnpm nx test app`
3. `pnpm nx build app`
4. `pnpm nx e2e app-e2e`

## Route Validation

Routes to validate after migration:

- `/app/sign-in`
- `/app/sign-up`
- `/app/verify-email`
- `/app/verify-device`
- `/app/forgotten-password`
- `/app/activation`
- `/app/`
- `/app/projects`
- `/app/projects/new`
- `/app/projects/:projectId`

## Accessibility Validation

- AXE checks pass on migrated route families.
- Auth forms keep explicit labels.
- Error messages are associated with fields.
- Mobile navigation is keyboard accessible.
- Dialog/dropdown interactions support escape and focus restoration.
- Focus order remains predictable after visual refactors.

## Visual Validation

Compare migrated screens against `resources/open-design/themis-app` references:

- Mobile: 360px and 390px.
- Tablet: 768px.
- Desktop: 1280px and 1440px.
- Light mode.
- Dark mode.
- First render before theme hydration.

## PrimeNG Removal Checklist

- No remaining `primeng/*` imports.
- No remaining `primeicons` usage.
- No remaining `.p-*` global overrides.
- `tailwindcss-primeui` removed when safe.
- `primeng` and `primeicons` removed when safe.

## Regression Checklist

- Auth flows still sign in, sign up, verify, and handle errors.
- Activation flow still protects app access.
- Projects list, create, and detail flows still work.
- Theme behavior remains stable across auth and app routes.
- SSR build succeeds after browser-only logic remains guarded.
