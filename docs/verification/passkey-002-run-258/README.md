# PASSKEY-002 RUN-258 evidence

This directory contains the sanitized, current-run evidence for the
PASSKEY-002 recovery after REVW-199. Product scope is unchanged; Angular,
PASSKEY-012, PASSKEY-013, and unrelated mixed-worktree files are not part of
this implementation.

## Atomicity execution

Exact command:

```text
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/themis DATABASE_DRIVER=pg OPAQUE_SYNC_STORAGE=durable GATEWAY_PORT=8088 WEBAUTHN_ORIGIN=http://localhost:8080 PASSKEY_ATOMICITY_ARTIFACT_DIR=docs/verification/passkey-002-run-258 pnpm exec nx run api-e2e:test --skip-nx-cache --runInBand --testPathPatterns=passkey-atomicity.spec.ts
```

Result: exit 0; Nx reported the target succeeded, Jest reported 1 suite and
2 tests passed. The retained JSON shows HTTP 500 and unchanged persisted
state for both registration linkage and email-verification activation:

- `registration-rollback.json`: challenge remains unconsumed, credential
  linkage remains null, enrollment remains pending, credential count remains 0.
- `verification-rollback.json`: email verification and challenge consumption
  remain null, enrollment remains pending, and the existing credential remains
  present.

## Current-run API artifacts

OpenAPI artifacts are under `openapi/openapi-report/`. The generated schema
contains all four PASSKEY-002 ceremony routes and the JUnit report contains 4
passing operations. `passkey-smoke-summary.json` records 19 observed real-HTTP
cases covering pending enrollment, activation, pre-verification denial,
success, expiry/mismatch/replay, origin/RP binding, enumeration equivalence,
and cross-account isolation.

Fuzz artifacts are under `fuzz/openapi-report/`. Its schema contains the same
four ceremony routes and its JUnit report contains 4 passing operations. Its
smoke summary records the same 19 observed real-HTTP cases.

## Security scans

Exact commands and results:

```text
pnpm exec node --experimental-strip-types scripts/operational-workspace-security-scan.ts docs/verification/passkey-002-run-258/openapi/openapi-report/raw
```

PASS; 2 files scanned; findings `[]`.

```text
pnpm exec node --experimental-strip-types scripts/operational-workspace-security-scan.ts docs/verification/passkey-002-run-258/fuzz/openapi-report/raw
```

PASS; 2 files scanned; findings `[]`.

```text
pnpm exec node --experimental-strip-types scripts/operational-workspace-security-scan.ts docs/verification/passkey-002-run-258
```

PASS; 25 files scanned; findings `[]`.

## Literal P1-P9 phase matrix

| Phase | Work item ID(s)          | Before RUN-258                       | Before coverage/gaps                               | After RUN-258                             | After coverage/gaps                                                     |
| ----- | ------------------------ | ------------------------------------ | -------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| P1    | PASSKEY-010              | done                                 | Research and threat decisions complete             | done                                      | Unchanged; no gap                                                       |
| P2    | PASSKEY-011              | done                                 | Prototype/evaluation complete                      | done                                      | Unchanged; no gap                                                       |
| P3    | PASSKEY-001, PASSKEY-002 | PASSKEY-001 done; PASSKEY-002 rework | Current API artifact provenance gap                | PASSKEY-001 done; PASSKEY-002 in_progress | Current API and rollback artifacts retained; pending independent review |
| P4    | PASSKEY-001, PASSKEY-002 | PASSKEY-001 done; PASSKEY-002 rework | Current API artifact provenance gap                | PASSKEY-001 done; PASSKEY-002 in_progress | Current API and rollback artifacts retained; pending independent review |
| P5    | PASSKEY-003              | rework                               | Angular sign-up remains incomplete                 | rework                                    | Unchanged; out of scope                                                 |
| P6    | PASSKEY-003              | rework                               | Angular sign-in remains incomplete                 | rework                                    | Unchanged; out of scope                                                 |
| P7    | PASSKEY-012              | ready                                | Password configuration deferred                    | ready                                     | Unchanged; explicitly excluded                                          |
| P8    | PASSKEY-013              | ready                                | Credential lifecycle deferred                      | ready                                     | Unchanged; explicitly excluded                                          |
| P9    | PASSKEY-004              | rework                               | Integral verification awaits implementation slices | rework                                    | Unchanged; independent verifier remains owner                           |

No phase was omitted or newly discovered. PASSKEY-005/006/007 remain enabling
items and are not new phase coverage claims.

## Validation matrix

| Category    | Exact command/check                                                                                                                                                                                                           | Result                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| unit        | `pnpm exec nx run api:test --skip-nx-cache`                                                                                                                                                                                   | PASS: 5 suites, 50 tests                                                                        |
| api         | `PZS005_RUN_ID=RUN-258 PZS005_ARTIFACT_DIR=docs/verification/passkey-002-run-258/openapi GATEWAY_PORT=8086 OPAQUE_SYNC_STORAGE=memory pnpm exec nx run api-e2e:openapi --skip-nx-cache`                                       | PASS: 4/4 OpenAPI operations; 19 smoke cases observed; retained report above                    |
| app-e2e     | No Angular route changed; PASSKEY-003 owns browser behavior                                                                                                                                                                   | NOT APPLICABLE                                                                                  |
| gateway-e2e | `pnpm exec nx run server-e2e:e2e --skip-nx-cache`                                                                                                                                                                             | PASS: 1 suite, 5 tests                                                                          |
| site-e2e    | No public Astro route changed                                                                                                                                                                                                 | NOT APPLICABLE                                                                                  |
| visual      | Backend-only item renders no UI                                                                                                                                                                                               | NOT APPLICABLE                                                                                  |
| security    | `PZS005_RUN_ID=RUN-258 PZS005_ARTIFACT_DIR=docs/verification/passkey-002-run-258/fuzz GATEWAY_PORT=8087 OPAQUE_SYNC_STORAGE=memory pnpm exec nx run api-e2e:openapi-fuzz --skip-nx-cache`, plus the three scan commands above | PASS: 4/4 fuzz operations; 25-file sanitization scan and both raw scans PASS with zero findings |
| build       | `pnpm exec nx run api:lint --skip-nx-cache && pnpm exec nx run api:build --configuration=production --skip-nx-cache && pnpm exec nx run server:build --configuration=production --skip-nx-cache`                              | PASS                                                                                            |

Additional required check: `node --experimental-strip-types --test
scripts/plan-fidelity.test.ts` — PASS, 6/6 tests.
