---
name: themis-work-item
description: Use when creating, defining, or preparing a Themis local work item with acceptance criteria, boundaries, dependencies, and verification strategy.
---

# Themis Work Items

Use the `themis_workitem_create` tool for creation. Never edit `.themis/state.json` directly.

Every work item must define:

- An owning project and, when applicable, an epic.
- A concise title and outcome-oriented summary.
- Observable acceptance criteria.
- Explicit `scopeIn` paths or behaviors.
- Explicit `scopeOut` exclusions.
- A verification strategy with concrete commands or checks.

Create the item in `draft`, then transition it to `ready` only after all required fields are present. Do not add implementation details that belong in the sprint plan. Record discovered work as a separate item instead of silently expanding scope.
