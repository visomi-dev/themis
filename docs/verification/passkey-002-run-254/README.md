# PASSKEY-002 RUN-254 rework evidence

This report preserves the accepted PASSKEY-002 evidence from RUN-253 and adds
database-backed failure-injection coverage plus a real HTTP rollback scenario.
No Angular, PASSKEY-012, or PASSKEY-013 files are part of this rework.

## Literal before/after phase-to-work-item matrix

| Phase | Work item ID(s)          | Before REVW-195                      | Before coverage/gaps                                             | After RUN-254                             | After coverage/gaps                                                                 |
| ----- | ------------------------ | ------------------------------------ | ---------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------- |
| P1    | PASSKEY-010              | done                                 | Research and threat decisions complete                           | done                                      | unchanged; no gap                                                                   |
| P2    | PASSKEY-011              | done                                 | Prototype/evaluation complete                                    | done                                      | unchanged; no gap                                                                   |
| P3    | PASSKEY-001, PASSKEY-002 | PASSKEY-001 done; PASSKEY-002 rework | Contract complete; API implementation had atomicity evidence gap | PASSKEY-001 done; PASSKEY-002 in_progress | DB-backed registration rollback and HTTP evidence added; pending independent review |
| P4    | PASSKEY-001, PASSKEY-002 | PASSKEY-001 done; PASSKEY-002 rework | Activation contract/implementation had atomicity evidence gap    | PASSKEY-001 done; PASSKEY-002 in_progress | DB-backed activation rollback and HTTP evidence added; pending independent review   |
| P5    | PASSKEY-003              | rework                               | Angular sign-up scope remains incomplete                         | rework                                    | unchanged; out of scope                                                             |
| P6    | PASSKEY-003              | rework                               | Angular sign-in scope remains incomplete                         | rework                                    | unchanged; out of scope                                                             |
| P7    | PASSKEY-012              | ready                                | Password configuration deferred                                  | ready                                     | unchanged; explicitly excluded                                                      |
| P8    | PASSKEY-013              | ready                                | Credential lifecycle UI/API deferred                             | ready                                     | unchanged; explicitly excluded                                                      |
| P9    | PASSKEY-004              | rework                               | Integral verification waits for implementation slices            | rework                                    | unchanged; independent verifier remains owner                                       |

No phase was omitted or newly discovered. PASSKEY-005/006/007 are enabling
items for the P3/P4 API evidence and remain done; they are not new phase
coverage claims in this run.

## New rollback artifacts

- `docs/verification/passkey-002-run-255/registration-rollback.json`
- `docs/verification/passkey-002-run-255/verification-rollback.json`

The executable DB-backed failure-injection test is
`apps/web/api-e2e/src/api/passkey-atomicity.spec.ts`. Both scenarios use
PostgreSQL triggers to inject a persistence failure while the supported HTTP
endpoint is executing. Each retained JSON report includes the exact HTTP
method/path, sanitized response, and before/after persisted-state summary. The
observed HTTP result is 500; registration remains pending with a null consumed
challenge, null enrollment credential, and zero credential rows, while
verification leaves the account unverified, challenge unconsumed, enrollment
pending, and its existing credential present. No request secrets or PIN values
are retained.
