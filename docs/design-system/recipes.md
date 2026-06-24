# Themis UI Recipes

## Auth Page (sign-in / sign-up / verify / forgotten-password)

All auth routes share the same `app-auth-layout` primitive. The brand column is projected into the left panel via `data-slot="brand"`, and the form content goes into the right panel.

```html
<app-auth-layout>
  <div data-slot="brand" class="space-y-6">
    <app-logo variant="wordmark" />
    <app-text size="sm" tone="muted" i18n="@@signInEyebrow">AI-integrated technical access layer</app-text>
    <app-heading class="hidden md:block" i18n="@@signInHeroTitle" level="1">
      Human and agent execution, secured.
    </app-heading>
  </div>

  <div class="flex justify-end gap-3 pb-6">
    <app-theme-switcher />
  </div>

  <app-card padding="lg" tone="raised">
    <app-heading i18n="@@signInPanelTitle" level="2">Sign in</app-heading>

    <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-5" novalidate>
      <app-field>
        <app-label for="sign-in-email" i18n="@@signInEmailLabel">Email</app-label>
        <app-input
          autocomplete="email"
          formControlName="email"
          id="sign-in-email"
          invalid="!!emailError()"
          name="email"
          placeholder="name@organization.com"
          type="email"
          (blur)="updateEmailError()"
        />
        @if (emailError(); as message) {
        <app-error-message id="sign-in-email-error">{{ message }}</app-error-message>
        }
      </app-field>

      <app-field>
        <app-label for="sign-in-password" i18n="@@signInPasswordLabel">Password</app-label>
        <app-password-input
          autocomplete="current-password"
          formControlName="password"
          id="sign-in-password"
          invalid="!!passwordError()"
          name="password"
          placeholder="***************"
          (blur)="updatePasswordError()"
        />
        @if (passwordError(); as message) {
        <app-error-message id="sign-in-password-error">{{ message }}</app-error-message>
        }
      </app-field>

      <app-button i18n="@@signInSubmitButton" tone="blue" type="submit" [loading]="submitting()">Sign in</app-button>
    </form>
  </app-card>
</app-auth-layout>
```

Notes:

- Errors are kept in a `signal<string>` updated on `blur` and on `submit` so the template stays reactive without watching the form.
- `app-password-input` already implements the visibility toggle; no PrimeNG `p-password` required.
- Keep label and button copy as plain text nodes with `i18n` markers; the Angular compiler extracts them.
- The submit button uses `tone="blue"`, the Catalyst primary color.

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

The `Field` propagates `data-invalid` to its children. `Input` reads the attribute to switch `border-border` to `border-danger`.

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

The `Sidebar` items consume `data-current:bg-accent/10 data-current:text-accent` for the active state.

The user menu uses `app-dropdown` + `app-listbox` so it is keyboard accessible and the menu items are real `<div role="option">` elements that the screen reader can announce.

## Page Header

```html
<app-page-header>
  <p data-slot="eyebrow" class="text-accent text-sm font-semibold">Projects</p>
  <h1 data-slot="title" class="font-heading text-4xl font-bold">Project workspace</h1>
  <p data-slot="description" class="text-muted-fg">Manage active work.</p>
  <app-button data-slot="actions" tone="blue">New project</app-button>
</app-page-header>
```

## Project List With Table And Cards

```html
<app-card padding="md" tone="raised" class="overflow-hidden">
  <div class="bg-panel hidden grid-cols-4 gap-3 px-6 py-3 md:grid">
    <span class="text-muted-fg text-xs font-semibold tracking-widest uppercase">Project</span>
    <span class="text-muted-fg text-xs font-semibold tracking-widest uppercase">Status</span>
    <span class="text-muted-fg text-xs font-semibold tracking-widest uppercase">Created</span>
    <span class="text-muted-fg text-xs font-semibold tracking-widest uppercase">Actions</span>
  </div>

  @for (project of projects(); track project.id) {
  <article class="border-border-subtle grid gap-3 border-t px-6 py-4 md:grid-cols-4 md:items-center">
    <a class="text-fg hover:text-accent font-medium no-underline" [routerLink]="['/projects', project.id]">
      {{ project.name }}
    </a>
    <app-badge [tone]="statusTone(project.status)">{{ statusLabel(project.status) }}</app-badge>
    <span class="text-muted-fg text-xs">{{ formatDate(project.createdAt) }}</span>
    <div class="flex items-center gap-2">
      <a [routerLink]="['/projects', project.id]" class="text-accent text-sm font-medium">View</a>
      <button type="button" class="text-danger text-sm font-medium" (click)="deleteProject(project.id, $event)">
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
<div role="tablist" class="bg-panel border-border-subtle flex flex-wrap border-b">
  @for (tab of tabs; track tab.id) {
  <button
    type="button"
    role="tab"
    [id]="'config-tab-' + tab.id"
    [attr.aria-selected]="selected() === tab.id"
    [attr.aria-controls]="'config-tabpanel'"
    [class.bg-bg]="selected() === tab.id"
    [class.text-accent]="selected() === tab.id"
    (click)="select(tab.id)"
  >
    {{ tab.label }}
  </button>
  }
</div>

<div role="tabpanel" [attr.aria-labelledby]="'config-tab-' + selected()" class="bg-panel-raised p-6">
  <pre class="font-mono text-sm leading-7 break-words whitespace-pre-wrap">{{ content() }}</pre>
</div>
```

## Dialog

```html
<app-dialog [open]="dialogOpen()" ariaLabelledBy="dialog-title" (closed)="dialogOpen.set(false)">
  <h2 id="dialog-title" class="font-heading text-2xl font-bold">Confirm action</h2>
  <p class="text-muted-fg">This action can be undone from settings.</p>
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
