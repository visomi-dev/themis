# Auth fidelity pass evidence

Two `.webm` recordings of the full auth fidelity pass flow captured via Playwright on two viewports.

## Flows

For each viewport the script `scripts/capture-auth-flow.cjs` runs:

1. **Bootstrap** — open `/app/en/sign-in`
2. **Sign up** — link -> `/app/en/sign-up`, fill form, submit, read OTP, verify
3. **Skip first-run activation** (UI click) -> `/app/en/projects` (or `/dashboard`)
4. **Log out** — open user menu -> Sign out -> `/app/en/sign-in`
5. **Forgotten password** — link -> `/app/en/forgotten-password`, submit email, auto-navigate to `/app/en/reset-password`
6. **Password recovery** — enter OTP, enter new password + confirm, submit, success state
7. **Sign in with new password** — link -> `/app/en/sign-in`, submit credentials, read sign-in OTP, verify -> dashboard

All steps are driven through the UI (no `page.goto` after the cold-start bootstrap) with ~1 s pauses between actions. OTPs are fetched out-of-band via `GET /api/test/mailbox/latest` (Test API).

## Files

- `hd-1920x1080/auth-flow-hd-1920x1080.webm` — Desktop viewport (1920x1080)
- `iphone-13-mini/auth-flow-iphone-13-mini.webm` — iPhone 13 Mini viewport (375x812, iOS 16 user agent)

## Regenerate

```bash
# Boot the gateway first
pnpm exec nx run-many -t build --projects server,realtime,worker,api,app,site --configuration production
node dist/apps/web/server/main.js &

# Run the capture (writes here)
node scripts/capture-auth-flow.cjs
```

The recordings are deterministic relative to the seed (timestamp-based email + recordVideo) and will differ across runs.

## Companion artifact

The static-state snapshot grid for the same surfaces lives at [`../ui-snapshots/`](../ui-snapshots/). The recordings cover the interactive flow; the snapshot grid covers the static states at every viewport x theme.
