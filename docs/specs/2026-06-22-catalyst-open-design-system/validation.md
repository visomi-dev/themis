# Catalyst Open Design System — Validation Plan

## Static Validation

1. `pnpm nx lint app`
2. `pnpm nx test app`
3. `pnpm nx build app`
4. `pnpm nx lint site`
5. `pnpm nx build site`
6. `pnpm nx e2e app-e2e`

## Code Quality Checks

- No new imports from `primeng/*`.
- No new `primeicons` usage.
- No inline dynamic `import()` outside `Deps`.
- No `@Input()`, `@Output()`, `@HostBinding()` or `@HostListener()`.
- No `standalone: true` in component decorators.
- No inline templates/styles in Angular components.
- No `ngClass` or `ngStyle`.
- No `*ngIf`, `*ngFor` or `*ngSwitch`.
- Effects declared as `readonly` properties.
- Class maps contain literal Tailwind strings so Tailwind can detect them.

## Accessibility Validation

Routes to validate with AXE and keyboard:

- `/app/sign-in`
- `/app/sign-up`
- `/app/verify-email`
- `/app/activation`
- `/app/`
- `/app/projects`
- Website landing page

Keyboard scenarios:

- Tab order through auth form.
- Submit button focus state and disabled/loading state.
- Sidebar mobile open/close with keyboard.
- Dialog escape/backdrop close when dialogs exist.
- Dropdown arrow/escape navigation when dropdown exists.
- Form errors announced or reachable through descriptions.

## Visual Validation

Breakpoints:

- Mobile: 360px and 390px.
- Tablet: 768px.
- Desktop: 1280px and 1440px.

Themes:

- Light mode.
- Dark mode.
- First render before theme hydration.

Surfaces to compare:

- Auth form.
- App shell with sidebar.
- Projects overview table/card state.
- Dashboard panels.
- Website hero and CTA sections.

## Performance Validation

- Bundle diff before and after removing PrimeNG.
- Verify no new large UI runtime dependency for base components.
- Check route lazy loading remains intact.
- Verify mobile sidebar/dialog does not register unnecessary global listeners.
- Confirm SSR build succeeds after browser-only logic is guarded.

## Migration Completion Checklist

- `apps/web/app/src/styles.css` no longer has `.p-*` overrides.
- `tailwindcss-primeui` removed after all PrimeNG usage is gone.
- `primeng` and `primeicons` removed after all imports are gone.
- `docs/design-system` documents tokens, components, recipes, accessibility and agent rules.
- At least one full route family is migrated and tested before continuing to the next.
- New components have `.spec.ts` smoke tests or behavior tests where logic exists.
