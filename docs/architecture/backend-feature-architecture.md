# Backend Feature Architecture

## Purpose

Define the preferred API and server structure for Themis after the backend refactor.

## Directory Shape

Use feature-first folders at the top of `apps/web/api/src/`:

- `auth/`
- `activation/`
- `projects/`
- `jobs/`
- `realtime/`
- `testing/`

Use `shared/` only for cross-feature backend infrastructure:

- `shared/config/`
- `shared/db/`
- `shared/http/`

Use `libs/shared/` for cross-runtime utilities shared by API and server:

- env loading
- session helpers
- HTTP error utilities
- logger
- realtime bus and shared event types

## Feature Pattern

Each feature should prefer plain module exports rather than factories or builder wrappers.

Recommended feature contents:

- `feature-router.ts`
- `feature-service.ts`
- `feature-schemas.ts`
- `feature-types.ts`

Recommended pattern:

- feature-local schemas live next to the feature
- service functions are exported directly from the service module
- the feature router is exported as a configured `Router` constant
- shared middleware is imported from other modules, not recreated per feature

## Example Shape

For auth:

- `auth/auth-router.ts`
- `auth/auth-service.ts`
- `auth/auth-schemas.ts`
- `auth/auth-types.ts`
- `auth/auth-middleware.ts`

For projects:

- `projects/projects-router.ts`
- `projects/projects-service.ts`
- `projects/projects-schemas.ts`
- `projects/projects-types.ts`

## Validation Pattern

All route input validation must use Zod v4.

Use the typed middleware from `shared/http/route-schemas.ts`:

- `validateRequest({ body })`
- `validateRequest({ query })`
- `validateRequest({ params })`
- `validateRequest({ headers })`

Read parsed values with:

- `getValidated(req)`

## OpenAPI Pattern

Each feature owns its OpenAPI path metadata next to the feature schemas.

Examples:

- `auth/auth-schemas.ts` exports `authOpenApiPaths`
- `projects/projects-schemas.ts` exports `projectsOpenApiPaths`
- `activation/activation-schemas.ts` exports `activationOpenApiPaths`

The shared document builder under `shared/http/openapi.ts` composes all feature path objects into one document.

## Runtime Pattern

API runtime:

- `app.ts` wires middleware and mounts feature routers
- features are imported directly from their folders
- environment comes from `shared/env.ts`

Server runtime:

- keep gateway and realtime concerns in `apps/web/server/src/`
- use `shared` for common runtime facilities such as env, logger, sessions, and realtime bus

## Do Not Do

- do not put all backend code in `src/lib/`
- do not add `buildXRouter` or `createXService` wrappers for normal feature modules
- do not split schemas away from the feature they describe
- do not redefine auth guards or account context logic in every feature
