# Themis UI Components

Components live under `apps/web/app/src/app/shared/ui` and are imported directly from source files.

## Actions

- `Button`: native button with `variant`, `tone`, `size`, `type`, `disabled`, and `loading` inputs.
- `IconButton`: icon-only native button requiring `aria-label`.
- `LinkButton`: anchor or router link styled as a button.
- `TouchTarget`: wrapper for projected controls that need a 44px target.

## Forms

- `Field`, `Fieldset`, `Label`, `Description`, and `ErrorMessage` provide form chrome.
- `Input`, `PasswordInput`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `RadioCard`, `ColorPicker`, `PinInput`, and `Switch` implement `ControlValueAccessor`.
- Visual state is explicit through inputs such as `invalid`, `disabled`, and `aria-describedby`.

## Layout

- `AppShell`, `Sidebar`, `Topbar`, `BottomNavigation`, `PageLoader`, `StackedLayout`, `AuthLayout`, `Container`, `Card`, and `PageHeader` provide generic app chrome.
- Layout primitives do not import domain services.

## Feedback And Media

- `Loader` provides the Nive four-dot loading animation with token-aligned colors.
- `Icon` provides a small static SVG icon set without runtime dynamic imports.

## Data

- `Avatar`, `Badge`, `DescriptionList`, `Pagination`, and `Table` provide display primitives.
- `Table` can project native table sections or render Nive-style declarative `columns`, `data`, and `ng-template appTableCell` cells.

## Overlays

- `Alert` is a non-modal status primitive.
- `Tooltip` provides a simple keyboard-accessible disclosure tooltip.
- `ClickOutside` provides a lightweight directive for simple dismissible surfaces.
- `Dialog` uses Angular CDK focus trap.
- `Dropdown` and `Combobox` use Angular CDK connected overlays.
- `Listbox` provides keyboard selection semantics and `ControlValueAccessor` support.
