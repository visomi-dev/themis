# Themis Auth Fidelity Pass — Software Design Document

## Decision

The auth flow will be re-authored against the Open Design prototypes in `resources/open-design/themis-app/` so that every screen reproduces the prototype 1:1. The work is a structural and copy rewrite of the auth shell + four existing auth routes + one new reset-password route (single-screen OTP + password). It reuses the `shared/ui` primitives from the Catalyst foundation and the Catalyst token set exposed by [`docs/specs/2026-06-23-catalyst-pure-tokens-alignment/`](../2026-06-23-catalyst-pure-tokens-alignment/) (`bg-bg`, `text-fg`, `border-border`, etc.). It adds exactly one new primitive (`shared/ui/forms/password-strength`) plus one new shared chrome directive (the auth shell itself). This spec must not reintroduce the legacy `--tm-*` palette used inside the Open Design prototypes — prototypes are visual references, not token sources.

The decision to keep Angular + the existing layout primitives — instead of building from open-design static HTML — is deliberate:

- The static prototypes use vanilla HTML with `<details>` and `<style>` blocks; porting them verbatim would bypass the design system and reintroduce the duplication problem the previous spec solved.
- The right move is to bring the prototypes into the design system: replace the static chrome with a new `shared/ui/layout/auth-layout` shell, replace the prototype field chrome with `app-field` + `app-input` + `app-label` + `app-error-message`, replace the prototype auth alert with `app-alert`, replace the prototype strength bars with a new `app-password-strength`, and keep the `app-auth-layout` content slot pattern that the existing routes already use.

If a migrated password requirements validator already exists in Themis, reuse it. If it does not, the legacy `password-requirements.component.ts` from `~/Projects/GitHub/visomi-dev/.legacy/nive-web-app-old/src/app/components/auth/password-requirements/` is the right source for the strength meter because:

- It already implements a five-rule check (uppercase, lowercase, number, special, length > 7) on a password signal.
- The legacy copy is in Spanish; this spec translates it to English and aligns the visual with the Open Design prototype while preserving the 8+ character threshold used by the backend `passwordSchema`.
- The check logic is small enough to port as a pure signal-based helper rather than an `Input` setter, keeping it consistent with the rest of the `shared/ui` primitives.

## Auth Shell Architecture

The existing `app-auth-layout` keeps a two-column grid with a brand column on the left and a form column on the right. The Open Design prototype uses a single-column centered card with a sticky top header. The replacement is structural:

```
shared/ui/layout/auth-layout/
├── auth-layout.ts            # host listens to hideAppShell route data
├── auth-layout.html          # Tailwind utility classes + <ng-content>
└── auth-layout.css           # empty unless keyframes/exceptional selectors are required
```

The shell renders Tailwind utilities directly in the template. `data-od-id` is used for visual/e2e assertions; BEM-style prototype classes are not carried into Angular templates:

```html
<header data-od-id="auth-shell" class="bg-bg/90 border-outline-variant/40 sticky top-0 z-10 border-b backdrop-blur-md">
  <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
    <a
      data-od-id="brand"
      class="font-display text-fg inline-flex items-center gap-2.5 font-bold tracking-tight"
      routerLink="/"
      aria-label="Themis home"
    >
      <app-logo variant="mark" />
      <span>Themis</span>
    </a>
    <div class="flex items-center gap-2">
      <details data-od-id="lang-menu" class="relative">
        <summary
          class="text-fg hover:bg-surface-container-low inline-flex cursor-pointer list-none items-center gap-1.5 rounded-sm px-3 py-2 font-mono text-xs font-medium tracking-wide"
          aria-label="Language"
        >
          …
        </summary>
        <ul
          class="bg-surface border-outline-variant absolute top-full right-0 z-20 mt-1 min-w-48 rounded-md border p-1 shadow-lg"
          role="listbox"
        >
          …
        </ul>
      </details>
      <button
        data-od-id="theme-toggle"
        class="ui-focus-ring text-fg hover:bg-surface-container-low grid size-9 place-items-center rounded-sm"
        type="button"
        aria-label="Toggle light/dark theme"
      >
        …
      </button>
    </div>
  </div>
</header>

<main class="bg-bg grid min-h-[calc(100vh-64px)] place-items-center px-4 py-8 md:px-6 md:py-12">
  <div
    data-od-id="auth-card"
    class="bg-surface border-outline-variant/60 w-full max-w-[27.5rem] rounded-md border p-[1.75rem_1.375rem] shadow-sm md:p-10"
  >
    <ng-content />
  </div>
</main>
```

