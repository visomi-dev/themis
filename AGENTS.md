<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

> [!IMPORTANT]
> The conventions below are **mandatory**. Every code change, generation, or refactoring must follow them. When in doubt, look at an existing file in the codebase for reference rather than guessing.

---

## TypeScript Conventions

### Imports

- **All imports at the top.** Never use `import('module').Something` inline in functions, methods, or class bodies. The _sole exception_ is the `Deps` service (`shared/deps.ts`), which lazy-loads heavy third-party libraries (e.g., `luxon`, `three`, `uuid`) via dynamic `import()`.
- **Type-only imports.** When importing only types, always use `import type` or `import { type Foo }`:
  ```ts
  import type { DateTime } from 'luxon';
  import type * as THREE from 'three';
  ```
- **Import grouping.** Separate imports into groups with blank lines in the following order enforced by ESLint `import-x/order`:
  1. Angular / third-party packages (`@angular/*`, `rxjs`, etc.)
  2. Project-internal relative imports (e.g., `../../shared/deps`)
  3. Local relative imports (e.g., `./background/background`)
- **No barrel re-exports.** Import directly from the source file, never through an `index.ts` barrel.

### Type System

- Use **strict type checking**; avoid `any`—use `unknown` when the type is uncertain.
- Prefer **type inference** when the type is obvious from the right-hand side.
- Use `type` (not `interface`) for type definitions. ESLint enforces `@typescript-eslint/consistent-type-definitions: ['error', 'type']`.
- Prefix unused variables/parameters with `_` (e.g., `_event`).

### File Naming

- All filenames must be **kebab-case** (enforced by ESLint `unicorn/filename-case`).
- Component/service files use the **bare name** without a suffix. Examples: `home.ts`, `settings.ts`, `deps.ts`.
- Test files use `.spec.ts`: `home.spec.ts`, `deps.spec.ts`.
- Supporting file types follow the `name.type.ts` pattern: `app.routes.ts`, `app.config.ts`, `app.routes.server.ts`, `app.config.server.ts`.

---

<!-- angular specifc conventions -->

# Angular Component Conventions

### Decorator

- **Always standalone.** Do NOT set `standalone: true` in the decorator; it is the default in Angular v20+.
- **Always use external templates and styles.** Use `templateUrl` and `styleUrl` (singular), never inline `template`/`styles`.
- Use paths **relative** to the component TS file: `templateUrl: './home.html'`, `styleUrl: './home.css'`.
- **File names match** the component directory name: `home/home.ts`, `home/home.html`, `home/home.css`.
- **No `changeDetection` property required** unless explicitly needed; OnPush is default in v20+.

### Class Naming

- Component classes are **PascalCase nouns without any suffix**: `Home`, `Navbar`, `Background`, `ThemeSwitcher`, `PageNavigationLoader`.
- **Never** use `Component` suffix (e.g., ~~`HomeComponent`~~).

### Selector

- Components use `app-` prefix: `selector: 'app-home'`, `selector: 'app-navbar'`.

### Host Bindings

- Use the `host` property in the `@Component` decorator, **never** `@HostBinding` or `@HostListener`:
  ```ts
  @Component({
    host: {
      class: /* tw */ 'block min-h-full w-full',
    },
  })
  ```
- Add the `/* tw */` annotation before Tailwind class strings in the `host` property to enable IDE IntelliSense.

### Inputs & Outputs

- Use the `input()` and `output()` signal functions, **never** `@Input()` or `@Output()` decorators.

### Self-Closing Tags in Templates

- Use self-closing tags for components without projected content: `<app-navbar />`, `<router-outlet />`.

---

## Signals & Reactive State

### Declaring State

- Use `signal()` for local/mutable state.
- Use `computed()` for derived state.
- Use `toSignal()` to convert Observables into signals.
- **Never** use `mutate` on signals; use `update` or `set`.

### Effects

> [!CAUTION]
> **Effects must be declared as `readonly` class properties, never inside the constructor.**

