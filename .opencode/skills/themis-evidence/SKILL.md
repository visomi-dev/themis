---
name: themis-evidence
description: Use when recording verification, implementation diff, command output, or observations for a local Themis execution run.
---

# Themis Evidence

Evidence must be factual and attached to the active run through `themis_evidence_add`.

Before requesting review, record at minimum:

- One `implementation-diff` entry identifying the resulting diff or commit.
- One `verification` entry containing the checks and their result.

Use `themis_run_finish` before `themis_review_request`. Do not report a command as passed without its observed result. Do not include secrets or credentials in evidence values.