The brand mark is a new icon in `shared/ui/media/icon` named `logo-mark` — the balance-scale glyph from the Open Design prototype. The wordmark remains the existing `app-logo variant="wordmark"` component (used elsewhere) but for the auth chrome we render only the mark + name text. `app-logo` is extended with a `variant: 'mark' | 'wordmark' | 'mark-name'` selector and a new SVG path for the balance-scale mark, sourced from the prototype (paths in `sign-in.html:680-694`).

## Language Switcher

The language menu is a new component `shared/ui/layout/lang-switcher` with:

- Selector: `app-lang-switcher`.
- Inputs: `options: ReadonlyArray<{ code: string; label: string }>`, `default: string`.
- Internal signal: `current` (defaults from `localStorage["tm-lang"]` or the default).
- `<details>`/`<summary>` markup matching the prototype; the summary shows the current code; the menu lists options.
- Selection writes `localStorage["tm-lang"]`, closes the menu, and emits no event (the menu is purely a UI preference until `$localize` is wired with runtime locale switching — out of scope).
- Keyboard: Enter/Space toggles the menu; Escape closes; outside click closes.

## Theme Toggle

The existing `app-theme-switcher` lives in `shared/layout/theme-switcher` and is a full dropdown. The Open Design prototype uses a single icon button (sun ↔ moon). We extend `app-theme-switcher` with a `variant: 'toggle' | 'dropdown'` input.

- `variant="toggle"` renders the sun/moon SVG pair from the prototype (`sign-in.html:727-754`).
- The toggle persists `localStorage["tm-theme"]` and updates `data-theme` on the document root.
- On mount, the shell reads the persisted theme and applies it before paint to avoid FOUC.

## Auth Card Pattern

The existing `app-card` primitive renders a generic surface with `padding="lg" tone="raised"`. The Open Design prototype card uses a specific chrome (white surface, 1px subtle border, 40px padding, 440px max-width, 12px radius, shadow-sm). We do **not** overload `app-card`; we keep `app-card` for product surfaces and introduce a thin wrapper component for the auth card. Its template uses Tailwind utilities; its CSS file remains empty unless a transition/keyframe requires it:

```
shared/ui/layout/auth-card/
├── auth-card.ts        # selector: app-auth-card
├── auth-card.html      # <div data-od-id="auth-card" class="..."><ng-content /></div>
└── auth-card.css       # empty unless keyframes/exceptional selectors are required
```

The route templates compose the auth shell + auth card:

```html
<app-auth-layout>
  <app-auth-card>
    <header class="mb-7 space-y-2">
      <p data-slot="kicker" class="text-muted-fg font-mono text-xs font-semibold tracking-widest uppercase" i18n>
        Email verification
      </p>
      <h1
        data-slot="title"
        class="font-display text-fg text-[1.625rem] leading-tight font-bold tracking-[-0.025em]"
        i18n
      >
        Verify email
      </h1>
      <p data-slot="sub" class="text-muted-fg text-[0.9375rem] leading-6" i18n>Enter the 6-digit code we sent.</p>
    </header>
    <app-alert tone="danger" i18n>{{ errorMessage() }}</app-alert>
    <form (submit)="submit($event)" class="grid gap-4" novalidate>…</form>
    <app-link routerLink="…" i18n>Back to sign in</app-link>
  </app-auth-card>
</app-auth-layout>
```

## Field Chrome Pattern

The Open Design field chrome (mono uppercase label, control, optional hint, error message) is already aligned with the existing `app-field` + `app-label` + `app-input` + `app-description` + `app-error-message` primitives. The work in this spec is:

1. Update `app-label` so its default tone renders mono uppercase (`font-mono uppercase tracking-wider text-xs font-semibold text-muted-fg`). The existing `app-label` is plain — this is the only label mutation needed.
2. Update `app-password-input` so its suffix button renders the text "Show" / "Hide" instead of the eye icon. The icon-only variant stays available via `variant="icon"`. Stable aria-labels match the prototype.
3. Add an `app-error-message icon` variant so the inline error icon renders next to the text (matches the prototype field chrome).

## Auth Alert Pattern

The existing `app-alert` covers the success + danger tones but the prototype alert uses a leading icon and a colored soft container. We extend `app-alert` with `variant="auth"` so it renders the soft container (danger-soft or success-soft), the icon, and the message with the prototype spacing.

