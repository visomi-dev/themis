# UI Snapshot Grid

Structured Playwright snapshots for the post-refactor UI review pass.

## Layout

```
media/ui-snapshots/
├── site-en-home-{375,768,1280}-{light,dark}.png        # 12 site PNGs
└── auth-{sign-in,sign-up,forgotten-password,
          verify-email,verify-device,reset-password}-
    {360,390,520,768,1280}-{light,dark}.png            # 60 auth PNGs
```

## Surfaces

- **Site** (`apps/web/site`, Astro): `/en/`, `/es/` at 375/768/1280, light + dark.
- **Auth** (`apps/web/app`, Angular): the six auth routes at 360/390/520/768/1280, light + dark.

The grid intentionally omits `/docs/` for now; the docs route is documented as a P3 follow-up in the post-refactor UI review spec.

## Regenerate

The capture script lives at [`scripts/capture-ui-snapshots.cjs`](../../scripts/capture-ui-snapshots.cjs). It detects whether each half of the gateway is reachable and skips the unreachable half with a clear log instead of failing the rest.

### Site half

The Astro site needs the dev server (the `astro preview` server does not serve the `_astro/` static assets).

```bash
pnpm exec astro dev --root apps/web/site --host 127.0.0.1 --port 8083 &
SITE_BASE_URL=http://127.0.0.1:8083 node scripts/capture-ui-snapshots.cjs
```

### Auth half

The auth routes need the full gateway up:

```bash
pnpm exec nx run-many -t build --projects server,realtime,worker,api,app,site --configuration production
node dist/apps/web/server/main.js &
AUTH_BASE_URL=http://127.0.0.1:8081 node scripts/capture-ui-snapshots.cjs
```

The script waits for each route with `domcontentloaded` + a 400ms settle so SSR-rendered HTML is captured before any client-only hydration effects.

## Review

The snapshots are evidence for the audit checklist in [`docs/specs/2026-06-27-post-refactor-ui-review/sdd.md`](../../docs/specs/2026-06-27-post-refactor-ui-review/sdd.md). Open the relevant PNG next to the corresponding checklist row to verify the post-fix state.

## Companion artifact

The auth flow recordings live at [`../auth-flow-videos/`](../auth-flow-videos/). The snapshot grid covers static states; the recordings cover the interactive flow.
