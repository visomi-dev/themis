# Catalyst Angular UI Foundation — Validation Plan

## Static Validation

1. `pnpm nx lint app`
2. `pnpm nx test app`
3. `pnpm nx build app`

## Code Quality Checks

- No new imports from `primeng/*` in new UI primitives.
- No React, Headless UI React, or Motion React dependencies.
- No inline dynamic `import()` outside `Deps`.
- No `@Input()`, `@Output()`, `@HostBinding()`, or `@HostListener()`.
- No `standalone: true` in component decorators.
- No inline templates/styles in Angular components.
- No `ngClass` or `ngStyle`.
- No `*ngIf`, `*ngFor`, or `*ngSwitch`.
- Effects declared as `readonly` properties.
- Tailwind classes remain literal in templates or static maps.
- `shared/ui` must not import domain services from auth, activation, projects, or dashboard.

## Accessibility Validation

- Buttons and links have accessible names.
- Inputs, selects, checkboxes, radios, and switches expose labels and error descriptions.
- Focus ring is visible in light and dark mode.
- Touch targets meet the 44x44 px target where applicable.
- Dialog/dropdown behavior supports keyboard navigation before route migration uses them.

## Completion Checklist

- Token docs exist.
- Component docs exist.
- At least actions, typography, forms, and layout primitives are implemented before the app redesign starts.
- PrimeNG remains allowed only for legacy screens until the second spec migrates them.