```ts
// ✅ CORRECT — effect assigned to a class property
export class Settings {
  readonly toggleThemeClassEffect = effect(() => {
    if (this.isDarkTheme()) {
      this.document.documentElement.classList.add('dark');
    } else {
      this.document.documentElement.classList.remove('dark');
    }
  });
}

// ❌ WRONG — effect created inside the constructor
export class Settings {
  constructor() {
    effect(() => {
      /* ... */
    }); // DO NOT DO THIS
  }
}
```

This convention applies to **all** uses of `effect()` in both services and components. Name effects descriptively: `setDeviceIdEffect`, `toggleThemeClassEffect`, `initEffect`.

### httpResource

- Use `httpResource` (from `@angular/common/http`) for declarative data fetching in components.
- Assign to a `readonly` class property, just like signals:
  ```ts
  readonly vertexShader = httpResource.text(() => VERTEX_SHADER_URL);
  ```

---

## Services

### Dependency Injection

- Use `inject()` function for DI, **never** constructor parameter injection.
- Mark injected dependencies as `private readonly`:
  ```ts
  private readonly settings = inject(Settings);
  ```

### Service Class Naming

- Services are **PascalCase nouns without any suffix**: `Deps`, `Settings`, `UI`, `SEO`.
- **Never** use `Service` suffix (e.g., ~~`SettingsService`~~).

### Singleton Services

- Use `providedIn: 'root'` for singleton services.
- Register app-level services (e.g., `Deps`, `Settings`, `UI`, `SEO`) in the root `app.config.ts` `providers` array.

### Exposing State to Components

- Components should alias service signals as **readonly class properties**:

  ```ts
  export class PageNavigationLoader {
    private readonly ui = inject(UI);

    readonly loading = this.ui.loading.asReadonly();
    readonly navigating = this.ui.navigating;
  }
  ```

### Async UI State

- In the zoneless Angular app, async view state must use signals. Do not rely on plain mutable class properties for error banners, status copy, loading state, or other values that change after awaited work.
- Short-lived async feedback should use `signal()` and be read in templates as `message()` rather than plain strings.

### Dynamic Imports (Deps Service Only)

- `import()` for external/heavy libraries is only allowed inside the `Deps` service (`shared/deps.ts`).
- Lazy-loaded modules are exposed as signals via `toSignal(from(...))`.
- All other code must import statically at the top of the file.

---

## Templates

- Use **native control flow** (`@if`, `@for`, `@switch`) — never `*ngIf`, `*ngFor`, `*ngSwitch`.
- Keep templates simple; move complex logic into the component class.
- Use Angular `animate.enter` / `animate.leave` attributes for transition animations.
- **Do NOT** use `ngClass` or `ngStyle` — use native `class`/`style` bindings.
- Do not assume browser globals (e.g., `new Date()`) are available in templates.
- Do not write arrow functions in templates.
- Use the `async` pipe for Observables.

## Forms

- Keep reactive forms typed with explicit `FormGroup` and `FormControl` shapes.
- Prefer shared field wrappers for repeated label, help, and error presentation rather than rebuilding field chrome in every page.
- PrimeNG inputs are allowed, but page components should wrap them in local shared form primitives when the same field pattern repeats.
- Validation copy belongs in the component or shared form helper, not inline as duplicated template conditionals.
- Route-level auth forms should keep accessibility stable for tests: use explicit labels, stable button names, and straightforward heading text.

---

## Routing

- Use **lazy loading** for all feature routes via `loadComponent`:
  ```ts
  export const appRoutes: Route[] = [
    {
      path: '',
      loadComponent: () => import('./pages/home/home').then((m) => m.Home),
    },
  ];
  ```
- Lazy-loaded import paths point directly to the `.ts` file (no barrel, no `/index`).

### Route Data Resolvers

- **Always** use resolvers (`ResolveFn`) to load data required by a route **before** the component renders. Never fetch critical route data inside the component itself.
- Use the functional `ResolveFn` pattern (not class-based resolvers):

  ```ts
  import { inject } from '@angular/core';
  import type { ActivatedRouteSnapshot, ResolveFn, RouterStateSnapshot } from '@angular/router';

  import { UserStore } from '../../shared/user-store';
  import type { User } from '../../shared/types';

  export const userResolver: ResolveFn<User> = (route: ActivatedRouteSnapshot, _state: RouterStateSnapshot) => {
    const userStore = inject(UserStore);
    const userId = route.paramMap.get('id')!;

    return userStore.getUser(userId);
  };
  ```

