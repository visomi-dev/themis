# PZS-005 RUN-237 verification

## Scope

The OpenAPI fixture now performs owner approval followed by explicit owner
enrollment before the owner is used as the single approver for a second device.
The legitimate device-lifecycle `409 device_lifecycle_rejected` responses remain
negative-case assertions; no authorization or `409` mapping was weakened.

## Retained same-run custody

- `sync-case-matrix.json`: 23 authenticated request/response observations with
  case ID, run ID, stream ID, status, safe code/body, correlation ID, and path.
- `pzs-005-sync.har.json`, `pzs-005-sync.junit.xml`, and
  `raw-sync-http.ndjson`: transport-level request/response evidence.
- `generated-openapi.json` and `openapi-report/`: generated contract and current
  OpenAPI runner reports. The runner was rebuilt from current source with
  `pnpm exec nx run server:build --skip-nx-cache`.
- `postgres-rows.json`: same-run PostgreSQL metadata rows only.
- `minio-object.json`: same-run MinIO object byte counts and SHA-256 comparison
  with PostgreSQL references.
- `server.log`: current-run API log; `traces.json` and `metrics.json` are explicit
  N/A because no exporter/collector is configured for this isolated process.
- `artifact-hashes.txt`: SHA-256 hashes for the durable evidence artifacts.

## Commands and results

| Category               | Exact command/check                                                                                                                                                                                                          | Result                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| unit                   | `pnpm exec nx run shared:test --skip-nx-cache && pnpm exec nx run api:test --skip-nx-cache`                                                                                                                                  | PASS: shared 22 suites/135 tests; API 5 suites/37 tests.                                                                                        |
| API/OpenAPI            | `GATEWAY_PORT=8084 PZS005_RUN_ID=RUN-237 PZS005_ARTIFACT_DIR=docs/verification/pzs-005-run-237 PZS005_SYNC_ONLY=true pnpm exec nx run api-e2e:openapi --skip-nx-cache`                                                       | PASS: 12/12 operations and 1065/1065 cases; current-run authentication/schema warnings retained in `openapi-report/`.                           |
| durable API            | `GATEWAY_PORT=8085 PZS005_REAL=true PZS005_RUN_ID=RUN-237 PZS005_ARTIFACT_DIR=docs/verification/pzs-005-run-237 PZS005_SERVER_LOG=docs/verification/pzs-005-run-237/server.log pnpm exec nx run api-e2e:e2e --skip-nx-cache` | PASS: isolated PostgreSQL/MinIO migration and real 23-case matrix; owner approval + owner enrollment completed before second-device enrollment. |
| regression             | `pnpm exec nx run api-e2e:test --skip-nx-cache --testPathPatterns=src/api/sync.spec.ts`                                                                                                                                      | PASS: 1 suite/6 tests, including owner approval + owner enrollment regression.                                                                  |
| lint                   | `pnpm exec nx run api-e2e:lint --skip-nx-cache`                                                                                                                                                                              | PASS.                                                                                                                                           |
| build/source freshness | `pnpm exec nx run server:build --skip-nx-cache`                                                                                                                                                                              | PASS; OpenAPI target now executes this fresh source build before starting the runner.                                                           |
| app-e2e                | N/A                                                                                                                                                                                                                          | Backend/API fixture only; no Angular route changed.                                                                                             |
| gateway-e2e            | N/A                                                                                                                                                                                                                          | No gateway composition behavior changed; API runner observes the supported boundary.                                                            |
| site-e2e               | N/A                                                                                                                                                                                                                          | No public Astro behavior changed.                                                                                                               |
| visual                 | N/A                                                                                                                                                                                                                          | No rendered UI changed.                                                                                                                         |
| security               | Same-run inspection of PostgreSQL, MinIO, raw HTTP, logs, generated contract, and disclosure-safe outputs                                                                                                                    | PASS: ciphertext/object hash custody retained; `traces.json` and `metrics.json` explicitly N/A for absent exporters.                            |
| plan fidelity          | `node --experimental-strip-types --test scripts/plan-fidelity.test.ts`                                                                                                                                                       | PASS: required focused plan-fidelity command.                                                                                                   |

The worktree contained unrelated pre-existing changes; no `.themis/state.json`
or `.themis/events.ndjson` files were edited.
