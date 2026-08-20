# ZK-014 Zero-Knowledge Security Review

**Review status: BLOCKED for production architecture and pending independent sign-off**
**Run:** `RUN-061` (targeted remediation run following `RUN-060` / `REVW-053`)
**User-mandated constraint:** this review is intentionally conducted with **no sprint**. The absence of a sprint is not an acceptance defect, planning gap, or release finding.
**Scope:** Phase 0, envelope/crypto proof, local vault, opaque sync, device lifecycle, migration, product visibility, capabilities, execution, MCP/secret broker, telemetry, and release controls.

## Executive decision

The reviewed slices demonstrate useful fail-closed proofs, but they do not establish a production zero-knowledge trust boundary. Production release remains blocked by the unresolved critical/high findings below, legacy plaintext containment, release advisory disposition, and the open architecture decisions. This report records review evidence and disposition only; it does not implement remediations.

The cloud/API path returns metadata-only project projections and rejects new protected text writes (`libs/projects/src/lib/projects-service.ts:45-75,147-153,226-235,274-280`). The opaque sync router validates envelope shape and device authorization without decoding ciphertext (`apps/web/api/src/sync/opaque-sync-router.ts:204-263`). These are positive transition controls, not proof that legacy plaintext has been deleted. RUN-061 wires the browser same-origin visibility route through a gateway challenge/response verifier with origin/session binding, replay claims, and fail-closed behavior when the agent key is not configured. The durable replay claim uses a transactional Postgres uniqueness boundary (`apps/web/server/src/durable-replay-store.ts`); process-local fallback is test-only and is not production evidence. Sync/device/session/audit stores and legacy plaintext/tombstone closure remain blocked.

## RUN-061 implementation and evidence disposition

The gateway now sends a nonce/origin/session-bound challenge to the local agent, verifies the Ed25519 response before forwarding JSON, rejects forged or replayed responses, and never forwards the response body on authentication failure (`apps/web/server/src/local-agent-proxy.ts`, `apps/web/server/src/local-agent-proxy.spec.ts`). Production configuration requires `LOCAL_AGENT_PUBLIC_KEY`; absent configuration returns a fail-closed `503` rather than exposing a cloud fallback. `DurableReplayStore` persists replay claims transactionally in Postgres with `ON CONFLICT DO NOTHING`; the in-memory branch is explicitly a test fallback.

The zero-plaintext migration gate remains **failed**: no production-like account/project-scoped inventory or independently reviewed zero tombstone count was available in this run. Static schema ownership still identifies `projects.summary`, `project_documents.content_markdown`, and async-job payload/error columns. These locations, secondary queues/realtime payloads/logs/fixtures/backups, and the transactional migration ledger remain release-blocking until a redacted inventory records zero values after the approved verification window.

## RUN-060 targeted remediation disposition

| Finding     | RUN-060 result                                                                                                                          | Remaining gate                                                                                                                |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| CRITICAL-01 | Real Ed25519 verification now binds issuer public key and signed capability payload; forged signatures are denied by adversarial tests. | Wire key custody/rotation and durable revocation state into the production agent boundary.                                    |
| CRITICAL-02 | Nonce/origin/session-bound handshake challenge/response protocol and forged/replay tests added.                                         | Integrate response authentication into the browser/gateway visibility transport.                                              |
| HIGH-01     | Capability state can use an explicit persistence boundary; recovery quorum is executable.                                               | Sync/device/session/audit stores remain process-local in the reviewed runtime.                                                |
| HIGH-02     | `protected-plaintext` output classification is deny-by-default at MCP boundary.                                                         | Complete end-to-end projection labeling and audit integration.                                                                |
| HIGH-03     | External-AI requests require provider, projection, fields, retention, consent ID, and output validation.                                | Provider registry, consent persistence, and transport enforcement remain to be wired.                                         |
| HIGH-04     | Recovery requires explicit consent and independent non-revoked quorum.                                                                  | Vault/device recovery execution, rotation, deletion, and all-device-loss flow remain incomplete.                              |
| HIGH-05     | Existing plaintext inventory was rerun without printing values; metadata-only writers remain.                                           | Protected columns, secondary queues/logs/backups, transactional migration ledger, and tombstone evidence are not yet cleared. |