- **File naming:** resolver files follow the `name.resolver.ts` pattern (e.g., `user.resolver.ts`).
- **Location:** place resolver files alongside the route that uses them (inside the page feature directory).
- Configure resolvers in the `resolve` property of the route definition:
  ```ts
  {
    path: 'user/:id',
    loadComponent: () => import('./pages/user/user').then((m) => m.User),
    resolve: {
      user: userResolver,
    },
  }
  ```
- Keep resolvers **lightweight** — fetch essential data only.
- **Handle errors** gracefully; use `withNavigationErrorHandler` for centralized error handling.
- Use `import type` for router types (`ActivatedRouteSnapshot`, `ResolveFn`, `RouterStateSnapshot`).

### Route Guards

- **Always** use guards to protect routes that require authentication, authorization, or any precondition check. Never check access inside the component itself.
- Use the functional guard pattern (`CanActivateFn`, `CanDeactivateFn`, `CanMatchFn`):

  ```ts
  import { inject } from '@angular/core';
  import type { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot } from '@angular/router';

  import { Auth } from '../../shared/auth';

  export const authGuard: CanActivateFn = (_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot) => {
    const auth = inject(Auth);

    return auth.isAuthenticated();
  };
  ```

- **File naming:** guard files follow the `name.guard.ts` pattern (e.g., `auth.guard.ts`).
- **Location:** place guards in `shared/guards/` when shared across routes, or alongside the feature route when specific to one page.
- Prefer one concern per guard file. Do not group unrelated guards in a single `auth.guards.ts`-style file.
- Apply guards in the route definition:
  ```ts
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
    canActivate: [authGuard],
  }
  ```
- **Redirecting:** when a guard needs to redirect, return a `UrlTree` or `RedirectCommand`. **Never** return `false` and then programmatically navigate.
- Multiple guards on a single route are executed **in array order**.
- Use `import type` for router types (`CanActivateFn`, `ActivatedRouteSnapshot`, `RouterStateSnapshot`).

---

## Internationalization (i18n)

### Template Markers

- Use Angular's built-in `i18n` attribute to mark element content for translation:
  ```html
  <h1 i18n="@@homeHeroTitle">Architecting Scalable Systems.</h1>
  ```
- Use `i18n-{attribute}` to mark attribute values for translation:
  ```html
  <img alt="Hero illustration" i18n-alt="@@homeHeroAlt" />
  ```
- **Always use custom IDs** with the `@@` prefix. Never rely on auto-generated IDs.

### Custom ID Naming Convention

Follow the pattern `@@{page}{Section}{Description}`:

| Pattern           | Example                                            |
| ----------------- | -------------------------------------------------- |
| Page-level        | `@@homeHeroTitle`, `@@homeHeroBadge`               |
| Section-specific  | `@@homeJourneyRole2024`, `@@homeWorksProject1Desc` |
| Attribute binding | `@@homeHeroAlt` (used with `i18n-alt`)             |

- **Page prefix**: lowercase page name (`home`, `resume`, `about`).
- **Section**: PascalCase section name (`Hero`, `Journey`, `Works`, `Features`, `Footer`).
- **Description**: PascalCase descriptor (`Title`, `Subtitle`, `Badge`, `Role2024`, `Project1Desc`).

### `$localize` in TypeScript

- Use `$localize` tagged template literals for translatable strings in `.ts` files (e.g., constants, SEO metadata):
  ```ts
  const title = $localize`:@@homeNavIntroduction:Introduction`;
  ```
- The syntax is `` $localize`:@@customId:Default text` ``.
- `@angular/localize/init` polyfill is already configured in `project.json`.

### Extraction

- Run `pnpm nx run website:extract-i18n` to generate the translation source file.
- Translation files follow Angular's XLIFF format.

## CSS

### Component CSS

- Each component has a companion `.css` file (even if empty); never delete it.
- Use component CSS for:
  - Keyframe animations (`@keyframes`)
  - Element-level styles that cannot be expressed as Tailwind utilities (e.g., `canvas` element sizing)
  - `@starting-style` transitions
- Animations are referenced from templates via `animate.enter` / `animate.leave` attribute names that map to CSS class names.

