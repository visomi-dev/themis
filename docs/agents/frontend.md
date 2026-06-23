# Frontend Agent Guidance

These instructions apply to Angular frontend work in Themis. Read them before editing Angular components, routes, services, forms, templates, i18n, or frontend tests.

## Angular Components

- Components are standalone by default in Angular v20+. Do not set `standalone: true` in decorators.
- Always use external templates and styles with `templateUrl` and singular `styleUrl`.
- Component class names are PascalCase nouns without a `Component` suffix.
- Component selectors use the `app-` prefix.
- Use the `host` property in `@Component`; do not use `@HostBinding` or `@HostListener`.
- Add `/* tw */` before Tailwind class strings in `host.class`.
- Use `input()` and `output()` signal functions. Do not use `@Input()` or `@Output()`.
- Use self-closing tags for components without projected content, such as `<app-navbar />` and `<router-outlet />`.
- Each component must keep a companion `.css` file, even if empty.

## Signals And State

- Use `signal()` for local mutable state and `computed()` for derived state.
- Use `toSignal()` to convert Observables into signals.
- Never use `mutate` on signals; use `set` or `update`.
- Effects must be declared as `readonly` class properties, never inside constructors.
- Name effects descriptively, such as `setDeviceIdEffect`, `toggleThemeClassEffect`, or `initEffect`.
- In the zoneless Angular app, async view state must use signals. Do not rely on plain mutable class properties for values that change after awaited work.
- Use `httpResource` from `@angular/common/http` for declarative component data fetching when appropriate.

## Services

- Use `inject()` for dependency injection. Do not use constructor parameter injection.
- Mark injected dependencies as `private readonly`.
- Service classes are PascalCase nouns without a `Service` suffix.
- Singleton services use `providedIn: 'root'` and app-level services are registered in root `app.config.ts` providers.
- Components should alias service signals as `readonly` class properties.
- Dynamic `import()` for external or heavy libraries is allowed only inside `shared/deps.ts`.

## Templates

- Use native control flow: `@if`, `@for`, and `@switch`. Do not use `*ngIf`, `*ngFor`, or `*ngSwitch`.
- Keep templates simple; move complex logic into the component class.
- Use Angular `animate.enter` and `animate.leave` for transition animations.
- Do not use `ngClass` or `ngStyle`; use native `class` and `style` bindings.
- Do not assume browser globals, such as `new Date()`, are available in templates.
- Do not write arrow functions in templates.
- Use the `async` pipe for Observables.

## Forms

- Keep reactive forms typed with explicit `FormGroup` and `FormControl` shapes.
- Prefer shared field wrappers for repeated label, help, and error presentation.
- PrimeNG inputs are allowed, but repeated field patterns should be wrapped in local shared form primitives.
- Validation copy belongs in the component or shared form helper, not duplicated inline in templates.
- Route-level auth forms should keep accessibility stable for tests: explicit labels, stable button names, and straightforward headings.

## Routing

- Use lazy loading for feature routes through `loadComponent`.
- Lazy-loaded import paths point directly to the `.ts` file. Do not use barrels or `/index`.
- Use functional route resolvers (`ResolveFn`) to load route-critical data before the component renders.
- Resolver files follow `name.resolver.ts` and live alongside the route that uses them.
- Use functional route guards (`CanActivateFn`, `CanDeactivateFn`, `CanMatchFn`) for authentication, authorization, and preconditions.
- Guard files follow `name.guard.ts`. Shared guards live under `shared/guards/`; route-specific guards live alongside the feature route.
- Guards that redirect must return a `UrlTree` or `RedirectCommand`; never return `false` and navigate imperatively.
- Use `import type` for router types.

## Internationalization

- Use Angular built-in `i18n` attributes for template translation markers.
- Always use custom IDs with the `@@` prefix. Do not rely on auto-generated IDs.
- Use `i18n-{attribute}` for translatable attributes.
- Custom IDs follow `@@{page}{Section}{Description}`, such as `@@homeHeroTitle`.
- Use `$localize`: ``$localize`:@@customId:Default text` `` for translatable strings in TypeScript.
- Run `pnpm nx run website:extract-i18n` when extraction is needed.

## Frontend Architecture

- Route components live directly under their domain folder, such as `activation/`, `auth/`, or `projects/`.
- Reusable layout components live under `shared/layout/`.
- Shared services live directly in `shared/`.
- Constants live under `shared/constants/`.
- Smart route components connect to services and routing. Reusable UI/layout components receive data via inputs and emit via outputs.

## Component Tests

- Use Angular TestBed with the component under test in `imports`.
- Await `fixture.whenStable()` before assertions when setup can trigger async behavior.
- Keep tests named in English and focused on observable behavior.
