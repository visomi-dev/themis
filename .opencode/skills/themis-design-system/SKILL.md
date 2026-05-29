---
name: themis-design-system
description: Generate Themis-branded product surfaces with preserved design tokens, Angular source examples, runnable UI kit, and technical manuscript posture.
license: MIT
compatibility: opencode
metadata:
  audience: designers
  workflow: design-system
---

## What I do

- Guide generation of Themis product screens, dashboards, app shells, auth flows, and project/workspace prototypes
- Enforce canonical design tokens (Slate & Syntax light / Night Edition dark) from `colors_and_type.css`
- Reference preserved source-backed Angular patterns from `source_examples/` for sidebar, logo, sign-in, projects, and project-detail
- Provide a runnable React/Babel UI kit in `ui_kits/app/` for interactive workspace prototypes
- Validate output against preview cards in `preview/` for color, typography, spacing, buttons, inputs, and brand assets
- Preserve Themis voice: concise technical nouns, honest placeholders, no fake metrics, no decorative chat-first noise
- Use preserved brand assets (`assets/`, `build/`) instead of redrawing logos

## When to use me

Use this when a brief asks for Themis product surfaces, operational dashboards, developer task ledgers, app shells, auth/project/workspace prototypes, or previews that must match the preserved Themis source posture.

Do not use for playful consumer products, image-led editorial pages, decorative chat-first assistants, or generic SaaS dashboards unless the brief explicitly asks for Themis' operational manuscript language.

## How to use

1. Read `DESIGN.md` before generating — it is the canonical design-system contract
2. Import `colors_and_type.css` first; bind existing tokens, don't invent new palette names
3. Light mode by default; dark mode via `data-theme="dark"` or `.dark`
4. Reference `source_examples/` for sidebar, logo, sign-in, projects, and project-detail patterns
5. Check relevant `preview/` card before final output
6. Start app/workspace prototypes from `ui_kits/app/`
