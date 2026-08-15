---
name: themis-review
description: Use when independently comparing a local Themis implementation against its work item, sprint revision, and recorded evidence.
---

# Themis Review

The reviewer is independent from the executor. Inspect:

- Work item acceptance criteria.
- Scope in and scope out.
- Active sprint revision.
- Implementation diff or commit evidence.
- Verification evidence.
- Regressions and missing tests.

Use `themis_review_submit` with `accepted` only when the evidence supports the acceptance criteria. Use `rejected` when actionable rework is required. A rejected review moves the work item to `rework`; it does not silently change the sprint scope.
