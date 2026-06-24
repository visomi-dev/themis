# Themis UI Components

Components live under `apps/web/app/src/app/shared/ui` and are imported directly from source files.

All component classes are composed from the **Catalyst** token set defined in [`tokens.md`](./tokens.md). Components use Tailwind utilities (`bg-accent`, `text-fg`, `border-border`) and `data-*` state selectors (`data-hover`, `data-current`, `data-invalid`, `data-checked`) instead of dynamic class names.

## Actions

- `Button`: native button with `variant`, `tone`, `size`, `type`, `disabled`, and `loading` inputs.
  - `variant` is `'solid' | 'outline' | 'plain'`.
  - `tone` uses Catalyst color names: `'zinc' | 'blue' | 'red' | 'green' | 'amber'`.
  - Solid buttons follow the Catalyst optical-border pattern: `--btn-bg` and `--btn-border` custom properties drive the `before` pseudo-element fill and the `after` pseudo-element inset highlight shadow.
- `IconButton`: icon-only native button requiring `aria-label`. Uses the same `--btn-*` custom properties as `Button`.
- `LinkButton`: anchor or router link styled as a button.
- `TouchTarget`: wrapper for projected controls that need a 44px target.

## Forms

- `Field`, `Fieldset`, `Label`, `Description`, and `ErrorMessage` provide form chrome. `Field` exposes `data-invalid` so the child controls can target it.
- `Input`, `PasswordInput`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `RadioCard`, `ColorPicker`, `PinInput`, and `Switch` implement `ControlValueAccessor`.
- Input borders use `border-border`, switch to `data-invalid:border-danger` when the field is invalid, and switch to `focus:border-accent` while focused.
- Checkbox, radio, and switch selected states use `data-checked:bg-accent` and `data-checked:text-accent-fg`.
- `RadioCard` uses `data-checked:border-accent data-checked:ring-ring/20` for the selected card.
- Visual state is explicit through inputs such as `invalid`, `disabled`, and `aria-describedby`.

## Layout

- `AppShell`, `Sidebar`, `Topbar`, `BottomNavigation`, `PageLoader`, `StackedLayout`, `AuthLayout`, `Container`, `Card`, and `PageHeader` provide generic app chrome.
- `Sidebar` items use `data-current:bg-accent/10 data-current:text-accent` for the active entry.
- `Topbar` and `Container` use `border-border` for the divider lines.
- Layout primitives do not import domain services.

## Feedback And Media

- `Loader` provides the Nive four-dot loading animation with token-aligned colors.
- `Icon` provides a small static SVG icon set without runtime dynamic imports.

## Data

- `Avatar`, `Badge`, `DescriptionList`, `Pagination`, and `Table` provide display primitives.
- `Badge` exposes a `data-tone` attribute that maps to `bg-accent/10 text-accent` (and similar patterns for the other tones) instead of using hard-coded `primary-container` colors.
- `Table` can project native table sections or render Nive-style declarative `columns`, `data`, and `ng-template appTableCell` cells.

## Overlays

- `Alert` is a non-modal status primitive. Its background and border colors come from `data-tone` selectors with `bg-accent/5` and `border-accent/20` for the default tone.
- `Tooltip` provides a simple keyboard-accessible disclosure tooltip.
- `ClickOutside` provides a lightweight directive for simple dismissible surfaces.
- `Dialog` uses Angular CDK focus trap.
- `Dropdown`, `Listbox`, and `Combobox` use Angular CDK connected overlays. Selected options use `data-active:bg-accent/10 data-active:text-accent`.

## Token Usage

Components must consume tokens through:

1. Tailwind utilities (`bg-bg`, `bg-panel`, `bg-panel-raised`, `text-fg`, `text-muted-fg`, `bg-accent`, `text-accent-fg`, `bg-danger`, `text-danger-fg`, `border-border`, `border-border-subtle`).
2. The `ui-*` utility classes for shared behaviors (`ui-focus-ring`, `ui-panel`, `ui-panel-raised`, `ui-touch-target`, `ui-text-rhythm`).
3. `data-*` state selectors for state-dependent styling (`data-hover:*`, `data-active:*`, `data-checked:*`, `data-current:*`, `data-invalid:*`, `data-loading:*`).

Components must not:

- Use raw CSS variables in templates or component classes. The `@theme` block is the single source of truth.
- Use Material 3 token names (`color-surface-container-low`, `color-primary-container`, `color-on-primary-container`, `color-tertiary`, etc.). The legacy aliases in `styles.base.css` exist only as a temporary shim.
- Construct class names dynamically with string interpolation. Tailwind only detects literal class names.
