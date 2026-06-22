# Catalyst Open Design System — Implementation Plan

## Phase 0 — Inventory And Decisions

1. Audit current PrimeNG dependencies in `apps/web/app`.
2. Create an inventory of Catalyst components that will be ported in V1.
3. Create an inventory of Nive components that will serve as structural references.
4. Define final naming: `app-` prefix for internal components and classes without suffixes.
5. Decide whether `Deps.cls()` remains the official class helper or is replaced by a smaller local utility.
6. Document the initial public APIs for each component.

## Phase 1 — Token Foundation

1. Extract current Themis tokens from `styles.base.css`, `apps/web/app/src/styles.css`, and `docs/design/design-system-reference.md`.
2. Define the new Catalyst/Open Design taxonomy in `@theme`.
3. Create required global utilities: focus ring, panel surface, touch target, and text balance if applicable.
4. Remove the conceptual dependency on `tailwindcss-primeui` from new components, without deleting it yet.
5. Create initial docs in `docs/design-system/tokens.md`.
6. Validate that dark mode still works with `Settings`/`theme-init`.

## Phase 2 — Core Actions And Typography

1. Implement `Button` with `solid`, `outline`, and `plain` variants plus `default`, `accent`, and `danger` tones.
2. Implement `IconButton` and `TouchTarget`.
3. Implement `LinkButton` for Angular routes and normal anchors if needed.
4. Implement `Heading`, `Text`, and `Divider`.
5. Migrate simple buttons in auth or activation as the first proof point.
6. Add unit tests for basic inputs/classes and disabled/loading states.

## Phase 3 — Form Primitives

1. Implement `Field`, `Fieldset`, `Label`, `Description`, and `ErrorMessage` without PrimeNG.
2. Implement `Input` and `InputGroup` with icon slots and invalid/disabled/loading states.
3. Implement native `Textarea` and `Select`.
4. Implement `Checkbox`, `RadioGroup`, and `Switch` with keyboard accessibility.
5. Migrate `app-form-field` to remove `primeng/message`.
6. Migrate sign-in, sign-up, verify-email, and forgotten-password.
7. Document the Signal Forms strategy after Angular 22.

## Phase 4 — Layout System

1. Implement `AppShell` based on Catalyst `sidebar-layout` and Nive `layout`.
2. Implement `Sidebar`, `SidebarSection`, `SidebarItem`, `SidebarHeading`, `SidebarDivider`, and `SidebarSpacer`.
3. Implement `Topbar`, `Container`, `PageHeader`, `AuthLayout`, and `StackedLayout`.
4. Migrate `shared/layout/layout`, `sidebar-menu`, and `topbar` to the new primitives.
5. Validate the mobile menu with keyboard, escape, backdrop, and close-on-navigation.
6. Adjust routes with `hideAppShell` if needed, without moving auth logic into components.

## Phase 5 — Data Display

1. Port `Badge`, `Avatar`, `DescriptionList`, and `Pagination` from Catalyst.
2. Evolve the Nive `Table` with Catalyst styling and optional mobile cards.
3. Migrate projects overview and dashboard to test density, empty states, and responsive behavior.
4. Add recipes for dashboard cards and data tables.

## Phase 6 — Overlays And Advanced Controls

1. Define the minimal Angular CDK dependency for overlay/focus/a11y if it is not already covered.
2. Implement `Dialog` with focus trap, escape, backdrop, and scroll lock.
3. Implement `Dropdown` for navigation/account menus.
4. Implement `Listbox` and `Combobox` only if Themis has real use cases.
5. Implement `Alert` as a non-modal visual primitive.
6. Add keyboard e2e tests for dialog/dropdown.

## Phase 7 — Website Redesign Alignment

1. Map app tokens to `apps/web/site/src/styles/global.css`.
2. Define equivalent Astro components or snippets for buttons, panels, badges, and layout sections.
3. Redesign the landing page using the Catalyst/Open Design language and existing references in `docs/design/assets`.
4. Validate desktop/mobile and dark mode.
5. Extract i18n if Angular copy changes; review Astro content according to the site pipeline.

## Phase 8 — PrimeNG Removal

1. Search for `primeng/*` imports, `primeicons`, `tailwindcss-primeui`, and `.p-*` classes.
2. Migrate each remaining dependency to an in-house component.
3. Remove global `.p-*` overrides from `styles.css`.
4. Remove PrimeNG/PrimeIcons packages if no imports remain.
5. Run affected lint, tests, and builds.

## Phase 9 — Portability Package

1. Create `docs/design-system/components.md` with APIs and examples.
2. Create `docs/design-system/recipes.md` with copyable patterns.
3. Create `docs/design-system/open-design-agent-rules.md` for agents.
4. Evaluate moving components to `libs/ui` if the API is stable.
5. Document the checklist for copying the system into other projects.

## Migration Order

Recommended order to reduce risk:

1. Tokens and docs.
2. Button/Text/Field/Input.
3. Auth routes.
4. App shell.
5. Projects/dashboard.
6. Website.
7. Advanced overlays.
8. Final PrimeNG removal.

## Nx Verification Commands

Use Nx commands, not direct tooling:

```bash
pnpm nx lint app
pnpm nx test app
pnpm nx e2e app-e2e
pnpm nx build app
pnpm nx lint site
pnpm nx build site
```

If a target is missing or changes, inspect it first with:

```bash
pnpm nx show project app --json
pnpm nx show project site --json
```
