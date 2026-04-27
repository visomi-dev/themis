# themis

Developer-first task system monorepo built with Nx.

This workspace combines:

- `apps/web/site` - Astro public landing site
- `apps/web/app` - Angular web application scaffold
- `apps/web/api` - Express API for domain endpoints
- `apps/worker` - BullMQ worker runtime for background feature processing
- `apps/web/realtime` - Socket.IO realtime runtime
- `apps/web/server` - public web server that mounts API, app, site, realtime, and worker startup
- `apps/web/site-e2e` - Playwright smoke coverage for the Astro site
- `apps/web/app-e2e` - Playwright smoke coverage for the Angular app
- `apps/web/api-e2e` - Jest-based API end-to-end coverage
- `apps/web/server-e2e` - Jest-based composition server end-to-end coverage

## Architecture

The current repository direction is a gateway-led deployment with modular Nx apps:

- Astro handles the public marketing surface
- Angular is the richer application surface for the product UI
- Express owns backend endpoints under `/api`
- `apps/worker` owns BullMQ background processing
- `apps/web/realtime` owns Socket.IO feature code behind `/socket.io`
- `apps/web/server` is the public Node web server used to mount API, site, app, and realtime on one HTTP server

This keeps the repo ready for future expansion into additional clients while preserving a single public entry point.

## Workspace Projects

```text
apps/
├── worker/     BullMQ worker runtime
apps/web/
├── api/        Express API
├── api-e2e/    API end-to-end tests
├── app/        Angular application
├── app-e2e/    App end-to-end tests
├── realtime/   Socket.IO realtime runtime
├── server/     Node gateway/proxy server
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

### Worker only

```bash
pnpm nx run worker:serve
```

### Realtime only

```bash
pnpm nx run realtime:serve
```

### Full backend stack via gateway

```bash
pnpm nx run server:serve
```

This starts `apps/web/server`, which manages the backend stack for local development:

- `api`
- `worker` as a managed child process
- `realtime`
- `server` gateway

The server preserves `/socket.io` as the public websocket path on the same HTTP server used by `/api`, `/app`, and `/`.

## Docker

Build the production image:

```bash
docker build -t themis .
```

Run the monolith container:

```bash
docker run --rm -p 8080:8080 themis
```

The container starts `dist/apps/web/server/main.js`, which manages the full backend stack inside one image:

- `api`
- `worker` as a managed child process
- `realtime`
- `server` gateway

The public surface remains monolithic:

- website via `/`
- web app via `/app`
- API via `/api`
- websocket traffic via `/socket.io`

Health endpoint:

```bash
curl http://localhost:8080/healthz
```

Expected response:

```json
{ "status": "ok" }
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
