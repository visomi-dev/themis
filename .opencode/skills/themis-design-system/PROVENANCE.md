# Provenance Notes

## Source Intake

- Project source folder: `/home/visomi/Projects/GitHub/visomi-dev/themis`.
- Required runbook: `context/source-context.md`.
- Evidence note: `context/local-code/themis.md`.
- Manual snapshots: `context/local-code/themis/files/`.

The bounded local intake wrapper could not run in this chat because `OD_NODE_BIN` and `OD_BIN` were missing from the execution environment. The linked local folder was readable, so source evidence was manually captured into the same project-local context area before final package files were generated.

## Preserved Evidence

- Source tokens: `styles.base.css`, `DESIGN.md`, `DESIGN_DARK.md`, `apps/web/app/src/styles.css`.
- Product context: `README.md`, `docs/product/prd.md`.
- Source-backed components: sidebar menu, logo, sign-in form, form field, projects list, project detail, landing page.
- Assets: wordmark, isotype, favicon SVG/ICO, sign-in screenshot, projects overview screenshot.

## Generated Package Files

- Canonical rules: `DESIGN.md`.
- Package guide: `README.md`.
- Agent entry: `SKILL.md`.
- Tokens: `colors_and_type.css`.
- Preview cards: `preview/*.html`.
- Applied kit: `ui_kits/app/`.
- Reusable source references: `source_examples/`.

## Audit Limitation

The configured design-system package audit command was attempted but unavailable because the wrapper paths were absent. A local consistency check verified required files, preview manifest entries, preserved assets, component globals, and UI-kit token imports.
