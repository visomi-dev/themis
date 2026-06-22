# Catalyst Open Design System — Software Design Document

## Decision

We will build an in-house design system for Themis, visually inspired by Catalyst and structured as a collection of copyable Angular primitives. It will not be a PrimeNG adaptation or a React wrapper; it will be a manual and selective migration of visual patterns, APIs, and behaviors.

The architectural direction is:

- Catalyst provides visual quality, density, states, `data-slot`, focus rings, touch targets, and composition.
- Nive provides minimal Angular structure, signal-first layout, small components, and optimized APIs.
- Angular v22 provides the modern guidance for signals, `resource`, `linkedSignal`, `httpResource`, and Signal Forms.
- Themis provides the current tokens, Nx constraints, i18n, SSR, dark mode, and real routes for validation.

## Current State

### Themis App

- `apps/web/app/src/styles.css` imports `tailwindcss-primeui`, `primeicons`, and contains global `.p-*` overrides.
- `apps/web/app/src/app/shared/form/form-field` depends on `primeng/message`.
- `apps/web/app/src/app/shared/layout/layout` already uses signals for `mobileMenuOpen` and `sidebarCollapsed`.
- Critical routes and surfaces already exist: auth, activation, dashboard, and projects.

### Catalyst

- Source components live in `~/Downloads/catalyst-ui-kit/typescript`.
- It uses React, `@headlessui/react`, `clsx`, `data-slot`, `data-hover`, `data-active`, `data-current`, pseudo-elements, and advanced Tailwind classes.
- Key patterns to keep: expanded hit areas, input wrappers with pseudo-elements, sidebar items with a current indicator, and responsive layouts with a mobile sidebar dialog.

### Nive Legacy

- Angular components live in `shared/ui` and use `input()`, `computed()`, `effect()`, and `Deps.cls()`.
- The layout in `shared/layout/layout.ts` uses `viewChild`, fragment scrolling, the route fragment as a signal, and readonly effects.
- Input/select components manage disabled state from signals and Reactive Forms.
- Table uses `contentChildren`, `TemplateRef`, and computed maps for column slots.

## Target Architecture

### Folder Structure

The first version will live inside `apps/web/app` to keep iteration fast:

```text
apps/web/app/src/app/shared/ui/
├── actions/
│   ├── button/
│   ├── icon-button/
│   └── link-button/
├── data/
│   ├── avatar/
│   ├── badge/
│   ├── description-list/
│   ├── pagination/
│   └── table/
├── forms/
│   ├── checkbox/
│   ├── field/
│   ├── fieldset/
│   ├── input/
│   ├── input-group/
│   ├── radio-group/
│   ├── select/
│   ├── switch/
│   └── textarea/
├── layout/
│   ├── app-shell/
│   ├── auth-layout/
│   ├── container/
│   ├── page-header/
│   ├── sidebar/
│   ├── stacked-layout/
│   └── topbar/
├── overlays/
│   ├── alert/
│   ├── combobox/
│   ├── dialog/
│   ├── dropdown/
│   └── listbox/
└── typography/
    ├── divider/
    ├── heading/
    └── text/
```

Once the API matures, we will evaluate moving it to `libs/ui` or `libs/design-system` so it can be copied across projects. We will not do that initially to avoid packaging overhead before the API stabilizes.

### Styling Model

Components will define base classes close to the component, like Catalyst, but adapted to Angular:

```ts
const buttonBase = /* tw */ 'relative isolate inline-flex items-baseline justify-center gap-x-2 rounded-lg ...';
const buttonVariants = Object.freeze({ ... });
```

Rules:

- Use `Object.freeze()` maps for variants, sizes, and tones.
- Use `computed()` to resolve classes when they depend on inputs.
- Use `host` for structural component classes.
- Keep `data-slot` on internal elements for icons, labels, descriptions, and errors.
- Replace Headless UI `data-hover` states with native `hover:`, `active:`, `focus-visible:`, or custom attributes only when needed.
- Do not hide critical visual logic in global CSS except for tokens/utilities.

### Token Strategy

Create a token contract in `styles.css` and/or `styles.base.css`:

| Token                  | Usage              |
| ---------------------- | ------------------ |
| `--color-bg`           | General background |
| `--color-panel`        | Panels/cards       |
| `--color-panel-raised` | Elevated surfaces  |
| `--color-fg`           | Primary text       |
| `--color-muted-fg`     | Secondary text     |
| `--color-accent`       | Primary actions    |
| `--color-accent-fg`    | Text on accent     |
| `--color-danger`       | Errors/destructive |
| `--color-ring`         | Focus ring         |
| `--radius-control`     | Controls           |
| `--radius-panel`       | Panels             |

Initial mapping from Themis:

