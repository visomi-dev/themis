# Themis UI Tokens

The Angular UI foundation uses the **Catalyst** token surface directly. Tokens are defined in `styles.base.css` inside Tailwind v4's `@theme` block, and components consume them through Tailwind utilities and the `ui-*` utility classes.

## Color Tokens

| Token                   | Usage              | Light value            | Dark value                | Tailwind class         |
| ----------------------- | ------------------ | ---------------------- | ------------------------- | ---------------------- |
| `--color-bg`            | App background     | `#ffffff`              | `#09090b`                 | `bg-bg`                |
| `--color-panel`         | Cards and controls | `#fafafa` (`zinc-50`)  | `#18181b` (`zinc-900`)    | `bg-panel`             |
| `--color-panel-raised`  | Elevated surfaces  | `#f4f4f5` (`zinc-100`) | `#27272a` (`zinc-800`)    | `bg-panel-raised`      |
| `--color-fg`            | Primary text       | `#09090b` (`zinc-950`) | `#fafafa` (`zinc-50`)     | `text-fg`              |
| `--color-muted-fg`      | Secondary text     | `#71717a` (`zinc-500`) | `#a1a1aa` (`zinc-400`)    | `text-muted-fg`        |
| `--color-accent`        | Primary action     | `#2563eb` (`blue-600`) | `#3b82f6` (`blue-500`)    | `bg-accent`            |
| `--color-accent-fg`     | Text on accent     | `#ffffff`              | `#ffffff`                 | `text-accent-fg`       |
| `--color-danger`        | Error/destructive  | `#dc2626` (`red-600`)  | `#ef4444` (`red-500`)     | `bg-danger`            |
| `--color-danger-fg`     | Text on danger     | `#ffffff`              | `#ffffff`                 | `text-danger-fg`       |
| `--color-ring`          | Focus ring         | `#2563eb`              | `#3b82f6`                 | `box-shadow` driver    |
| `--color-border`        | Standard divider   | `rgb(9 9 11 / 0.10)`   | `rgb(255 255 255 / 0.10)` | `border-border`        |
| `--color-border-subtle` | Quiet divider      | `rgb(9 9 11 / 0.05)`   | `rgb(255 255 255 / 0.05)` | `border-border-subtle` |

## Soft Fills

Catalyst does not define explicit soft fill variables. Use `color-mix` to compose soft fills inline, or rely on Tailwind opacity utilities:

```css
/* Soft accent fill, 10% opacity over the surface */
background: color-mix(in srgb, var(--color-accent) 10%, transparent);
```

```html
<!-- Equivalent Tailwind utility -->
<div class="bg-accent/10 text-accent">Soft accent surface</div>
```

## Radius Tokens

| Token              | Value     | Use                |
| ------------------ | --------- | ------------------ |
| `--radius-sm`      | `0.5rem`  | Small controls     |
| `--radius-control` | `0.5rem`  | Inputs and buttons |
| `--radius-panel`   | `0.75rem` | Cards and panels   |
| `--radius-full`    | `9999px`  | Pills              |

## Shadow Tokens

| Token            | Use                        |
| ---------------- | -------------------------- |
| `--shadow-sm`    | Cards above the canvas     |
| `--shadow-md`    | Popovers, command palettes |
| `--shadow-panel` | Dialogs, elevated panels   |

## Font Tokens

| Token            | Family         | Use                 |
| ---------------- | -------------- | ------------------- |
| `--font-sans`    | Inter          | Body text           |
| `--font-heading` | Manrope        | Display, headings   |
| `--font-mono`    | JetBrains Mono | IDs, commands, logs |

## Reusable Utilities

- `ui-focus-ring`: visible keyboard focus treatment driven by `--color-ring`.
- `ui-panel`: default panel surface with a `--color-border-subtle` border.
- `ui-panel-raised`: elevated surface with shadow and a `--color-border-subtle` border.
- `ui-touch-target`: 44px minimum interactive target.
- `ui-text-rhythm`: readable paragraph rhythm for long-form text.

## Dark Mode

Dark mode applies when the `<html>` element carries the `dark` class:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

The `html.dark` block in `styles.base.css` redefines the same token set with the dark mode Tailwind values. Components that use the tokens through Tailwind utilities (`bg-bg`, `text-fg`, `border-border`) automatically pick up the dark values without per-component dark mode rules.

## Compatibility Aliases

A short list of legacy Material 3 token names is still aliased to the new tokens for the few callers that have not migrated yet. These aliases are temporary and will be removed once the components in `shared/ui` adopt the new tokens.

| Legacy                       | Maps to             |
| ---------------------------- | ------------------- |
| `--color-background`         | `--color-bg`        |
| `--color-on-background`      | `--color-fg`        |
| `--color-on-surface`         | `--color-fg`        |
| `--color-on-surface-variant` | `--color-muted-fg`  |
| `--color-primary`            | `--color-accent`    |
| `--color-on-primary`         | `--color-accent-fg` |
| `--color-error`              | `--color-danger`    |
| `--color-on-error`           | `--color-danger-fg` |
| `--font-family`              | `--font-sans`       |
| `--font-family-display`      | `--font-heading`    |
| `--font-family-mono`         | `--font-mono`       |