The complete matrix evidence for this disposition is attached to `RUN-060`; security remains failed/blocked and no critical finding is accepted as risk.

## Severity-ranked findings

### CRITICAL-01 — Capability signatures are not verified

**Evidence:** `libs/shared/src/lib/crypto/capability-policy.ts:60-73,89-114` checks only that `signature` is non-empty; it does not verify a signature, bind it to an issuer key, or validate issuance. Tests use `detached-signature` (`capability-policy.spec.ts:4-18`).

**Reproduction:** construct a capability with `issuer: 'local-agent'`, a forged scope, arbitrary non-empty `signature`, and a matching request; `new CapabilityPolicy().evaluate(...)` returns `{ allowed: true }` without a private key or issuance authority.

**Disposition:** release-blocking; remediate. Critical findings are not accepted risks.

### CRITICAL-02 — Browser visibility transport has no authenticated local-agent handshake

**Evidence:** `apps/web/app/src/app/shared/projects/local-agent-visibility.ts:27-35` calls fixed loopback HTTP and accepts typed JSON without session binding, origin-bound nonce, device proof, or response signature. The repository map leaves endpoint/authentication/packaging unresolved (`docs/architecture/system/zero-knowledge-repository-map.md:35-45`).

**Reproduction:** any process answering the loopback request can return `LocalAgentProjectView`; the adapter maps it to success without cryptographic or session verification.

**Disposition:** release-blocking; remediate.

### HIGH-01 — Sync, device, session, and revocation state is process-local

**Evidence:** `libs/shared/src/lib/crypto/opaque-sync.ts:13-18,79-81`, `device-identity.ts:51-57,259-261`, `local-agent-context.ts:14-17`, and `capability-policy.ts:81-83` keep authorization, cursor, replay, revocation, and audit state in memory.

**Reproduction:** append/revoke state, discard the instance or restart, then create a new instance; the cursor, enrollment/revocation, session, and replay state are absent.

**Disposition:** release-blocking; remediate with durable transactional state and defined offline propagation.

### HIGH-02 — MCP output classification cannot distinguish protected plaintext

**Evidence:** `libs/shared/src/lib/crypto/mcp-boundary.ts:4-6,110-125` allows `public | internal | secret` and rejects only `secret`.

**Reproduction:** return protected project text with `dataClass: 'internal'`; `McpBoundary.invoke` returns it for an otherwise valid capability.

**Disposition:** release-blocking for MCP distribution; add protected-data classification and deny-by-default projection rules.

### HIGH-03 — External-AI approval is a broad boolean

**Evidence:** `libs/shared/src/lib/crypto/execution-policy.ts:115-129` permits `protected-plaintext` using profile plus `consent`, without provider, fields, purpose, retention, or projection identity. ADR 004:79-81 requires those controls.

**Disposition:** release-blocking for external-AI use; require named provider, field projection, retention, consent record, and local output validation.

### HIGH-04 — Recovery is unavailable and all-device key loss is unrecoverable

**Evidence:** `LocalEncryptedVault.recover()` throws `VaultRecoveryBlockedError` (`libs/shared/src/lib/crypto/local-encrypted-vault.ts:150-152`); ADR 004:110-112 leaves recovery actors/quorum open.

**Disposition:** accepted only for the proof; production-blocking until recovery actors, quorum, rotation, loss, and deletion are decided.

### HIGH-05 — Legacy server-readable plaintext remains in durable columns

**Evidence:** the schema still defines `projects.summary`, `project_documents.content_markdown`, and `async_jobs.input_json`, `result_json`, and `error_message` as text (`libs/shared/src/lib/db/schema.ts:120-174`). The migration inventory identifies these as protected fields and says they are retained with their tables (`docs/architecture/system/encrypted-product-migration.md:7-12`). `libs/projects/src/lib/projects-service.ts:125-183,195-235` still accepts/queries project summaries, and document/job services and seed/runtime paths remain the owning legacy seams. Metadata-only response mapping is containment, not deletion.

**Reproduction (static, no secret data required):**

```sh
pnpm exec nx graph --file=/tmp/themis-zk014-project-graph.html
rg -n "summary: text\('summary'\)|content_markdown|input_json|result_json|error_message" libs/shared/src/lib/db/schema.ts
rg -n "projects\.summary|project_documents\.content_markdown|async_jobs\.(input_json|result_json|error_message)|summary: data\.summary" libs apps
```

