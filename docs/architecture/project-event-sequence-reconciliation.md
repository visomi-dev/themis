# Project-event sequence reconciliation

PZS-013 uses a **position-preserving remapping ledger**. File order is the
authoritative historical order; the workflow maps each event position to a
canonical sequence while fingerprinting every other event field. It does not
silently renumber during reads and does not change PZS-012 mutation behavior.

## Contract

Run the inventory first with an explicit registered project:

```sh
pnpm themis project-sequence-reconcile --project <project-id> --dry-run --json
```

The report contains only project identity, counts, anomaly positions,
checksums, and artifact identifiers. It never contains event payloads. A real
run requires the same explicit target and:

1. parses every event and validates state schema, project identity, aggregate
   identity, and state/event references;
2. fails closed for malformed, foreign, dangling, or ambiguous records;
3. copies the exact state, events, and prior manifest to a backup and records
   SHA-256 checksums before changing authority;
4. writes a redacted remapping ledger whose event fingerprints cover every
   field except `sequence`;
5. preserves file order and maps position `n` to sequence `n`;
6. atomically commits unchanged state plus remapped events through the existing
   project-store transaction and validates the resulting manifest;
7. resumes an interrupted commit and treats a verified canonical prefix plus
   unique monotonic appended suffix as an idempotent rerun.

Rollback is explicit:

```sh
pnpm themis project-sequence-rollback --project <project-id> --json
```

Rollback is rejected after any post-reconciliation mutation. Otherwise it
verifies every backup checksum, restores the original state/event bytes through
an atomic project-store commit, writes a valid manifest, and marks the ledger
rolled back. The original stale manifest remains in the backup for audit but is
not reinstated as authority.

## Audit and disclosure boundary

Full backup bytes remain under the local `.themis/reconciliation` authority.
The ledger and CLI report are redacted: they retain sequence mappings,
fingerprints, checksums, anomaly positions, and relative artifact locations,
but no payload, actor content, state records, secrets, or absolute paths.