| New            | Current Themis                                 |
| -------------- | ---------------------------------------------- |
| `bg`           | `background` / `surface`                       |
| `panel`        | `surface-container-low`                        |
| `panel-raised` | `surface-container` / `surface-container-high` |
| `fg`           | `on-surface`                                   |
| `muted-fg`     | `on-surface-variant`                           |
| `accent`       | `primary`                                      |
| `accent-fg`    | `on-primary`                                   |
| `danger`       | `error`                                        |
| `ring`         | `primary`                                      |

### Component API Pattern

Conceptual example for `Button`:

```ts
type ButtonVariant = 'solid' | 'outline' | 'plain';
type ButtonTone = 'default' | 'accent' | 'danger' | 'success' | 'warning';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';
```

Expected inputs:

- `variant = input<ButtonVariant>('solid')`
- `tone = input<ButtonTone>('default')`
- `size = input<ButtonSize>('md')`
- `type = input<'button' | 'submit' | 'reset'>('button')`
- `disabled = input(false, { transform: booleanAttribute })`
- `loading = input(false, { transform: booleanAttribute })`

Outputs should only exist when the component abstracts its own behavior. Simple buttons should let Angular handle native events.

### Forms Strategy

Phase 1:

- Use typed Reactive Forms to migrate away from PrimeNG without being blocked by Angular 22.
- Provide accessible field wrappers with `label`, `description`, `error`, `fieldId`, and slots.
- Create Catalyst-inspired inputs: wrapper with ring, icon slots, invalid state, and disabled state.

Phase 2:

- Upgrade Themis to Angular 22.
- Adopt Signal Forms for new forms once the project is ready for that API.
- Keep visual wrappers agnostic to the forms engine so they can support `formControlName`, signal field bindings, or native controls.

### Overlay Strategy

Catalyst uses Headless UI for dialog, dropdown, combobox, and listbox. We will not port that dependency to Angular. Alternatives in order:

1. Angular CDK primitives for overlay, focus trap, portal, and a11y.
2. Minimal in-house implementation only when the case is simple and testable.
3. Defer complex components until the base primitives are stable.

### Layout Strategy

`AppShell` will unify the best parts of Catalyst and Nive:

- Fixed desktop sidebar with tokenized width.
- Dialog-like mobile sidebar with backdrop, escape handling, and close-on-navigation.
- Compact mobile topbar.
- Main content with controlled scroll and tonal surfaces instead of hard borders.
- Route state derived from signals, not manual subscriptions without cleanup.
- SSR-safe fragment scrolling if the Nive behavior is preserved.

### Website Strategy

The website does not need interactive Angular components, but it must share:

- Tailwind tokens.
- Typography.
- Surface rules.
- Equivalent visual primitives in Astro where applicable.
- Recipe documentation and examples for landing, auth, and dashboard surfaces.

## Angular AI Guide Applications

We will apply these recommendations:

- Separate live input from submit intent for AI/open-design UI: one signal for text being edited and another for request params.
- Use `resource` or `httpResource` for declarative loading when data belongs to a component.
- Use `linkedSignal` when an async response needs to preserve previous state, such as prompt history, previews, or incremental UI generation.
- Use resource `isLoading`, `hasValue`, and `error` states for loaders and retries.
- Scope resources to the component that consumes the data to reduce work in zoneless/hydration scenarios.
- In SSR/hydration, render initial content and defer non-critical AI/open-design experiences to the client.

## Open Design Integration Design

Add a documentation and prompt layer that makes the design system agent-friendly:

```text
docs/design-system/
├── tokens.md
├── components.md
├── recipes.md
├── accessibility.md
├── migration-prime-ng.md
└── open-design-agent-rules.md
```

Required content:

- Token inventory and intent.
- Component status table: planned, alpha, stable, migrated.
- Recipes for auth form, app shell, dashboard card, data table, and settings form.
- Agent rules: no PrimeNG, no direct CSS variables in templates, use `data-slot`, keep focus visible, and use Angular signals.

## Risks

| Risk                                           | Mitigation                                                      |
| ---------------------------------------------- | --------------------------------------------------------------- |
| Literal Catalyst ports feel un-Angular         | Adapt the API manually and keep only visual/behavioral patterns |
| Overlay components take too long               | Prioritize forms/layout/actions; use Angular CDK for overlay    |
| Angular 22 APIs are unavailable in current app | Separate the framework upgrade from the visual migration        |
| App/site duplication                           | Share tokens first, then interactive primitives                 |
| Dynamic Tailwind classes are not detected      | Keep literal classes in maps and templates                      |
| Custom controls miss accessibility details     | Add AXE and keyboard tests from the first migrated route        |

## Success Criteria

- New screens can be built without PrimeNG.
- Auth, activation, dashboard, and projects use in-house primitives in successive phases.
- The app and website share visual language and tokens.
- The component package can be copied into another repo without dragging Themis dependencies.
- Lint, unit tests, and critical e2e tests pass through Nx.