## Testing

### Component Tests

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

### Service Tests

```ts
import { TestBed } from '@angular/core/testing';
import { Deps } from './deps';

describe('Deps', () => {
  let service: Deps;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Deps);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
```

### Playwright End-To-End Tests

- Organize Playwright specs by route and feature area, not as one monolithic auth flow file.
- Put shared helpers under `src/support/` for mailbox access, OTP filling, route constants, and auth helpers.
- Prefer `getByRole`, `getByLabel`, and visible heading assertions over brittle CSS selectors or test IDs.
- Auth changes should keep the route suite green for:
  - `/app/sign-in`
  - `/app/sign-up`
  - `/app/verify-email`
  - `/app/`
  - theme behavior across auth and app routes

## Code Generation

```bash
pnpm nx g @nx/angular:component apps/website/src/app/pages/some-page/some-page
```

Generated components must be adjusted to follow **all** the conventions above (e.g., remove `Component` suffix, remove `standalone: true`, adjust file names, etc.).

<!-- angular end specifc conventions -->

---

## CSS & Styling

### Tailwind CSS

- Tailwind is the primary styling tool. Use utility classes directly in templates.
- **Never use raw CSS variables for colors or design tokens.** Define them inside `@theme` blocks in `styles.css`.
- Use `@utility` to define custom utilities.
- Dark mode uses the `dark` variant, which is configured as `@custom-variant dark (&:where(.dark, .dark *))`.

### Global CSS (`styles.css`)

- `@import` font packages first, then Tailwind, then icon libraries.
- Define global design tokens inside `@theme`.
- Define reusable utilities with `@utility`.

### Design System (Stitch Alignment)

The project uses design tokens defined in Stitch. These are the **source of truth**:

#### Stitch Project

- **Title:** Themis
- **ID:** 13964447050944642949

#### Design Systems

1. **Slate & Syntax** (Light Mode) - `assets/b1e9286749f74476a692557a989a8dd1`
2. **Slate & Syntax: Night Edition** (Dark Mode) - `assets/d3dbb06bfbc24346aeda94cc7ca17f87`

#### Token Sources

| File                                  | Design System                                     |
| ------------------------------------- | ------------------------------------------------- |
| `apps/web/site/src/styles/global.css` | Website - uses Stitch tokens directly in `@theme` |
| `apps/web/app/src/styles.css`         | Webapp - uses CSS custom properties               |

#### Light Mode Tokens (`apps/web/site/src/styles/global.css`)

```css
--color-primary: #385ca9;
--color-on-primary: #f9f8ff;
--color-primary-container: #a8c0ff;
--color-on-primary-container: #063884;
--color-tertiary: #006d4e;
--color-on-tertiary: #e5fff0;
--color-tertiary-container: #8dfece;
--color-on-tertiary-container: #006146;
--color-surface: #faf8ff;
--color-on-surface: #213156;
--color-surface-variant: #d9e2ff;
--color-on-surface-variant: #4e5e86;
--color-outline: #6a7aa3;
--color-outline-variant: #a1b1dd;
--color-background: #faf8ff;
--color-on-background: #213156;
--color-surface-container-lowest: #ffffff;
--color-surface-container-low: #f2f3ff;
--color-surface-container: #e9edff;
--color-surface-container-high: #e1e7ff;
--color-surface-container-highest: #d9e2ff;
--color-error: #ac3434;
```

#### Dark Mode Tokens (`apps/web/site/src/styles/global.css`)

```css
--color-primary: #7bd0ff;
--color-on-primary: #004560;
--color-primary-container: #004c69;
--color-on-primary-container: #97d8ff;
--color-tertiary: #c6fff3;
--color-on-tertiary: #003827;
--color-tertiary-container: #005e54;
--color-on-tertiary-container: #65fde6;
--color-surface: #070d1f;
--color-on-surface: #dfe4ff;
--color-surface-variant: #0a2257;
--color-on-surface-variant: #96a9e6;
--color-outline: #6073ad;
--color-outline-variant: #32457c;
--color-background: #070d1f;
--color-on-background: #dfe4ff;
--color-surface-container-lowest: #000000;
--color-surface-container-low: #09122b;
--color-surface-container: #0a1839;
--color-surface-container-high: #0b1d48;
--color-surface-container-highest: #0a2257;
--color-error: #ee7d77;
```

