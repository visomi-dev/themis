# Themis UI Recipes

## Auth Shell (sign-in / sign-up / verify / forgotten-password / reset-password)

All auth routes share the same `app-auth-layout` primitive. The shell renders a sticky header (brand + language switcher + theme toggle) and a single-column main area for the card. The card is `app-auth-card` (max-width 440px, padded, surface + subtle border + shadow-sm). Both shell and card expose `data-od-id` hooks for visual e2e assertions (`auth-shell`, `brand`, `lang-menu`, `theme-toggle`, `auth-card`).

```html
<app-auth-layout>
  <app-auth-card>
    <header class="mb-7 space-y-2">
      <p
        data-slot="kicker"
        class="font-mono text-xs font-semibold tracking-widest text-zinc-500 uppercase dark:text-zinc-400"
        i18n="@@signInKicker"
      >
        Account access
      </p>
      <h1
        data-slot="title"
        class="font-heading text-[1.625rem] leading-tight font-bold tracking-[-0.025em] text-zinc-950 dark:text-zinc-50"
        i18n="@@signInTitle"
      >
        Sign in
      </h1>
      <p data-slot="sub" class="text-[0.9375rem] leading-6 text-zinc-500 dark:text-zinc-400" i18n="@@signInSub">
        Welcome back. Use your work email to access your Themis workspace.
      </p>
    </header>

    @if (errorMessage()) {
    <app-alert class="mb-5" tone="danger" variant="auth" i18n="@@signInAuthFailedAlert">{{ errorMessage() }}</app-alert>
    }

    <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-5" novalidate>
      <app-field>
        <app-label for="sign-in-email" i18n="@@signInEmailLabel">Email</app-label>
        <app-input
          autocomplete="email"
          formControlName="email"
          [controlId]="'sign-in-email'"
          invalid="!!emailError()"
          name="email"
          placeholder="name@organization.com"
          type="email"
          (blur)="updateEmailError()"
        />
        @if (emailError(); as message) {
        <app-error-message controlId="sign-in-email-error">{{ message }}</app-error-message>
        }
      </app-field>

      <app-field>
        <app-label for="sign-in-password" i18n="@@signInPasswordLabel">Password</app-label>
        <app-password-input
          autocomplete="current-password"
          formControlName="password"
          [controlId]="'sign-in-password'"
          invalid="!!passwordError()"
          name="password"
          placeholder="***************"
          (blur)="updatePasswordError()"
        />
        @if (passwordError(); as message) {
        <app-error-message controlId="sign-in-password-error">{{ message }}</app-error-message>
        }
      </app-field>

      <app-button data-slot="submit" i18n="@@signInSubmitButton" tone="accent" type="submit" [loading]="submitting()"
        >Sign in</app-button
      >
    </form>

    <p class="mt-6 text-sm text-zinc-500 dark:text-zinc-400" i18n="@@signInFooterPrompt">New to Themis?</p>
    <app-link data-slot="footer" i18n="@@signInFooterLink" [routerLink]="footerLink" [text]="'Create an account'" />
  </app-auth-card>
</app-auth-layout>
```

Notes:

- The auth chrome (brand, lang, theme toggle) is owned by `app-auth-layout`; routes only render the card and its form.
- `app-password-input` defaults to `variant="text"` (mono "Show" / "Hide" with aria-label "Show password" / "Hide password"). Use `variant="icon"` for the eye / eye-off icon.
- `app-error-message` prepends a circle-alert icon when `withIcon=true` (default).
- Use `data-slot` markers (`kicker`, `title`, `sub`, `submit`, `footer`) for e2e copy assertions. Open Design copy is locked in the spec.
- The submit button uses `tone="accent"` (the Catalyst `blue-600` brand color) and `app-alert` with `variant="auth"` for danger/success above the form.

## Password Strength (sign-up, reset-password)

`app-password-strength` mounts a 4-bar meter driven by a signal of the password value. The level is reflected on `data-level` (0..4) and the accessible label updates live.

