# Opaque append-only synchronization

The authenticated API exposes `POST /sync/:workspaceId/envelopes` and
`GET /sync/:workspaceId/envelopes`. Before either operation, the URL workspace
must resolve to a project authorized for the authenticated account; the account
and URL workspace must also match the envelope's opaque `workspaceId`. Missing
or cross-account workspaces return the same non-disclosing not-found response.
The service validates the envelope shape, but never decodes or indexes
`ciphertext`.

Accepted records receive a monotonic cursor. The store tracks the latest
revision for each account/workspace/envelope identity: exact retries of the
latest revision are idempotent, higher revisions advance the append-only
record, and retries of older revisions are rejected as replay. A high-water
cursor is retained independently of pruned records, so appends remain
monotonic even after the retention window removes every record. Clients retain
envelope identity, revision, associated data, and metadata for local conflict
decisions. The cloud does not merge revisions. The current foundation adapter
retains records for 30 days and prunes them; durable storage and device
authorization is enforced at the device-scoped workspace boundary, while the
current foundation adapter retains lifecycle state in process-local memory.
