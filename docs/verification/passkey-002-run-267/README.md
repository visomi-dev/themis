# PASSKEY-002 RUN-267 evidence

This is the current retained evidence for the PASSKEY-002 verification after
the PGlite migration separator correction.

## Commands and results

- `pnpm exec nx run api:test --skip-nx-cache`: 6 suites and 52 tests passed.
- `PZS005_RUN_ID=RUN-267 PZS005_ARTIFACT_DIR=docs/verification/passkey-002-run-267/openapi GATEWAY_PORT=8122 pnpm exec nx run api-e2e:openapi --skip-nx-cache`: 2 selected Schemathesis operations, 4 generated examples passed. The run emitted one bounded missing-test-data warning for `POST /auth/passkey/registration/begin`; see `openapi/openapi-report/openapi-warning-disposition.json`.
- `PZS005_RUN_ID=RUN-267 PZS005_ARTIFACT_DIR=docs/verification/passkey-002-run-267/fuzz GATEWAY_PORT=8123 pnpm exec nx run api-e2e:openapi-fuzz --skip-nx-cache`: 2 selected operations, coverage 2/2, fuzzing 2/2, and 96 generated cases passed with no issues. The same bounded warning is retained in the fuzz disposition file.
- `pnpm exec nx run server-e2e:e2e --skip-nx-cache`: 1 suite and 5 tests passed; the composed gateway booted successfully after the migration correction.
- `DATABASE_URL=postgresql://... DATABASE_DRIVER=pg OPAQUE_SYNC_STORAGE=durable DATABASE_AUTO_MIGRATE=true GATEWAY_PORT=8080 PORT=8080 PASSKEY_ATOMICITY_ARTIFACT_DIR=docs/verification/passkey-002-run-267 pnpm exec nx run api-e2e:test --skip-nx-cache --runInBand --testPathPatterns=passkey-atomicity.spec.ts`: 1 suite and 2 tests passed against the disposable PostgreSQL database; both injected failures returned HTTP 500 and left the persisted state unchanged.
- `pnpm exec nx run api:lint --skip-nx-cache && pnpm exec nx run api:build --configuration=production --skip-nx-cache && pnpm exec nx run server:build --configuration=production --skip-nx-cache`: all targets passed.
- `git diff --check && git diff --cached --check`: passed.

## Stateful coverage

The runner-generated stateful report is separate from Schemathesis. It contains
20/20 observed real-HTTP cases across registration begin/complete, verification,
authentication, and account-enumeration equivalence. It is retained at:

- `openapi/openapi-report/passkey-stateful-http.json`
- `fuzz/openapi-report/passkey-stateful-http.json`

The stateful reports are explicitly marked `schemathesis: false`; they are not
counted as Schemathesis operations.

## P3-P9 traceability

| Phase | Work item   | Current evidence                                                                          | Gap or boundary                                                                                   |
| ----- | ----------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| P3    | PASSKEY-002 | RUN-267 stateful registration begin/complete and pending enrollment                       | Schemathesis generated contract selects begin operations only; complete coverage is stateful HTTP |
| P4    | PASSKEY-002 | RUN-267 verification activation, pre-verification denial, rollback artifacts from RUN-265 | No Angular route in this backend item                                                             |
| P5    | PASSKEY-003 | Accepted RUN-133 review and prior app E2E evidence                                        | Owned by PASSKEY-003                                                                              |
| P6    | PASSKEY-003 | Accepted RUN-133 review and prior app E2E evidence                                        | Owned by PASSKEY-003                                                                              |
| P7    | PASSKEY-012 | Local implementation exists; formal run not yet created                                   | Blocked until PASSKEY-002 review is accepted                                                      |
| P8    | PASSKEY-013 | Local implementation exists; formal run not yet created                                   | Blocked until PASSKEY-002 review is accepted                                                      |
| P9    | PASSKEY-004 | Historical accepted RUN-134 review                                                        | Final verification must be rerun after corrected P7/P8 executions                                 |

## Scope attribution

PASSKEY-002 implementation paths are the API auth/router/schema/service,
passkey contract/security, auth types, the pending-enrollment migration, and
the API E2E runner/atomicity fixture paths. The following current worktree
paths are explicitly outside PASSKEY-002 and remain attributed to other slices:

- `apps/web/app/**` and `apps/web/app-e2e/**`: PASSKEY-003.
- `apps/web/app/src/app/security/**`: PASSKEY-012/PASSKEY-013.
- `apps/web/ui-designer/**` and `docs/product/passkey-ux-security-research.md`: PASSKEY-010/PASSKEY-011.
- `.themis/**`: execution ledger.
- `docs/verification/passkey-002-run-254/**` through `docs/verification/passkey-002-run-265/**`: historical PASSKEY-002 evidence.

No completed ZK work item is modified by PASSKEY-002.

## Harness correction

The API E2E defaults now match the gateway runtime's default port (`8080`). The
atomicity run also uses explicit PostgreSQL and durable-storage settings so the
database triggers and the gateway share the same database boundary.
