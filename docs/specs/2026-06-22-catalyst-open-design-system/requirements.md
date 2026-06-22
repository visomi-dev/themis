# Catalyst Open Design System — Requirements

## Context

Themis needs to replace its visual dependency on PrimeNG with an in-house design system that is portable and deeply customizable. The goal is to build a first Angular version of a shadcn-like system: copyable Tailwind CSS components with Catalyst's visual quality and the optimized Angular structure previously explored in Nive.

Reviewed sources:

- Current Themis: `apps/web/app`, `apps/web/site`, `docs/design`, `docs/architecture/frontend/angular-conventions.md`.
- Catalyst UI Kit: `~/Downloads/catalyst-ui-kit/typescript`.
- Nive legacy: `~/Projects/GitHub/visomi-dev/.legacy/nive-v4/projects/webapp/src/app/shared/ui` and `shared/layout`.
- Angular AI guide: `https://angular.dev/ai`, `https://angular.dev/ai/develop-with-ai`, `https://angular.dev/ai/design-patterns`.

## Goals

1. Create an in-house Angular design system for Themis with Catalyst-inspired visuals, not a PrimeNG wrapper.
2. Keep components small, copyable, and modifiable, similar to shadcn, without a heavy UI runtime.
3. Progressively replace PrimeNG in `app` and avoid introducing it in new surfaces.
4. Unify the app and website under the same tokens, primitives, and visual rules.
5. Preserve performance: Tailwind utilities, standalone components, signals, lazy routes, SSR-safe code, and minimal global logic.
6. Prepare the foundation for Angular 22 patterns, including Signal Forms where appropriate.
7. Keep WCAG AA accessibility and keyboard support as non-negotiable requirements.
8. Allow the system to be copied into other projects with minimal coupling to Themis.

## Non-Goals

1. Do not migrate all of Themis in one large change.
2. Do not create a public npm library in this first version.
3. Do not port Catalyst literally file by file when a component does not provide immediate value.
4. Do not depend on `@headlessui/react`, React, Motion React, or PrimeNG for new components.
5. Do not add backward-compatible APIs for PrimeNG unless a temporary migration requires it.

## Functional Requirements

### Design Tokens

- The system must define color, typography, spacing, radius, shadow, focus, z-index, and motion tokens in Tailwind CSS v4.
- Tokens must live in `@theme` and `@utility`, not as loose variables used directly in templates.
- There must be a documented bridge that maps current Themis tokens (`primary`, `surface`, `on-surface`, etc.) to the new Catalyst-like vocabulary.
- Dark mode must keep using the configured `dark` variant: `@custom-variant dark (&:where(.dark, .dark *))`.

### Base Components

The first version must include these primitives:

| Group      | Components                                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Actions    | `Button`, `LinkButton`, `IconButton`, `TouchTarget`                                                                                          |
| Forms      | `Field`, `Fieldset`, `Label`, `Description`, `ErrorMessage`, `Input`, `InputGroup`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch` |
| Layout     | `AppShell`, `Sidebar`, `SidebarItem`, `Topbar`, `StackedLayout`, `AuthLayout`, `PageHeader`, `Container`                                     |
| Data       | `Table`, `Pagination`, `DescriptionList`, `Badge`, `Avatar`                                                                                  |
| Overlay    | `Dialog`, `Dropdown`, `Combobox`, `Listbox`, `Alert`                                                                                         |
| Typography | `Heading`, `Text`, `Divider`                                                                                                                 |

### Angular API

- All components must use `input()` and `output()`.
- Derived state must use `computed()`.
- Local mutable state must use `signal()`.
- Effects must be declared as `readonly` properties, never in constructors.
- New forms must evaluate Angular 22 Signal Forms; if the project remains on Angular 21 during the initial phase, typed Reactive Forms will be used and the migration path will be documented.
- Do not use `@Input()`, `@Output()`, `@HostBinding()`, or `@HostListener()`.
- Templates must use `@if`, `@for`, and `@switch`; do not use `*ngIf` or `*ngFor`.

### Accessibility

- All interactive controls must have accessible names.
- Touch targets must respect at least 44x44 px where applicable, following Catalyst's `TouchTarget` pattern.
- Focus rings must be visible and consistent for keyboard users.
- Dialog, dropdown, combobox, and listbox components must manage focus, escape, ARIA roles, and keyboard navigation.
- Critical app and website routes must pass AXE checks.

### Performance

- The system must not introduce a heavy visual runtime.
- Components must be tree-shakable and standalone.
- Classes must be static or computed from small maps; avoid complex builders during render.
- The layout must minimize DOM changes between desktop and mobile.
- Prefer CSS/Tailwind and signals over global listeners.

### Open Design Integration

- The design system must be documented as the source of truth for tokens, components, and recipes.
- Each component must include a portable usage recipe, similar to shadcn.
- There must be an inventory of visual and accessibility decisions so agents can generate new screens without breaking the visual language.
- The docs must make it easy to copy components and Tailwind configuration into other projects.

## Constraints

- Themis currently uses Angular `21.2.x`; Angular v22 is an explicit migration target before adopting stable v22-only APIs such as stable Signal Forms or `@Service`, if that pattern is chosen.
- Nx tasks must be executed with `pnpm nx ...`.
- Filenames must be kebab-case.
- Angular components must use external templates and styles.
- The website uses Astro; the app uses Angular. The token layer must be shareable, but interactive primitives will be implemented for Angular first.
