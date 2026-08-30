# PZS-013 RUN-243 reconciliation evidence

The live `agent-tracking` inventory was executed with an explicit target and
without printing event payloads. It found 4,407 events, 13 duplicate sequence
positions, four forward-gap ranges containing 13 missing legacy sequence
values, and one descending position. The existing events checksum did not
match the stale manifest.

The approved dry-run and real run used reconciliation ID
`d59bcda509a53aff` and the position-preserving remapping-ledger strategy. The
state checksum remained unchanged. Every event retained its file position and
a fingerprint of every non-sequence field; canonical sequence became the
one-based file position. The local backup and full redacted ledger remain under
`.themis/reconciliation/agent-tracking/`.

After reconciliation, a fresh CLI evidence mutation appended sequence 4408
after sequence 4407. Evidence recording and run completion then extended the
canonical history to 4419. A final idempotent reconciliation verified the
canonical prefix and suffix, refreshed the stale adapter manifest, and reported
unique and monotonic sequences with matching state/event checksums.
`reconciliation-manifest.json` contains the redacted checksums, counts, and
relative artifact locations.

The approved matrix passed: focused workflow 18/18, reconciliation 15/15,
repository Themis 265/265, plan fidelity 6/6, standalone TypeScript and ESLint,
and Nx lint/typecheck/build for `themis-workflow` and `themis-agent-cli`. API,
app E2E, gateway E2E, site E2E, and visual checks are explicitly not applicable
because the local migration changes none of those surfaces. An independent
verifier was requested before review, but the verifier launch was blocked by
the environment's subagent-depth limit; no review was requested.
