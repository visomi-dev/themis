# PRD: Themis

## Goal

Create Themis, a task system that reduces friction in defining, documenting, updating, and executing work.

The system should feel lightweight enough for daily use, but structured enough to support project management discipline and AI-assisted execution.

## Users

### Primary Users

- software engineers
- technical leads
- engineering managers with delivery responsibility
- solo builders managing many parallel streams of work

### Secondary Users

- product-minded collaborators
- AI/code agents consuming structured work definitions

## Primary Use Cases

1. Create a new task with clear scope and requirements.
2. Capture decisions, risks, and updates as the task evolves.
3. See task status and execution state quickly.
4. Break larger initiatives into smaller execution units.
5. Feed structured task data into AI or code agents for planning or execution support.
6. Preserve the task's history and rationale over time.

## Non-Goals For V1

- general team chat
- full Agile ceremony tooling
- complex resource allocation
- enterprise program management
- billing or time tracking

## Functional Requirements

### Task Definition

Every task should support:

- title
- summary
- problem statement
- expected outcome
- scope in
- scope out
- requirements
- acceptance criteria
- priority
- status
- owner
- labels or tags
- links to related tasks
- links to code, docs, PRs, issues, or references

### Daily Execution Tracking

Every task should support:

- execution log entries
- latest update summary
- next step
- blockers
- decision log
- current confidence level

### Structural Clarity

The system should distinguish between:

- initiative
- task
- subtask
- note or update
- decision

## Success Criteria

The system is successful if:

- task creation becomes fast and repeatable
- task context stays understandable after days or weeks
- progress can be updated in under a minute
- scope changes become visible instead of implicit
- agents can consume task data without fragile prompt reconstruction