The first search proves the durable plaintext-shaped columns exist; the second proves their legacy ownership/read-write seams remain. A deployed database check must additionally run against a production-like snapshot without printing values:

```sql
SELECT 'projects.summary' AS column_name, count(*) AS rows_with_value
FROM projects WHERE summary IS NOT NULL AND length(summary) > 0
UNION ALL SELECT 'project_documents.content_markdown', count(* )
FROM project_documents WHERE content_markdown IS NOT NULL AND length(content_markdown) > 0
UNION ALL SELECT 'async_jobs.input_json', count(*) FROM async_jobs WHERE input_json IS NOT NULL
UNION ALL SELECT 'async_jobs.result_json', count(*) FROM async_jobs WHERE result_json IS NOT NULL
UNION ALL SELECT 'async_jobs.error_message', count(*) FROM async_jobs WHERE error_message IS NOT NULL AND length(error_message) > 0;
```

**Deletion/containment gate:** production release and migration closure are blocked until (a) all protected writers are frozen and the durable migration ledger is transactional, (b) an account/project-scoped inventory records zero protected values in these columns and in secondary queues, realtime payloads, logs, fixtures, and backups after the approved verification window, (c) deletion/tombstone evidence is independently reviewed without exposing values, and (d) the approved retention/deletion and recovery policy records the final exception handling. Until then, keep metadata-only reads, reject protected plaintext writes, quarantine malformed/unavailable rows, and treat every non-zero query result as a release-blocking finding. No deletion or product remediation is implemented by ZK-014.

**Disposition:** release-blocking migration finding; remediation belongs to the migration/data owners, not this review item.

### MEDIUM-01 — Migration ledger can be process-local

`MigrationLedger` defaults to a `Map` (`libs/shared/src/lib/crypto/encrypted-project-migration.ts:130-152`). It is documented as test-only, but production construction does not enforce durable persistence. **Disposition:** remediate before historical deletion.

### MEDIUM-02 — Runtime error logging is not proven content-safe

`libs/shared/src/lib/http.ts:64-80` logs the complete unknown error object. Release fixture scans do not prove runtime redaction. **Disposition:** remediate before production; add stable error-class and correlation-ID logging tests.

### MEDIUM-03 — AEAD nonce uniqueness is not integrated with the vault

The opt-in in-memory `NonceReuseGuard` is not used by vault random-nonce writes (`crypto-proof-harness.ts:104-119`, `local-encrypted-vault.ts:154-181`). **Disposition:** remediate or approve a durable nonce-generation invariant before cryptography sign-off.

## ZK-001 decisions and open items

| ZK-001 decision/open item                                      | Evidence                                                    | Owner                               | Disposition at RUN-033                                                                                   |
| -------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Local agent is root of trust; cloud is ciphertext orchestrator | ADR 004:7-11,21-30; ZK-006 opaque sync                      | Security architect / agent owner    | Adopted target; production proof blocked by HIGH-01/02 and legacy plaintext.                             |
| Metadata visibility/minimization                               | ADR 004:49,56; ADR 005:44-46; migration:66-72               | Product + security owner            | Open: approve exact IDs, names, timestamps, sizes, status, labels, padding, and readers.                 |
| Recovery actors/quorum and all-device loss                     | ADR 004:47,51,110-112; ADR 007                              | Security owner                      | Open; HIGH-04 production blocker.                                                                        |
| Product read architecture/offline/browser compromise           | ADR 004:71-73,112; repository map:43                        | Product + platform owner            | Local-agent-mediated direction accepted; handshake/packaging/offline behavior open; CRITICAL-02 blocker. |
| Device enrollment and revocation                               | ADR 004:113; ADR 007; ZK-007                                | Device/platform owner               | Process-local proof only; durable/offline semantics open; HIGH-01 blocker.                               |
| Activity privacy and approved projections                      | ADR 004:45,114; migration:68-72                             | Product + security owner            | Metadata-only containment; field-level policy open.                                                      |
| External-AI providers, consent, retention                      | ADR 004:79-81,115; ADR 009                                  | Security + product owner            | Default deny; named-provider/projection policy open; HIGH-03 blocker.                                    |
| Retention, deletion, tombstones, cryptographic deletion        | ADR 004:48-51,116; migration:33-36,62-64; opaque-sync:16-21 | Data lifecycle owner                | Open; HIGH-05 and deletion gate block closure.                                                           |
| Key hierarchy, rotation, historical versions                   | ADR 004:47,117; ADR 006; ADR 011:51-62                      | Key-management/security owner       | Open; proof vectors are not production custody or rotation.                                              |
| Cloud search and indexing                                      | ADR 004:118; ADR 005:75; opaque-sync:8-18                   | Product/search + security owner     | Open; no plaintext indexing approved; choose local projection, blind index, or reduced metadata.         |
| Phase 0 acceptance authority                                   | ADR 004:119,121-131                                         | Named human security/product owners | Open; this report is blocked pending independent sign-off and does not claim it.                         |

