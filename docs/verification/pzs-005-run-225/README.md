# PZS-005 RUN-225 verification

## Result

Blocked before the 23-case matrix. The isolated PostgreSQL and MinIO services
started, migrations passed, and the real API process started, but device
enrollment returned HTTP 409 `device_lifecycle_rejected`. No synthetic or
prior-run evidence is substituted.

Observed current-run server log: `server.log`.

## Matrix

| Category    | Result         | Exact check                                                                                                                                                                                     |
| ----------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| unit        | blocked        | `pnpm exec nx run shared:test --skip-nx-cache && pnpm exec nx run api:test --skip-nx-cache` not run after the harness block                                                                     |
| api         | blocked        | `pnpm exec nx run api-e2e:e2e --skip-nx-cache` stopped during enrollment before the 23 cases                                                                                                    |
| app-e2e     | not applicable | Backend/API storage boundary; no Angular route changed                                                                                                                                          |
| gateway-e2e | not applicable | No gateway composition behavior is in scope                                                                                                                                                     |
| site-e2e    | not applicable | No public Astro behavior is in scope                                                                                                                                                            |
| visual      | not applicable | No rendered UI changed                                                                                                                                                                          |
| security    | blocked        | Same-run DB/object/HAR/JUnit/OpenAPI/disclosure artifacts were not produced because enrollment stopped first                                                                                    |
| build       | blocked        | `pnpm exec nx run api:build --skip-nx-cache && pnpm exec nx run api-e2e:lint --skip-nx-cache && node --experimental-strip-types --test scripts/plan-fidelity.test.ts` not completed for RUN-225 |

## P0-P11

The requested literal phase matrix is not claimed complete. P4 remains
blocked at device enrollment; no later phase was started.
