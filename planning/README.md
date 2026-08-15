# Local Themis Workflow

This directory contains human-readable planning artifacts for the local OpenCode prototype.

Use the `/themis-workflow` command to coordinate the lifecycle. State mutations must use the `themis_*` custom tools and must not edit `.themis/state.json` or `.themis/events.ndjson` directly.

The default OpenCode agent is `themis-coordinator`. The workflow separates planning, execution, verification, and review agents.

## CLI

Use the local CLI through the workspace script:

```text
pnpm themis --help
pnpm themis status
pnpm themis ready --sprint SPR-001
pnpm themis events --limit 20
pnpm themis validate
```

All operational mutations are also available as CLI commands, including `work-create`, `work-transition`, `sprint-propose`, `sprint-approve`, `sprint-activate`, `claim`, `run-start`, `run-finish`, `evidence-add`, `review-request`, and `review-submit`.

Use `--json` for scripts and automation.

## TUI

Open the interactive terminal dashboard with:

```text
pnpm themis tui
```

The dashboard shows sprint lanes, ready work, blocked work, active runs, and review counts. Use `h`/left and `l`/right to change lanes, `r` to reload state, and `q`, Escape, or Ctrl-C to exit.

## Runtime State

Runtime state is intentionally ignored by Git:

```text
.themis/state.json
.themis/events.ndjson
```

The fixture is versioned at `.themis/fixtures/sample-workflow.json`.

## Verification

Run the domain tests:

```text
node --experimental-strip-types --test scripts/themis-core.test.ts
```

Run the public OpenCode tools end to end:

```text
node --experimental-strip-types --test scripts/themis-tools.e2e.test.ts
```

After changing an OpenCode skill, agent, command, tool, or `opencode.json`, restart OpenCode so it reloads the project configuration.
