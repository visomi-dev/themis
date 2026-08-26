# PZS-005 RUN-215 auditable evidence

This directory is the tracked evidence set retained for RUN-216. It supersedes
ignored `dist/` output as the audit source. `http-case-records.ndjson` is the
per-case sanitized request/response record; HAR, raw HTTP, and JUnit retain one
attachment reference for every case. Headers are allowlisted and bodies are
ciphertext-safe; secrets, cookies, keys, local paths, and protected plaintext
are excluded.

The stale-base and cursor-recovery behavior is fixed and preserved:

- stale append: HTTP 409, `opaque_envelope_rejected`;
- high-water or pruned cursor: HTTP 409, `cursor_recovery_required`.

The complete case mapping is in `case-acceptance-matrix.json`; the full device
lifecycle and sync response contract is in `openapi-response-excerpt.json`;
the eight validation categories are in `validation-matrix.json`; and literal
P0-P11 traceability is in `phase-item-status-gap-matrix.json`. P4 remains
`in_progress` pending independent acceptance.
