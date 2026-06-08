# Delivery Plan: Themis

## Suggested Phases

### Phase 1: Task Definition Core

Build:

- task entity
- task detail screen
- scope fields
- requirements
- acceptance criteria
- status flow

### Phase 2: Daily Execution Layer

Build:

- update composer
- update log timeline
- next step field
- blockers
- stale task surfacing

### Phase 3: Initiative Layer

Build:

- initiative grouping
- initiative view
- task relationships

### Phase 4: Agent Layer

Build:

- agent-readable task view
- agent update endpoints
- structured task export

### Phase 5: Workflow Automation

Build:

- reminders for stale tasks
- automatic summaries
- optional queue-backed processing

## Recommended First Technical Slice

For this standalone monorepo, the first implementation should likely be:

- Angular frontend under the application surface
- API endpoints in `apps/web/api`
- PostgreSQL-backed persistence later in the implementation sequence
- mounted through `apps/web/server`

## SSR Compatibility Hardening

Refactor the Angular app to author server-compatible components per the [Angular SSR guide](https://angular.dev/guide/ssr#authoring-server-compatible-components). Replaces `isPlatformBrowser` / `isPlatformServer` checks with platform-specific provider implementations.

- See spec: [`docs/specs/2026-06-08-ssr-browser-refactor/`](./specs/2026-06-08-ssr-browser-refactor/)
- Branch: `feat/OC/ssr-browser-refactor`
- Version target: `1.1.0`
