# themis

Developer-first task system monorepo built with Nx.

This workspace combines:

- `apps/web/site` - Astro public landing site
- `apps/web/app` - Angular web application scaffold
- `apps/web/api` - Express API for domain endpoints
- `apps/web/server` - Node composition server that mounts the site and API behind one runtime
- `apps/web/site-e2e` - Playwright smoke coverage for the Astro site
- `apps/web/app-e2e` - Playwright smoke coverage for the Angular app
- `apps/web/api-e2e` - Jest-based API end-to-end coverage
- `apps/web/server-e2e` - Jest-based composition server end-to-end coverage

## Architecture

The current repository direction is a monolith-style deployment with modular Nx apps:

- Astro handles the public marketing surface
- Angular is the richer application surface for the product UI
- Express owns backend endpoints under `/api`
- `apps/web/server` is the single Node entry point used to compose the site and API

This keeps the repo ready for future expansion into additional clients while preserving a single deployable runtime today.

## Workspace Projects

```text
apps/web/
├── api/        Express API
├── api-e2e/    API end-to-end tests
├── app/        Angular application
├── app-e2e/    App end-to-end tests
├── server/     Node gateway/composition server
├── server-e2e/ Server composition end-to-end tests
├── site/       Astro landing site
└── site-e2e/   Playwright smoke tests for the site
```

## Requirements

- Node.js
- pnpm

Install dependencies:

```bash
pnpm install
```

## Local Development

### Astro site only

```bash
pnpm nx run site:serve
```

### Angular app only

```bash
pnpm nx run app:serve
```

### API only

```bash
pnpm nx run api:serve
```

### Full composed server

```bash
pnpm nx run server:serve
```

## Verification

```bash
pnpm nx show projects
pnpm nx affected -t lint
pnpm nx run-many -t build
pnpm nx run site:typecheck
pnpm nx run api-e2e:e2e
pnpm nx run server-e2e:e2e
```

## Documentation

- `docs/overview.md`
- `docs/product/prd.md`
- `docs/architecture/system-architecture.md`
- `docs/design/visual-discovery.md`

## Notes

- `.husky/pre-commit` runs `pnpm nx affected -t lint`
- Commit messages are validated by Commitlint via `.husky/commit-msg`
- The current Angular app is intentionally scaffold-level while the domain implementation is defined in `docs/`