```html
<app-field>
  <app-label for="sign-up-password" i18n="@@signUpPasswordLabel">Password</app-label>
  <app-password-input
    autocomplete="new-password"
    formControlName="password"
    [controlId]="'sign-up-password'"
    [invalid]="!!passwordError()"
    name="password"
    placeholder="***************"
    (blur)="updatePasswordError()"
  />
  <app-password-strength [password]="passwordValue" />
  @if (passwordError(); as message) {
  <app-error-message controlId="sign-up-password-error">{{ message }}</app-error-message>
  }
</app-field>
```

The pure `computePasswordStrength(value)` helper is exported so unit tests can validate the level mapping without rendering.

## Reset Password (single-screen OTP + password)

`/app/reset-password` uses one card with internal step signal (otp -> password -> success). The OTP step exposes `data-od-id="pending-email"` for visual e2e. The password step reuses `app-password-strength`.

## PIN / Verification Code

```html
<app-field>
  <app-label for="verification-pin-1" i18n="@@verificationCodeLabel">Verification code</app-label>
  <app-pin-input
    [digits]="6"
    [invalid]="!!pinError"
    [loading]="submitting()"
    formControlName="pin"
    idPrefix="verification-pin"
    pattern="[0-9]{1}"
  />
  <app-description i18n="@@verificationCodeHelp">Enter the 6-digit code from your email.</app-description>
  @if (pinError; as message) {
  <app-error-message id="verification-pin-error">{{ message }}</app-error-message>
  }
</app-field>
```

The pin input renders a wrapper with `data-slot="pin-input"`; e2e helpers target `[data-slot=pin-input] input` to fill each cell.

## Field With Error

```html
<app-field [invalid]="nameInvalid">
  <app-label for="project-name">Project name</app-label>
  <app-input id="project-name" formControlName="name" ariaDescribedBy="project-name-error" />
  @if (nameInvalid) {
  <app-error-message id="project-name-error">Project name is required.</app-error-message>
  }
</app-field>
```

The `Field` propagates `data-invalid` to its children. `Input` reads the attribute to switch `border-zinc-950/15` to `border-red-600` (`dark:border-red-500`).

## App Shell (auth routes excluded)

The authenticated shell is a fixed sidebar + topbar + content outlet. Auth routes set `data: { hideAppShell: true }` so the layout hides the chrome.

```html
<app-layout>
  <router-outlet />
</app-layout>
```

The `Layout` component composes the existing `SidebarMenu` and `Topbar` (legacy components in `shared/layout/`), which already use `app-icon`, `app-avatar`, and `app-dropdown` internally.

## Sidebar Navigation

Navigation entries are plain data. Icons are names from `app-icon` (no `pi pi-*` classes).

```ts
type LayoutNavItem = {
  children?: LayoutNavItem[];
  exact: boolean;
  icon: IconName;
  label: string;
  url: string;
};
```

The `Sidebar` items consume `data-current:bg-blue-600/10 data-current:text-blue-600 dark:data-current:bg-blue-400/10 dark:data-current:text-blue-400` for the active state.

The user menu uses `app-dropdown` + `app-listbox` so it is keyboard accessible and the menu items are real `<div role="option">` elements that the screen reader can announce.

## Page Header

```html
<app-page-header>
  <p data-slot="eyebrow" class="text-sm font-semibold text-blue-600 dark:text-blue-500">Projects</p>
  <h1 data-slot="title" class="font-heading text-4xl font-bold text-zinc-950 dark:text-zinc-50">Project workspace</h1>
  <p data-slot="description" class="text-zinc-500 dark:text-zinc-400">Manage active work.</p>
  <app-button data-slot="actions" tone="blue">New project</app-button>
</app-page-header>
```

## Project List With Table And Cards