The `role="alert"` attribute is already set by `app-alert`. New: the alert must render above the form, never below — this is enforced by route templates, not by the component.

## Password Strength Primitive

`shared/ui/forms/password-strength/password-strength.ts`:

```ts
@Component({
  selector: 'app-password-strength',
  templateUrl: './password-strength.html',
  styleUrl: './password-strength.css',
})
export class PasswordStrength {
  readonly password = input.required<Signal<string>>();
  readonly id = input<string>('password-strength');

  readonly level = computed<0 | 1 | 2 | 3 | 4>(() => {
    const value = this.password()();
    if (!value) return 0;
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
    if (/\d/.test(value) || /[^A-Za-z0-9]/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value) && /\d/.test(value)) score += 1;
    return Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  });

  readonly label = computed(() => STRENGTH_LABELS[this.level()]);
}
```

`password-strength.html` uses Tailwind classes directly and exposes `data-slot` for tests. Tests must avoid private CSS selectors:

```html
<div class="space-y-2" data-slot="password-strength" [attr.data-level]="level()" aria-hidden="true">
  <span class="grid grid-cols-4 gap-1.5">
    <span data-slot="password-strength-bar" class="h-1.5 rounded-full"></span>
    <span data-slot="password-strength-bar" class="h-1.5 rounded-full"></span>
    <span data-slot="password-strength-bar" class="h-1.5 rounded-full"></span>
    <span data-slot="password-strength-bar" class="h-1.5 rounded-full"></span>
  </span>
  <span data-slot="password-strength-label" class="text-muted-fg text-xs" [id]="id()">{{ label() }}</span>
</div>
```

The label is exposed to assistive tech via the parent `app-description` element with `aria-describedby` referencing `id()`. The visual meter carries `aria-hidden="true"` to avoid double announcement.

## Signal Forms Migration

The auth routes currently use Reactive Forms (`FormGroup`, `FormControl`, `Validators`). Signal Forms (Angular 21) provide better ergonomics for signal-driven views. This spec migrates all four existing auth routes + the new reset-password route to Signal Forms:

```ts
import { form, required, email, minLength, signalFormControl } from '@angular/forms/signals';

@Component({ … })
export class SignIn {
  readonly emailControl = signalFormControl('', { validators: [required(), email()] });
  readonly passwordControl = signalFormControl('', { validators: [required(), minLength(8)] });
  readonly form = form(this.emailControl, this.passwordControl);

  readonly emailError = computed(() => controlError(this.emailControl, { … }));
  readonly passwordError = computed(() => controlError(this.passwordControl, { … }));
}
```

Existing helpers in `apps/web/app/src/app/shared/form/form-errors.ts` are reused — they accept any control with a typed errors map. The migration keeps the same field ids, the same `aria-describedby` wiring, and the same submit semantics.

## Password Reset OTP Architecture (single-screen)

- Password reset is OTP-based. It must not use `/reset-password/:token` or query-string reset tokens.
- The Open Design `reset-password.html` collapses the verify-code step and the set-new-password step into a single screen. This spec mirrors that: there is no separate `/app/verify-reset` route.
- Route sequence: `/app/forgotten-password` → `/app/reset-password` (single-screen OTP + password).
- The backend currently has only `sign_in | sign_up` challenge purposes and `requestPasswordReset(email)` incorrectly creates a `sign_in` challenge. This spec replaces that stub with a real `password_reset` challenge flow.
- `/app/forgotten-password` calls `POST /auth/password/forgotten`, which creates a `password_reset` challenge and returns an `AuthChallenge` payload.
- `/app/reset-password` reuses `app-pin-input` for the OTP step. On OTP submit, it calls `POST /auth/password/reset/verify` with `{ challengeId, pin }`. The backend consumes the OTP and creates a short-lived server-owned reset session (HttpOnly cookie or server session — never a reset token in the URL or frontend storage). The component then reveals the password step inside the same card without changing routes.
- The same submit button toggles its label between "Verify code" (OTP step) and "Update password" (password step).
- `/app/reset-password` is guarded by `resetSessionGuard`. If no valid reset session exists (e.g. user reopened the URL directly), redirect to `/app/forgotten-password`.

## Reset Password Route