#### Typography

- **Display/Headlines:** Manrope (`--font-family-display`)
- **Body:** Inter (`--font-family`)
- **Mono:** JetBrains Mono (`--font-family-mono`)

#### Key Principles (from Stitch "Technical Manuscript")

- No solid 1px borders for sectioning; use tonal shifts
- Surface hierarchy: `surface` (base) → `surface-container-low` → `surface-container` → `surface-container-high` → `surface-container-highest` (top)
- Ghost borders using `outline-variant` at low opacity for inputs
- Corner radius: `0.25rem` (DEFAULT) for cards, `0.125rem` (sm) for small elements

#### Mobile Spacing Guidelines

Stitch does not define explicit mobile breakpoints. Use responsive Tailwind classes with mobile-first approach:

| Element         | Mobile (default)          | Desktop (md:, lg:)            |
| --------------- | ------------------------- | ----------------------------- |
| Section padding | `px-4 py-8`               | `md:px-12 md:py-16`           |
| Card padding    | `p-4`                     | `md:p-6 md:p-8`               |
| Grid gaps       | `gap-4`                   | `md:gap-6 lg:gap-8`           |
| Hero title      | `text-4xl`                | `md:text-6xl lg:text-8xl`     |
| Hero body       | `text-base`               | `md:text-xl`                  |
| CTAs            | full-width, `px-6 py-2.5` | `md:px-8 md:py-3`, auto width |

**Rules:**

- Always provide mobile-first spacing (small values default, larger for md:/lg:)
- Use `sm:flex-row` for button groups on mobile, stacking vertically
- Use full-width buttons on mobile (`w-full sm:w-auto`)
- Use `gap-3` for mobile, `md:gap-4` or `md:gap-6` for desktop

---

## Project Architecture

### Directory Structure

Follow **Screaming Architecture** — folder names reveal what the app does, not what framework concepts it uses:

```
apps/website/src/app/
├── app.ts                     # Root component
├── app.html / app.css         # Root template & styles
├── app.config.ts              # Client providers
├── app.config.server.ts       # Server providers
├── app.routes.ts              # Client routes
├── app.routes.server.ts       # Server routes (SSR)
├── pages/                     # Route-level "smart" components
│   └── home/
│       ├── home.ts / .html / .css / .spec.ts
│       ├── background/        # Page-specific child components
│       └── hero/
└── shared/                    # Cross-cutting concerns
    ├── deps.ts                # Lazy-loaded external dependencies
    ├── settings.ts            # Theme, locale, device preferences
    ├── ui.ts                  # UI state (loading, sidebar, navigation)
    ├── seo.ts                 # SEO/meta tag management
    ├── constants/             # Constant values
    │   └── storage.ts
    └── layout/                # Layout components
        ├── navbar/
        ├── theme-switcher/
        └── page-navigation-loader/
```

### Rules

1. **Never** create top-level `services/`, `models/`, or `components/` directories that mix multiple domains.
2. Route pages live under `pages/`. Each page is a feature directory.
3. Reusable layout components live under `shared/layout/`.
4. Shared services live directly in `shared/`.
5. Constants live under `shared/constants/`.

### Smart vs Dumb Components

- **Smart** (pages): Connected to services, handle state and routing.
- **Dumb** (ui/layout): Receive data via `input()`, emit events via `output()`. Reusable and logic-free.

### Cross-Domain Communication

- Never deep-import files from another feature's private directory.
- Use public services or shared interfaces.

---

## Formatting & Linting

- **Prettier** handles formatting: 120 char width, single quotes, trailing commas, 2-space indentation.
- HTML files are parsed with the `angular` parser.
- ESLint rules are defined in `eslint.config.mjs`; always run `pnpm nx lint <project>` to verify.

---

## Accessibility

- Must pass all AXE checks.
- Must follow WCAG AA minimums: focus management, color contrast, ARIA attributes.
- Use `NgOptimizedImage` for all static images (does not apply to base64 images).

---

## UI/UX

- **Mobile-first** approach, then desktop.
- Use semantic HTML5 elements.

---
