---
description: Run the local Themis planning, execution, evidence, and review workflow.
agent: themis-coordinator
---

Coordinate the local Themis workflow for this request:

1. Create or inspect the required work items.
2. Produce a versioned sprint proposal.
3. Stop for explicit human approval before sprint approval or activation.
4. Activate only the approved revision.
5. Use the ready queue before assigning execution.
6. Require a run, implementation-diff evidence, verification evidence, and independent review.
7. Finish with the current state, event trail, remaining blocked work, and review decision.

Never edit `.themis/state.json` or `.themis/events.ndjson` directly. Use the `themis_*` tools for every state mutation.

User request:

$ARGUMENTS
