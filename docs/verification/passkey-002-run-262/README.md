# PASSKEY-002 RUN-262 evidence

This directory contains sanitized evidence for the current PASSKEY-002 run.
The implementation scope remains limited to the backend passkey enrollment,
verification, authentication, and runner compatibility work item. Angular,
PASSKEY-012, PASSKEY-013, and unrelated mixed-worktree files are excluded.

## Atomicity

Exact command:

```text
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/themis DATABASE_DRIVER=pg OPAQUE_SYNC_STORAGE=durable GATEWAY_PORT=8098 WEBAUTHN_ORIGIN=http://localhost:8080 PASSKEY_ATOMICITY_ARTIFACT_DIR=docs/verification/passkey-002-run-262 pnpm exec nx run api-e2e:test --skip-nx-cache --runInBand --testPathPatterns=passkey-atomicity.spec.ts
```

Result: PASS; 1 suite and 2 tests. Both supported HTTP failure-injection cases
returned 500 and retained unchanged persisted state. See
`registration-rollback.json` and `verification-rollback.json`.

## API and security artifacts

- `openapi/openapi-report/` contains the current real-HTTP smoke observations,
  schema, JUnit, HAR, raw responses, server log, and warning disposition.
- `fuzz/openapi-report/` contains the current examples, coverage, and fuzzing
  artifacts, with 96 generated cases and 96 passed.
- The Schemathesis JUnit reports contain the two state-independent begin
  operations. The tracked HTTP smoke report covers all four ceremony routes
  and 20 observed cases, including success and intentional negative
  responses; it is the source of truth for stateful complete operations.
- Warning dispositions are empty. Intentional 401/403/404/409 responses are
  recorded as expected security assertions, not failures.

Security scan commands:

```text
pnpm exec node --experimental-strip-types scripts/operational-workspace-security-scan.ts docs/verification/passkey-002-run-262/openapi/openapi-report/raw
pnpm exec node --experimental-strip-types scripts/operational-workspace-security-scan.ts docs/verification/passkey-002-run-262/fuzz/openapi-report/raw
pnpm exec node --experimental-strip-types scripts/operational-workspace-security-scan.ts docs/verification/passkey-002-run-262
```

Result: PASS; 2, 2, and 20 files scanned respectively; findings `[]`.

## Literal P1-P9 phase matrix

| Phase | Work item ID(s)          | Before RUN-262          | After RUN-262           | Gap/ownership              |
| ----- | ------------------------ | ----------------------- | ----------------------- | -------------------------- |
| P1    | PASSKEY-010              | done                    | done                    | unchanged                  |
| P2    | PASSKEY-011              | done                    | done                    | unchanged                  |
| P3    | PASSKEY-001, PASSKEY-002 | PASSKEY-002 in progress | PASSKEY-002 in progress | pending independent review |
| P4    | PASSKEY-001, PASSKEY-002 | PASSKEY-002 in progress | PASSKEY-002 in progress | pending independent review |
| P5    | PASSKEY-003              | rework                  | rework                  | Angular, out of scope      |
| P6    | PASSKEY-003              | rework                  | rework                  | Angular, out of scope      |
| P7    | PASSKEY-012              | ready                   | ready                   | explicitly excluded        |
| P8    | PASSKEY-013              | ready                   | ready                   | explicitly excluded        |
| P9    | PASSKEY-004              | rework                  | rework                  | independent owner          |

No phase was omitted or newly discovered.

## Validation matrix

| Category    | Exact command/check                                                                                                                                                                                                           | Result and artifact                                                                                                |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| unit        | `pnpm exec nx run api:test --skip-nx-cache`                                                                                                                                                                                   | PASS: 5 suites, 50 tests                                                                                           |
| api         | `PZS005_RUN_ID=RUN-262 PZS005_ARTIFACT_DIR=docs/verification/passkey-002-run-262/openapi GATEWAY_PORT=8099 OPAQUE_SYNC_STORAGE=memory pnpm exec nx run api-e2e:openapi --skip-nx-cache`                                       | PASS: 2/2 Schemathesis begin cases plus 20 real HTTP smoke cases across all four routes; `openapi/openapi-report/` |
| app-e2e     | No Angular route changed; PASSKEY-003 owns browser behavior                                                                                                                                                                   | NOT APPLICABLE                                                                                                     |
| gateway-e2e | `pnpm exec nx run server-e2e:e2e --skip-nx-cache`                                                                                                                                                                             | PASS: 1 suite, 5 tests                                                                                             |
| site-e2e    | No public Astro route changed                                                                                                                                                                                                 | NOT APPLICABLE                                                                                                     |
| visual      | Backend-only item renders no UI                                                                                                                                                                                               | NOT APPLICABLE                                                                                                     |
| security    | `PZS005_RUN_ID=RUN-262 PZS005_ARTIFACT_DIR=docs/verification/passkey-002-run-262/fuzz GATEWAY_PORT=8100 OPAQUE_SYNC_STORAGE=memory pnpm exec nx run api-e2e:openapi-fuzz --skip-nx-cache`, plus the three scan commands above | PASS: 96/96 fuzz cases; all scans zero findings; stateful negative cases are in the HTTP smoke report              |
| build       | `pnpm exec nx run api:lint --skip-nx-cache && pnpm exec nx run api:build --configuration=production --skip-nx-cache && pnpm exec nx run server:build --configuration=production --skip-nx-cache`                              | PASS                                                                                                               |

Additional check: `node --experimental-strip-types --test
scripts/plan-fidelity.test.ts` — PASS, 6/6 tests.
