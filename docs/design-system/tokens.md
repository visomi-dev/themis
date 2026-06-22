# Themis UI Tokens

The Angular UI foundation maps Catalyst-style component tokens to existing Themis design tokens.

| Token                  | Usage              | Mapping                          |
| ---------------------- | ------------------ | -------------------------------- |
| `--color-bg`           | App background     | `--color-background`             |
| `--color-panel`        | Cards and controls | `--color-surface-container-low`  |
| `--color-panel-raised` | Elevated surfaces  | `--color-surface-container-high` |
| `--color-fg`           | Primary text       | `--color-on-surface`             |
| `--color-muted-fg`     | Secondary text     | `--color-on-surface-variant`     |
| `--color-accent`       | Primary action     | `--color-primary`                |
| `--color-accent-fg`    | Text on accent     | `--color-on-primary`             |
| `--color-danger`       | Error/destructive  | `--color-error`                  |
| `--color-ring`         | Focus ring         | `--color-primary`                |
| `--radius-control`     | Inputs and buttons | `0.5rem`                         |
| `--radius-panel`       | Panels and cards   | `0.75rem`                        |

Reusable utilities:

- `ui-focus-ring`: visible keyboard focus treatment.
- `ui-panel`: default panel surface.
- `ui-panel-raised`: elevated surface with shadow.
- `ui-touch-target`: 44px minimum interactive target.
- `ui-text-rhythm`: readable paragraph rhythm.
