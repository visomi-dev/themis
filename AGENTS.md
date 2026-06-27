<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# Themis Repository Rules

Themis is an Nx monorepo with Angular frontend apps and Node backend runtimes. Keep root instructions concise and load area-specific guidance only when it is relevant to the task.

## Mandatory Rules

- All repository artifacts must be written in English, including specs, docs, comments, code identifiers, commit messages, UI copy, test names, and generated files.
- User-facing localized content may be translated through the existing i18n flow, but source text and documentation should remain English unless a file is explicitly a translation resource.
- Build context by inspecting the codebase first; follow existing files before introducing new names, folders, or patterns.
- Prefer the smallest correct change and do not mix unrelated refactors with feature work.
- Use TypeScript strict patterns, avoid `any`, prefer `unknown` when type shape is uncertain, and use `type` instead of `interface`.
- Keep imports at the top. Use `import type` for type-only imports. Do not use dynamic `import()` outside the documented `Deps` service exception and Angular route `loadComponent` callbacks.
- All filenames must be kebab-case. Component and service files use the bare name without suffixes. Test files use `.spec.ts`.

## Context Loading

OpenCode does not automatically expand file references from this document. Before editing, read the relevant guidance files on a need-to-know basis and treat them as mandatory instructions for that area.

- Frontend Angular work: read `docs/agents/frontend.md`.
- Backend, API, worker, realtime, validation, or tenancy work: read `docs/agents/backend.md`.
- Playwright, end-to-end, route-flow, or auth-flow testing work: read `docs/agents/e2e.md`. For e2e work that needs the full gateway (api + app + site + worker + realtime) running, follow the "Full-Server E2E Playbook" section there before changing tests or hooks.
- Tailwind, UI polish, visual design, accessibility, or design-token work: read `docs/agents/design-system.md`.
- Authoring a Themis UI prototype (HTML + Tailwind v4, run in the local preview server) without touching Angular: use the `themis-ui-prototype` opencode skill.
- Feature planning, implementation slicing, PR boundaries, or multi-agent handoff work: read `docs/agents/workflow.md`.
- Code review requests: read `docs/agents/review.md`.

If a task touches multiple areas, read each relevant file before editing. Do not preemptively load every reference for narrow changes.

## Development Workflow

- Prefer small, vertical, reviewable changes over broad layer-based PRs.
- A PR should usually contain one user-visible behavior slice, one API contract change, one route/page state, one E2E scenario group, or one enabling refactor.
- Avoid combining infrastructure, product behavior, broad refactors, and E2E coverage in one PR unless the work cannot be reviewed independently.
- If a change exceeds roughly 500 changed lines, consider splitting it. If it exceeds roughly 1000 changed lines, document why it cannot be split.
- Separate enabling test utilities, fixtures, schemas, or shared helpers from feature behavior when practical.
- Use stacked PRs or an integration branch for large features that cannot land independently.
- Each completed change should include focused verification through the relevant Nx target when feasible.
- Leave handoff notes when work is incomplete or when another agent will continue the feature.

## Project Architecture

- Follow Screaming Architecture: folder names should reveal product domains, not generic framework concepts.
- Do not create top-level `services/`, `models/`, `components/`, or `pages/` folders that mix multiple domains.
- Cross-domain communication should use shared services, contracts, or dedicated feature libraries; do not deep-import private implementation files from another feature.
- Cross-cutting runtime and platform code shared across backend runtimes belongs in `libs/shared`. Feature-shared domain code belongs in a dedicated feature library.

## Verification

- Use Nx for lint, test, build, and e2e commands.
- Prefix Nx commands with the workspace package manager, for example `pnpm nx run <project>:<target>`.
- Always prefer focused verification for the files or project touched before broader workspace checks.
- If verification cannot be run, report the reason and the exact command that should be run later.
