# PASSKEY-002 RUN-264 validation

This is the current versioned validation attempt. The runner records only
application-derived stateful HTTP observations; Schemathesis remains limited
to the independent passkey `registration-begin` and `authentication-begin`
operations. Complete operations are not represented as fabricated
Schemathesis cases.

## Runner change

`apps/web/api-e2e/src/support/run-openapi-contract.ts` now emits:

- `passkey-stateful-http.json` with exact total, passed, and failed counts.
- `passkey-stateful.junit.xml` for the observed stateful cases.
- `passkey-stateful.har.json` containing sanitized observed request/response
  traffic.

The sanitizer removes terminal control sequences and report output is kept
free of absolute `dist` paths.

## Verification

Exact successful checks:

```text
pnpm exec nx lint api-e2e --skip-nx-cache
git diff --check -- apps/web/api-e2e/src/support/run-openapi-contract.ts
```

The required real-HTTP runner was attempted with a fresh PostgreSQL database:

```text
SCHEMATHESIS_INCLUDE_PATH_REGEX='^/auth/passkey/(registration|authentication)/' DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/themis_passkey_run264 DATABASE_DRIVER=pg OPAQUE_SYNC_STORAGE=durable PZS005_RUN_ID=RUN-264 PZS005_ARTIFACT_DIR=docs/verification/passkey-002-run-264/openapi GATEWAY_PORT=8114 node --experimental-strip-types apps/web/api-e2e/src/support/run-openapi-contract.ts
```

Result: blocked before Schemathesis. The stateful fixture reached real
registration begin/complete and verification HTTP calls, then the API
returned `reauthentication_required` while establishing a second registration
challenge. No JUnit/HAR pass is claimed and no stateful case count is claimed
for this incomplete run. The retained raw files document the observed
traffic and blocker.

The earlier Nx-wrapped attempt also exposed a separate pre-existing PGlite
bootstrap failure from the mixed-worktree later-password migration. That
migration is outside PASSKEY-002 validation scope and was not changed.

No PASSKEY-002 review was requested because the required API and security
categories remain blocked. Angular, PASSKEY-012, and PASSKEY-013 files were
not modified by this validation fix.
