# PASSKEY-002 RUN-257 evidence

This report versions the sanitized current-run evidence required by REVW-198.
Product scope is unchanged; no Angular,
PASSKEY-012, or PASSKEY-013 files were changed. The existing rollback JSON is
retained at the root of this report and the current OpenAPI and fuzz outputs
are retained in separate tracked directories.

## Atomicity execution

Exact command:

```text
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/themis DATABASE_DRIVER=pg OPAQUE_SYNC_STORAGE=durable GATEWAY_PORT=8083 WEBAUTHN_ORIGIN=http://localhost:8080 PASSKEY_ATOMICITY_ARTIFACT_DIR=docs/verification/passkey-002-run-257 pnpm exec nx run api-e2e:test --skip-nx-cache --runInBand --testPathPatterns=passkey-atomicity.spec.ts
```

Exact result: exit 0; Nx reported `Successfully ran target test for project
api-e2e and 8 tasks it depends on`; Jest reported `Test Suites: 1 passed, 1
total`, `Tests: 2 passed, 2 total`, `Snapshots: 0 total`, and `Ran all test
suites matching passkey-atomicity.spec.ts`.

Retained sanitized results:

- `registration-rollback.json`: HTTP 500; consumed challenge remains null,
  enrollment credential remains null, enrollment remains pending, and
  credential count remains 0.
- `verification-rollback.json`: HTTP 500; email verification and challenge
  consumption remain null, enrollment remains pending, and the existing
  credential remains present.

## Current-run retained API artifacts

The current OpenAPI run is retained under
`openapi/openapi-report/`: `run-256-openapi-schema.json`,
`junit-20260827T013450Z.xml`, `har-20260827T013450Z.json`,
`sync-case-matrix.json`, `raw/http-responses.json`, `raw/server.log`, and
`raw-scan-result.json`. Result: 12/12 operations and 1065/1065 cases passed;
the report records the two known Schemathesis warnings.

The current fuzz run is retained under `fuzz/openapi-report/`:
`run-256-openapi-schema.json`, `junit-20260827T013524Z.xml`,
`har-20260827T013524Z.json`, `sync-case-matrix.json`,
`raw/http-responses.json`, `raw/server.log`, and `raw-scan-result.json`.
Result: 2/2 selected operations and 84/84 cases passed, including fuzzing;
the report records the expected missing-authentication warning.

## Security scans

Exact commands and results:

```text
pnpm exec node --experimental-strip-types scripts/operational-workspace-security-scan.ts docs/verification/passkey-002-run-257/openapi/openapi-report/raw
```

`status: PASS`, `filesScanned: 2`, `findings: []`.

Additional complete-directory sanitization check for the versioned artifact
set:

```text
pnpm exec node --experimental-strip-types scripts/operational-workspace-security-scan.ts docs/verification/passkey-002-run-257
```

`status: PASS`, `filesScanned: 29`, `findings: []`.

```text
pnpm exec node --experimental-strip-types scripts/operational-workspace-security-scan.ts docs/verification/passkey-002-run-257/fuzz/openapi-report/raw
```

`status: PASS`, `filesScanned: 2`, `findings: []`.

## Literal P1-P9 phase matrix

| Phase | Work item ID(s)          | Before REVW-198                      | Before coverage/gaps                                                       | After RUN-257                             | After coverage/gaps                                                                    |
| ----- | ------------------------ | ------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------- |
| P1    | PASSKEY-010              | done                                 | Research and threat decisions complete                                     | done                                      | unchanged; no gap                                                                      |
| P2    | PASSKEY-011              | done                                 | Prototype/evaluation complete                                              | done                                      | unchanged; no gap                                                                      |
| P3    | PASSKEY-001, PASSKEY-002 | PASSKEY-001 done; PASSKEY-002 rework | Contract complete; current-run artifact provenance gap                     | PASSKEY-001 done; PASSKEY-002 in_progress | Atomicity execution and current-run API artifacts retained; pending independent review |
| P4    | PASSKEY-001, PASSKEY-002 | PASSKEY-001 done; PASSKEY-002 rework | Activation contract/implementation had current-run artifact provenance gap | PASSKEY-001 done; PASSKEY-002 in_progress | Atomicity execution and current-run API artifacts retained; pending independent review |
| P5    | PASSKEY-003              | rework                               | Angular sign-up scope remains incomplete                                   | rework                                    | unchanged; out of scope                                                                |
| P6    | PASSKEY-003              | rework                               | Angular sign-in scope remains incomplete                                   | rework                                    | unchanged; out of scope                                                                |
| P7    | PASSKEY-012              | ready                                | Password configuration deferred                                            | ready                                     | unchanged; explicitly excluded                                                         |
| P8    | PASSKEY-013              | ready                                | Credential lifecycle UI/API deferred                                       | ready                                     | unchanged; explicitly excluded                                                         |
| P9    | PASSKEY-004              | rework                               | Integral verification waits for implementation slices                      | rework                                    | unchanged; independent verifier remains owner                                          |

No phase was omitted or newly discovered. PASSKEY-005/006/007 remain enabling
items for P3/P4 and are not new phase coverage claims.

## Validation matrix

| Category    | Exact command/check                                                                                                                                                                                 | Result                                                         |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| unit        | `pnpm exec nx run api:test --skip-nx-cache`                                                                                                                                                         | PASS: 5 suites, 50 tests                                       |
| api         | `PZS005_RUN_ID=RUN-257 PZS005_ARTIFACT_DIR=docs/verification/passkey-002-run-257/openapi GATEWAY_PORT=8084 pnpm exec nx run api-e2e:openapi --skip-nx-cache`                                        | PASS: 12/12 operations, 1065/1065 cases; retained report above |
| app-e2e     | No Angular route changed; PASSKEY-003 owns this behavior                                                                                                                                            | NOT APPLICABLE                                                 |
| gateway-e2e | `pnpm exec nx run server-e2e:e2e --skip-nx-cache`                                                                                                                                                   | PASS: 1 suite, 5 tests                                         |
| site-e2e    | No public Astro route changed                                                                                                                                                                       | NOT APPLICABLE                                                 |
| visual      | Backend-only item renders no UI                                                                                                                                                                     | NOT APPLICABLE                                                 |
| security    | Both exact scan commands above, plus `PZS005_RUN_ID=RUN-257 PZS005_ARTIFACT_DIR=docs/verification/passkey-002-run-257/fuzz GATEWAY_PORT=8085 pnpm exec nx run api-e2e:openapi-fuzz --skip-nx-cache` | PASS: 84/84 fuzz cases; both scans PASS with zero findings     |
| build       | `pnpm exec nx run api:lint --skip-nx-cache && pnpm exec nx run api:build --configuration=production --skip-nx-cache && pnpm exec nx run server:build --configuration=production --skip-nx-cache`    | PASS                                                           |

Additional required plan-fidelity check: `node --experimental-strip-types --test
scripts/plan-fidelity.test.ts` — PASS, 6/6 tests.
