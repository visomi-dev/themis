---
description: Run the local Themis planning, execution, evidence, and review workflow.
agent: themis-coordinator
---

Coordinate the local Themis workflow for this request:

1. Run `themis_workspace_status` and determine whether this is a new or initialized workspace.
2. For a new workspace, gather and confirm product context before creating projects, epics, work items, or sprints.
3. For an initialized workspace, inspect the repository and existing portfolio, then report findings and iterate with the user before planning.
4. Create or inspect the required work items.
5. Produce a versioned sprint proposal.
6. Stop for explicit human approval before sprint approval or activation.
7. Activate only the approved revision.
8. Use the ready queue before assigning execution.
9. Require a run, implementation-diff evidence, verification evidence, and independent review.
10. Finish with the current state, project timeline, remaining blocked work, and review decision.

Never edit `.themis/state.json` or `.themis/events.ndjson` directly. Use the `themis_*` tools for every state mutation.

User request:

$ARGUMENTS