## ZK-001–ZK-013 artifact, evidence, owner, and disposition map

| Item/artifact                | Evidence reviewed                                                                                            | Owner                         | Disposition                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| ZK-001 / ADR 004             | ADR 004; RUN-001/REVW-001                                                                                    | Security architect            | Accepted Phase 0 foundation; open decisions above remain gates.                                                                |
| ZK-002 / repository seam map | `docs/architecture/system/zero-knowledge-repository-map.md`; RUN-002/REVW-002                                | Architecture owner            | Accepted map; unresolved seams remain review inputs.                                                                           |
| ZK-003 / envelope contract   | ADR 005; `encrypted-envelope.ts` and specs; RUN-004/REVW-004                                                 | Crypto/contract owner         | Accepted contract proof; metadata, retention, tombstones, and product-read choices open.                                       |
| ZK-004 / crypto vectors      | ADR 006; crypto proof harness/specs; RUN-005 and verifier evidence                                           | Crypto owner                  | Proof pass only; production KDF, nonce lifecycle, custody, rotation, and recovery open.                                        |
| ZK-005 / local vault         | `local-encrypted-vault.ts` and specs; RUN-006/REVW-006                                                       | Agent/vault owner             | Proof accepted; recovery/key-loss and durable storage block production.                                                        |
| ZK-006 / opaque sync         | `opaque-sync.ts`, router/specs, `opaque-sync.md`; RUN-007/REVW-007                                           | Cloud sync owner              | Opaque boundary accepted; process-local durability/revocation blocks production.                                               |
| ZK-007 / device lifecycle    | `device-identity.ts`, router/specs, ADR 007; RUN-008/REVW-008                                                | Device owner                  | Lifecycle proof accepted; durable audit and offline revocation open.                                                           |
| ZK-008 / encrypted migration | `encrypted-project-migration.ts`, migration spec/system doc; RUN-009/REVW-009                                | Data migration owner          | Transition containment accepted; legacy columns and deletion gate remain HIGH-05.                                              |
| ZK-009 / product visibility  | local-agent visibility adapter/specs; RUN-010/REVW-010                                                       | Angular/platform owner        | Cloud fallback removed; unauthenticated loopback handshake is CRITICAL-02.                                                     |
| ZK-010 / capability security | ADR 008; `capability-policy.ts`/specs; RUN-011/REVW-011                                                      | Capability/security owner     | Structural policy proof only; signature verification is CRITICAL-01.                                                           |
| ZK-011 / MCP and broker      | ADR 010; MCP/broker sources/specs; RUN-012/REVW-012                                                          | Agent integrations owner      | Secret-return denial useful; protected-plaintext classification and durable audit open.                                        |
| ZK-012 / execution policy    | ADR 009; `execution-policy.ts`/specs; RUN-013/REVW-013                                                       | Execution/security owner      | Default-deny proof; external projection/consent and retention controls open.                                                   |
| ZK-013 / release assurance   | ADR 011; `scripts/release-verification.ts`, `release-gate-fixture.ts`, CI workflow, RUN-027–031/REVW-021–025 | Release/build/security owners | Gate integration accepted; audit advisories, provenance attestation, key custody, telemetry retention remain release blockers. |

The RUN/REVW identifiers above are repository-control-plane evidence references, not claims that ZK-014 itself received independent sign-off. ZK-014 remains blocked until an independent reviewer validates this report.

