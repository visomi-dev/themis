---
name: themis-sprint-planning
description: Use when turning defined Themis work items into a versioned sprint proposal with Why, What, How, dependencies, non-goals, and verification.
---

# Themis Sprint Planning

Before proposing a sprint:

1. Read the selected work items.
2. Confirm each item is `ready`.
3. Add blocking dependencies explicitly with `themis_dependency_add`.
4. Define one measurable Sprint Goal.
5. Define Why, What, and How.
6. Define non-goals and Definition of Done.
7. Define sprint-level verification.

Use `themis_sprint_propose`. Proposals are versioned; never overwrite a previous proposal. If exploration changes scope, create a new revision with `sprintId` and explain the delta in `planning/sprints/<sprint-id>/proposal.md`.

Planning does not activate a sprint and does not authorize implementation.