```html
<app-card padding="md" tone="raised" class="overflow-hidden">
  <div class="hidden grid-cols-4 gap-3 bg-zinc-50 px-6 py-3 md:grid dark:bg-zinc-900">
    <span class="text-xs font-semibold tracking-widest text-zinc-500 uppercase dark:text-zinc-400">Project</span>
    <span class="text-xs font-semibold tracking-widest text-zinc-500 uppercase dark:text-zinc-400">Status</span>
    <span class="text-xs font-semibold tracking-widest text-zinc-500 uppercase dark:text-zinc-400">Created</span>
    <span class="text-xs font-semibold tracking-widest text-zinc-500 uppercase dark:text-zinc-400">Actions</span>
  </div>

  @for (project of projects(); track project.id) {
  <article class="grid gap-3 border-t border-zinc-950/10 px-6 py-4 md:grid-cols-4 md:items-center dark:border-white/10">
    <a
      class="font-medium text-zinc-950 no-underline hover:text-blue-600 dark:text-zinc-50 dark:hover:text-blue-500"
      [routerLink]="['/projects', project.id]"
    >
      {{ project.name }}
    </a>
    <app-badge [tone]="statusTone(project.status)">{{ statusLabel(project.status) }}</app-badge>
    <span class="text-xs text-zinc-500 dark:text-zinc-400">{{ formatDate(project.createdAt) }}</span>
    <div class="flex items-center gap-2">
      <a [routerLink]="['/projects', project.id]" class="text-sm font-medium text-blue-600 dark:text-blue-500">View</a>
      <button
        type="button"
        class="text-sm font-medium text-red-600 dark:text-red-400"
        (click)="deleteProject(project.id, $event)"
      >
        Delete
      </button>
    </div>
  </article>
  }
</app-card>
```

`Badge` resolves its background and text colors from a `data-tone` attribute. Valid tones are `'zinc' | 'blue' | 'red' | 'green' | 'amber'`.

## Activation Page Tabs

Use the accessible `role="tablist"` / `role="tab"` / `role="tabpanel"` pattern with Tailwind utilities. No PrimeNG `TabView` is needed.

```html
<div role="tablist" class="flex flex-wrap border-b border-zinc-950/10 bg-zinc-50 dark:border-white/10 dark:bg-zinc-900">
  @for (tab of tabs; track tab.id) {
  <button
    type="button"
    role="tab"
    [id]="'config-tab-' + tab.id"
    [attr.aria-selected]="selected() === tab.id"
    [attr.aria-controls]="'config-tabpanel'"
    [class.bg-white]="selected() === tab.id"
    [class.dark:bg-zinc-950]="selected() === tab.id"
    [class.text-blue-600]="selected() === tab.id"
    [class.dark:text-blue-500]="selected() === tab.id"
    (click)="select(tab.id)"
  >
    {{ tab.label }}
  </button>
  }
</div>

<div role="tabpanel" [attr.aria-labelledby]="'config-tab-' + selected()" class="bg-zinc-100 p-6 dark:bg-zinc-800">
  <pre class="font-mono text-sm leading-7 break-words whitespace-pre-wrap">{{ content() }}</pre>
</div>
```

## Dialog

```html
<app-dialog [open]="dialogOpen()" ariaLabelledBy="dialog-title" (closed)="dialogOpen.set(false)">
  <h2 id="dialog-title" class="font-heading text-2xl font-bold text-zinc-950 dark:text-zinc-50">Confirm action</h2>
  <p class="text-zinc-500 dark:text-zinc-400">This action can be undone from settings.</p>
</app-dialog>
```

## Declarative Table

```html
<app-table [columns]="columns" [data]="projects" mobileCards>
  <ng-template appTableCell="name" let-project>
    <strong>{{ project.name }}</strong>
  </ng-template>
</app-table>
```

## Buttons

```html
<!-- Primary blue accent -->
<app-button tone="blue">Start run</app-button>

<!-- Neutral outline -->
<app-button tone="zinc" variant="outline">Copy context</app-button>

<!-- Destructive action -->
<app-button tone="red">Delete project</app-button>

<!-- Success / completion state -->
<app-button tone="green">Mark complete</app-button>

<!-- Warning / attention state -->
<app-button tone="amber">Resolve blocker</app-button>
```

Solid buttons use the Catalyst optical-border pattern internally. The visible border is the `--btn-border` custom property, the visible fill is the `--btn-bg` custom property, and the `after` pseudo-element renders the inset highlight shadow plus the hover overlay.