## Reproducible release audit and advisory disposition evidence

The aggregate count is not used as clearance. Reproduce the audit from the locked dependency tree with:

```sh
pnpm audit --json
pnpm audit --json > /tmp/themis-zk014-pnpm-audit.json
node -e "const r=require('/tmp/themis-zk014-pnpm-audit.json'); console.log(JSON.stringify({metadata:r.metadata,vulnerabilities:Object.fromEntries(Object.entries(r.vulnerabilities||{}).filter(([id])=>id.startsWith('GHSA-')).map(([id,v])=>[id,{severity:v.severity,via:v.via}]))},null,2))"
```

The recorded 2026-08-18 result was **2 critical, 46 high, 52 moderate, and 11 low across 2,276 resolved packages**. Critical advisory disposition is explicit: `GHSA-23hp-3jrh-7fpw` and `GHSA-xv26-6w52-cph6` are **untriaged and release-blocking**, owned by the security owner with a 2026-08-25 deadline and no exception. The high advisory IDs and release-blocking/untriaged disposition are recorded in ADR 011:87-103; release owner/build owner triage is due 2026-09-01, with only a documented, compensating, time-bounded security-approved exception permitted after triage. This report attaches the command and advisory mapping rather than treating counts as evidence of safety.

The reproducible, redacted audit disposition is checked in at [`release-audit-2026-08-18.json`](./release-audit-2026-08-18.json). It contains the command, package total, severity totals, unique critical/high advisory IDs, owners, deadlines, and blocking/exception policy without package paths or secrets.

Also reproduce the configured generated-artifact gate:

```sh
pnpm release:gate
pnpm exec nx run server:build
pnpm exec nx run shared:test -- --runInBand
```

The gate is fail-closed for malformed manifests, invalid signatures, catalogue failures, protected plaintext in generated inputs, and artifact mismatch. CI intentionally runs a tamper/protected-plaintext failure case; those failures are expected security evidence, not a passed release. Production remains blocked pending real provenance attestation, production key custody/distribution, telemetry retention approval, and advisory dispositions.

## Control-by-control conclusion

| Control                   | Result                         | Disposition                                                                                      |
| ------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------ |
| Cloud plaintext authority | Partial pass / blocked         | New paths are metadata-only/opaque; legacy durable columns require HIGH-05 deletion gate.        |
| Envelope/crypto proof     | Proof pass, production pending | Vectors pass; key custody, nonce lifecycle, and capability authentication open.                  |
| Local vault               | Blocked                        | Recovery and production KDF/key custody absent.                                                  |
| Sync/device/revocation    | Blocked                        | State is process-local; durable multi-instance and offline semantics absent.                     |
| Migration                 | Blocked                        | Legacy values remain; deletion/tombstone evidence and durable ledger pending.                    |
| Product visibility        | Blocked                        | Cloud fallback is avoided, but loopback handshake is unauthenticated.                            |
| Capabilities/execution    | Blocked                        | Structural checks pass; signatures and bounded projections do not.                               |
| External AI/MCP/broker    | Blocked                        | Default deny helps, but protected classification and projection controls are insufficient.       |
| Telemetry/logging         | Blocked                        | Runtime redaction and retention are not proven/approved.                                         |
| Release gate              | Blocked                        | Gate is wired and reproducible; audit, provenance, key, telemetry, and advisory blockers remain. |

## Sign-off and release gate

**Production architecture: BLOCKED.** At minimum CRITICAL-01, CRITICAL-02, HIGH-01 through HIGH-05 require remediation or explicit owner decisions; critical findings are not eligible for accepted risk. Release provenance remains blocked by ADR 011's key-custody, catalogue, attestation, telemetry, and advisory-triage decisions.

**Independent sign-off:** pending. This report deliberately makes no unsupported claim that independent review is complete or signed off. The prior `REVW-026` review rejection is the current independent-review record; a new independent reviewer must validate this rework before ZK-014 can be accepted.

**Proof-milestone limitations:** process-local stores, placeholder capability signatures, unavailable recovery, fixture-only release keys, and legacy plaintext are documented incomplete controls, not production accepted risks. No remediations outside the ZK-014 review scope were implemented.
