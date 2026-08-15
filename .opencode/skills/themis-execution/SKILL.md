---
name: themis-execution
description: Use when an OpenCode executor must claim and implement one ready Themis work item within its approved scope.
---

# Themis Execution

The executor must follow this sequence:

1. Call `themis_ready_queue`.
2. Select one item returned by the queue.
3. Call `themis_work_claim`.
4. Call `themis_run_start`.
5. Implement only the claimed item's `scopeIn`.
6. Record discovered work separately instead of expanding the current item.
7. Ask the verifier to run the required checks.

The executor cannot approve its own review and cannot transition directly to `done`. Never bypass a failed precondition by editing local state files.
