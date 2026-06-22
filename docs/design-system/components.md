# Themis UI Components

Components live under `apps/web/app/src/app/shared/ui` and are imported directly from source files.

## Actions

- `Button`: native button with `variant`, `tone`, `size`, `type`, `disabled`, and `loading` inputs.
- `IconButton`: icon-only native button requiring `aria-label`.
- `LinkButton`: anchor or router link styled as a button.
- `TouchTarget`: wrapper for projected controls that need a 44px target.

## Forms

- `Field`, `Fieldset`, `Label`, `Description`, and `ErrorMessage` provide form chrome.
- `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, and `Switch` implement `ControlValueAccessor`.
- Visual state is explicit through inputs such as `invalid`, `disabled`, and `aria-describedby`.

## Layout

- `AppShell`, `Sidebar`, `Topbar`, `StackedLayout`, `AuthLayout`, `Container`, and `PageHeader` provide generic app chrome.
- Layout primitives do not import domain services.

## Data

- `Avatar`, `Badge`, `DescriptionList`, `Pagination`, and `Table` provide display primitives.
- `Table` is intentionally compositional and projects native table sections.

## Overlays

- `Alert` is a non-modal status primitive.
- `Dialog` uses Angular CDK focus trap.
- `Dropdown` and `Combobox` use Angular CDK connected overlays.
- `Listbox` provides keyboard selection semantics and `ControlValueAccessor` support.
