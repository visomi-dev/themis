---
name: themis-sprint-activation
description: Use when reviewing, approving, activating, or recalculating the executable baseline of a local Themis sprint.
---

# Themis Sprint Activation

Activation is a human gate.

The required order is:

1. Inspect the proposed revision.
2. Confirm scope, dependencies, non-goals, and verification.
3. Use `themis_sprint_approve` only after explicit human approval.
4. Use `themis_sprint_activate` with the approved revision.
5. Use `themis_ready_queue` to inspect executable work.

Do not activate a draft or unapproved revision. Activation converts the selected work items into the sprint baseline and makes them claimable only when dependencies are complete.
