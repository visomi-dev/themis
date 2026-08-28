# PASSKEY-002 RUN-259 evidence

This run fixes evidence provenance and fixture reporting after REVW-200. It
does not change Angular, PZS, or PASSKEY-012/013 behavior. The retained
rollback artifacts and the literal P1-P9 matrix are current-run evidence.

## API and fuzz execution

Exact commands:

```text
PZS005_RUN_ID=RUN-259 PZS005_ARTIFACT_DIR=docs/verification/passkey-002-run-259/openapi GATEWAY_PORT=8096 OPAQUE_SYNC_STORAGE=memory pnpm exec nx run api-e2e:openapi --skip-nx-cache
PZS005_RUN_ID=RUN-259 PZS005_ARTIFACT_DIR=docs/verification/passkey-002-run-259/fuzz GATEWAY_PORT=8097 OPAQUE_SYNC_STORAGE=memory pnpm exec nx run api-e2e:openapi-fuzz --skip-nx-cache
```

Both commands exited 0. The OpenAPI report selected 4/4 passkey operations,
tested 4, and produced JUnit/HAR/schema artifacts in its tracked directory.
The fuzz report selected 4/4 and its console output recorded 2 passed and 2
skipped in the examples phase. The real-HTTP fixture summary has exactly 20
observed smoke cases in each run; the two non-pass fuzz skips and all
authentication/schema warnings are explicitly retained in the summaries and
warning dispositions, not presented as passes.

Reports are the exact timestamped files named by each local fixture summary;
no `dist` path is used as evidence.

## Security artifact scans

```text
pnpm exec node --experimental-strip-types scripts/operational-workspace-security-scan.ts docs/verification/passkey-002-run-259/openapi/openapi-report/raw
```

PASS; 2 files scanned; findings `[]`.

```text
pnpm exec node --experimental-strip-types scripts/operational-workspace-security-scan.ts docs/verification/passkey-002-run-259/fuzz/openapi-report/raw
```

PASS; 2 files scanned; findings `[]`.

The current-run API report is blocked for required API/security completion:
Schemathesis emitted authentication and schema-validation warnings, and fuzz
explicitly skipped two operations. No API or security pass is claimed.

## Rollback artifacts

- `registration-rollback.json`: HTTP 500 leaves challenge unconsumed, no
  credential linked, enrollment pending, and credential count zero.
- `verification-rollback.json`: HTTP 500 leaves email verification and
  challenge consumption null, enrollment pending, and the existing credential
  intact.

## Literal P1-P9 matrix

| Phase | Work item ID(s)          | Before RUN-259                       | Before coverage/gaps             | After RUN-259                             | After coverage/gaps                   |
| ----- | ------------------------ | ------------------------------------ | -------------------------------- | ----------------------------------------- | ------------------------------------- |
| P1    | PASSKEY-010              | done                                 | Research complete                | done                                      | Unchanged; no gap                     |
| P2    | PASSKEY-011              | done                                 | Prototype complete               | done                                      | Unchanged; no gap                     |
| P3    | PASSKEY-001, PASSKEY-002 | PASSKEY-001 done; PASSKEY-002 rework | Evidence provenance rework       | PASSKEY-001 done; PASSKEY-002 in_progress | Current reports retained; API blocked |
| P4    | PASSKEY-001, PASSKEY-002 | PASSKEY-001 done; PASSKEY-002 rework | Evidence provenance rework       | PASSKEY-001 done; PASSKEY-002 in_progress | Current reports retained; API blocked |
| P5    | PASSKEY-003              | rework                               | Angular sign-up incomplete       | rework                                    | Unchanged; out of scope               |
| P6    | PASSKEY-003              | rework                               | Angular sign-in incomplete       | rework                                    | Unchanged; out of scope               |
| P7    | PASSKEY-012              | ready                                | Password configuration deferred  | ready                                     | Unchanged; excluded                   |
| P8    | PASSKEY-013              | ready                                | Credential lifecycle deferred    | ready                                     | Unchanged; excluded                   |
| P9    | PASSKEY-004              | rework                               | Independent verification pending | rework                                    | Unchanged; verifier-owned             |

No phase was omitted or newly discovered.

## Validation matrix status

| Category    | Result                                        | Evidence                                                  |
| ----------- | --------------------------------------------- | --------------------------------------------------------- |
| unit        | Not rerun; prior result not reused as current | RUN-258 evidence only                                     |
| api         | **BLOCKED; not a pass**                       | tracked OpenAPI schema/JUnit/HAR and warning disposition  |
| app-e2e     | Not applicable; no Angular route changed      | PASSKEY-003 owns browser routes                           |
| gateway-e2e | Not rerun; prior result not reused as current | RUN-258 evidence only                                     |
| site-e2e    | Not applicable; no Astro route changed        | backend-only item                                         |
| visual      | Not applicable; no UI changed                 | PASSKEY-003/PASSKEY-011 own visual checks                 |
| security    | **BLOCKED; not a pass**                       | tracked fuzz output, warnings, and zero-finding raw scans |
| build       | Not rerun; prior result not reused as current | implementation unchanged                                  |

Plan fidelity remains the existing 6/6 result; no phase was added or omitted.
