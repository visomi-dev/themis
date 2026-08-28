# PASSKEY-002 RUN-265 evidence

This directory contains sanitized evidence for the PASSKEY-002 backend passkey
enrollment, verification, authentication, and runner compatibility work.
Angular, PASSKEY-012, PASSKEY-013, and unrelated mixed-worktree files are
excluded.

## Results

- Stateful real-HTTP contract: 20/20 passed across all required registration,
  verification, and authentication routes, including negative security cases.
- OpenAPI examples: 4/4 passed.
- Schemathesis fuzz: 2 begin operations exercised; this is separate from the
  stateful HTTP contract report and does not claim to cover its 20 cases.
- OpenAPI coverage and fuzzing: 96/96 passed.
- PostgreSQL persistence rollback: 2/2 failure-injection cases returned HTTP
  500 with unchanged persisted state.
- Raw artifact scans: 2 files scanned in each raw directory; zero findings.
- Complete evidence scan: 28 report files scanned; zero findings.
- Reports contain no ANSI escape sequences or absolute workspace paths.

## Commands

```text
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/themis_passkey_run265 DATABASE_DRIVER=pg OPAQUE_SYNC_STORAGE=durable PZS005_RUN_ID=RUN-265 PZS005_ARTIFACT_DIR=docs/verification/passkey-002-run-265/openapi GATEWAY_PORT=8120 pnpm exec nx run api-e2e:openapi --skip-nx-cache

DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/themis_passkey_run265 DATABASE_DRIVER=pg OPAQUE_SYNC_STORAGE=durable PZS005_RUN_ID=RUN-265 PZS005_ARTIFACT_DIR=docs/verification/passkey-002-run-265/fuzz GATEWAY_PORT=8121 pnpm exec nx run api-e2e:openapi-fuzz --skip-nx-cache

pnpm exec node --experimental-strip-types scripts/operational-workspace-security-scan.ts docs/verification/passkey-002-run-265/openapi/openapi-report docs/verification/passkey-002-run-265/fuzz/openapi-report docs/verification/passkey-002-run-265/registration-rollback.json docs/verification/passkey-002-run-265/verification-rollback.json
```

## Artifacts

- `openapi/openapi-report/passkey-stateful-http.json` and
  `fuzz/openapi-report/passkey-stateful-http.json` contain the 20-case
  runner-generated stateful HTTP contract report.
- `openapi/openapi-report/passkey-stateful.junit.xml` and
  `fuzz/openapi-report/passkey-stateful.junit.xml` are JUnit renderings of
  those observed HTTP results, not Schemathesis output.
- `openapi/openapi-report/passkey-stateful.har.json` and
  `fuzz/openapi-report/passkey-stateful.har.json` contain sanitized HAR output
  for the same observations.
- `openapi/openapi-report/` contains deterministic Schemathesis examples and
  sanitized raw HTTP evidence; its JUnit report covers the two begin
  operations only (`junit-20260827T175053Z.xml` and
  `har-20260827T175053Z.json`).
- `fuzz/openapi-report/` contains Schemathesis examples, coverage, fuzzing,
  and sanitized raw HTTP evidence; its JUnit report covers the two begin
  operations only (`junit-20260827T175117Z.xml` and
  `har-20260827T175117Z.json`).
- `registration-rollback.json` and `verification-rollback.json` contain the
  PostgreSQL rollback observations.

## Known verification limits

- The default in-memory composed runner remains blocked by the known PGlite
  migration error: `cannot insert multiple commands into a prepared statement`.
- Existing `server-e2e:e2e` sync/auth failures remain unrelated to this work.