- Path: `/app/reset-password` with `canActivate: [anonymousGuard, resetSessionGuard]` and `data: { hideAppShell: true }`.
- Component path: `apps/web/app/src/app/auth/reset-password/reset-password.ts`.
- Route constant: `RESET_PASSWORD_PATH` + `RESET_PASSWORD_URL` in `apps/web/app/src/app/shared/constants/routes.ts`.
- The submit on the password step calls `Auth.resetPassword({ password })`, relying on the active server-owned reset session.
- The success state replaces the form inside the same `app-auth-card` (signal-driven swap) and renders title "Password updated" + copy "You're all set. Sign in with your new password to continue." + "Sign in to continue" link.

## Backend OTP Reset Contracts

- `challengeSchema.purpose`: `z.enum(['sign_in', 'sign_up', 'password_reset'])`.
- `POST /auth/password/forgotten`: creates a `password_reset` challenge and sends an OTP email. It must not create a `sign_in` challenge.
- `POST /auth/password/reset/verify`: validates a `password_reset` challenge and creates a short-lived reset session.
- `POST /auth/password/reset`: requires the reset session and updates the password hash.
- `POST /auth/verification/resend`: supports `password_reset` challenges through the existing resend path.
- Test mailbox schemas include `password_reset` so e2e can read the reset OTP.
- Mail copy for `password_reset`: "Your Themis password reset code is <pin>. Use it to reset your password. This code expires at <expiresAt>."

## E2E Update Strategy

The e2e suite in `apps/web/app-e2e/src/auth/` is the contract that locks the visual fidelity. After the redesign:

1. **Stable selectors keep working** (see `requirements.md` Stable Selectors table). No source-level change in `apps/web/app-e2e/src/auth/*.spec.ts` other than the new tests.
2. **Visual assertions are added** to every existing spec. Each auth route test must assert the Open Design chrome: `data-od-id="auth-shell"`, `data-od-id="auth-card"`, the language switcher `[data-od-id="lang-menu"]`, the theme toggle button, and the brand link.
3. **Copy assertions** verify the verbatim Open Design copy on the rendered page (titles, kickers, subtitles, button labels, helper text, success state copy).
4. **New reset-password spec** is added at `apps/web/app-e2e/src/auth/reset-password.spec.ts` covering:
   - Validation: empty form, weak password, mismatched confirm
   - Strength meter: levels 0..4 with sample passwords
   - Submit + success state transition
   - "Cancel and go back" link navigates to sign-in
5. **Visual snapshot** (Playwright `toHaveScreenshot`) at 360px, 768px, and 1280px for each auth route, light and dark mode. Snapshots land in `apps/web/app-e2e/src/auth/__screenshots__/`.
6. **AXE** assertion on each migrated route.

## Risks

| Risk                                                                   | Mitigation                                                                                                                                              |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app-auth-layout` rewrite breaks route chrome for activation/dashboard | Activation uses the authenticated shell, not `app-auth-layout`. Verify all `data: { hideAppShell: true }` routes are the only consumers.                |
| New `app-password-strength` ships a different scale than the legacy    | Unit-test the level mapping (table-driven) and assert the Open Design label set in the validation run                                                   |
| Signal Forms migration changes field ids or selectors                  | Migration follows the existing field ids by construction. E2E selectors are verified before merge                                                       |
| E2E snapshot churn from incidental style tweaks                        | Snapshots are regenerated once at the end of the spec with a clean baseline; intermediate commits use `data-od-id` assertions instead of full snapshots |
| Existing backend stub creates a `sign_in` challenge for password reset | Replace it with a first-class `password_reset` purpose and add reset verify + submit endpoints in the same implementation slice                         |
| Mobile reflow on the new chrome                                        | Visual snapshot at 360/390px; manual review at the validation step                                                                                      |

## Success Criteria

- All five auth route families (sign-in, sign-up, recover-password, confirm-account [verify-email + verify-device], reset-password) render 1:1 with the Open Design prototype.
- The auth shell renders the sticky chrome (brand mark, language switcher, theme toggle) on every auth route.
- The `app-password-strength` primitive renders the four-bar meter with the Open Design labels and matches the legacy check semantics.
- Every e2e spec in `apps/web/app-e2e/src/auth/` passes (existing + new).
- Visual snapshots match the Open Design prototypes at 360px, 768px, and 1280px in light + dark mode.
- AXE checks pass on every migrated route.
- `pnpm nx run app:lint`, `pnpm nx run app:vite:test`, `pnpm nx run app:build`, and `pnpm nx extract-i18n app` all pass.
