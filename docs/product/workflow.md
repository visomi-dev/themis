# Workflow Design: Themis

## Desired Workflow

The task workflow should feel like a disciplined but lightweight progression from idea to execution.

## Task Lifecycle

### 1. Capture

Purpose:

- register the work before it gets lost

Required fields:

- title
- short summary
- owner optional

Status:

- `captured`

### 2. Define

Purpose:

- make the task actionable

Definition checklist:

- problem is clear
- expected outcome is clear
- scope in is defined
- scope out is defined
- requirements exist
- acceptance criteria exist

Status:

- `defined`

### 3. Ready

Purpose:

- confirm the task is executable without major ambiguity

Ready checklist:

- no critical blockers
- owner is known
- dependencies are visible
- next step is known

Status:

- `ready`

### 4. In Progress

Purpose:

- track active execution with frequent low-friction updates

Expected behavior:

- add update log entries
- record decisions
- update blockers
- refresh next step

Status:

- `in_progress`

### 5. Review

Purpose:

- validate that the task outcome matches its definition

Status:

- `review`

### 6. Done

Purpose:

- close the work with enough historical signal for future understanding

Status:

- `done`
