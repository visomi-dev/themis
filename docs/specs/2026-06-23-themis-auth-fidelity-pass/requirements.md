# Themis Auth Fidelity Pass — Requirements

## Context

The previous spec, [`docs/specs/2026-06-22-themis-web-app-redesign/`](../2026-06-22-themis-web-app-redesign/), migrated every auth route family to the `shared/ui` foundation and removed PrimeNG. The migration preserved the existing product copy and the two-column auth layout (brand column + form column).

A visual review against the Open Design prototypes in `resources/open-design/themis-app/` shows that the current Themis auth screens are a **hybrid** of the old two-column Themis posture and the new single-column centered-card posture. They do not match the Open Design prototypes 1:1. Two pieces of work were deferred in the previous spec:

1. The Open Design password reset flow (`reset-password.html`) was marked as **not implemented** because no reset route existed.
2. The Open Design prototype layout for the auth shell (sticky header, brand mark, language switcher, theme toggle, single-column card) was not adopted — the current `app-auth-layout` keeps the legacy brand-column + form-column grid.

This spec is a fidelity pass: every auth surface must reproduce the Open Design prototype 1:1 in structure and copy, while staying inside the existing `shared/ui` primitive contract and Angular route plumbing.

## Dependencies

- `docs/specs/2026-06-22-catalyst-angular-ui-foundation/` — provides `shared/ui/forms`, `shared/ui/layout/auth-layout`, `shared/ui/actions/button`, `shared/ui/overlays/alert`, `shared/ui/forms/password-input`, `shared/ui/forms/pin-input`, `shared/ui/data/avatar`, `shared/ui/media/icon`, etc.
- `docs/specs/2026-06-22-themis-web-app-redesign/` — established the route-to-prototype mapping that this spec finishes.
- `docs/specs/2026-06-23-catalyst-pure-tokens-alignment/` — retires Material 3 tokens and exposes the Catalyst token set (`--color-bg`, `--color-panel`, `--color-panel-raised`, `--color-fg`, `--color-muted-fg`, `--color-accent`, `--color-accent-fg`, `--color-danger`, `--color-danger-fg`, `--color-ring`, `--color-border`, `--color-border-subtle`) consumed through Tailwind utilities (`bg-bg`, `text-fg`, `border-border`, etc.). This spec consumes those tokens and must not reintroduce the legacy `--tm-*` palette from the Open Design prototypes.
- `~/Projects/GitHub/visomi-dev/.legacy/nive-web-app-old/src/app/components/auth/password-requirements/` — the source for password requirement logic if it has not already been migrated.

## Open Design Mapping

| Open Design File        | Themis Surface                                             | Status before this spec       | Status after this spec                                                                                                                                                      |
| ----------------------- | ---------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sign-in.html`          | `apps/web/app/src/app/auth/sign-in`                        | Hybrid layout, old copy       | 1:1 Open Design, copy verbatim                                                                                                                                              |
| `sign-up.html`          | `apps/web/app/src/app/auth/sign-up`                        | Hybrid layout, missing fields | 1:1 Open Design, copy verbatim                                                                                                                                              |
| `recover-password.html` | `apps/web/app/src/app/auth/forgotten-password`             | Hybrid layout, old copy       | 1:1 Open Design, copy verbatim                                                                                                                                              |
| `confirm-account.html`  | `apps/web/app/src/app/auth/verify-email`, `verify-device`  | Hybrid layout, old copy       | 1:1 Open Design, copy verbatim                                                                                                                                              |
| `sign-in.html` (chrome) | `shared/ui/layout/auth-layout` (sticky header + controls)  | Two-column grid (rebranded)   | Single-column Open Design shell. The auth chrome is identical across every auth HTML in the package, so any auth HTML can be used as the canonical reference for the shell. |
| `reset-password.html`   | New `apps/web/app/src/app/auth/reset-password` (canonical) | Not implemented               | Canonical reset screen (single-screen OTP + password), copy verbatim                                                                                                        |
| `index.html`            | Demonstrative launcher only — no Angular route             | n/a                           | Out of scope. `index.html` is an Open Design artifact used to showcase the five flows. It is not shipped as a Themis route and is not consumed by the app shell.            |
| `critique.json`         | Visual + copy guidance                                     | Referenced but partial        | Heeded for the verify screen subtitle                                                                                                                                       |

Note on reset variants: `reset-password.html` is the only reset reference shipped in the Open Design package and is authoritative for this spec. Earlier working drafts (`themis-reset.html`, `reset-password-2.html`) are no longer in the package — their artifact metadata was removed in this spec to keep the mapping one-to-one. The current `reset-password.html` already encodes the single-screen OTP + password flow with copy "Reset your password" / "Enter the 6-digit code we sent to your email, then choose a new password." / success title "Password updated" / success copy "You're all set. Sign in with your new password to continue."

## Goals

1. Replace every auth screen's visual structure so it matches the Open Design prototype 1:1, including the chrome (sticky header, brand mark, language switcher, theme toggle), the centered single-column card, the field chrome, the show/hide button, and the strength meter.
2. Replace the auth copy with the prototype copy verbatim, wrapped in `$localize` (`i18n`) and surfaced through `pnpm nx extract-i18n app`.
3. Add the password reset flow using OTP verification (`/app/forgotten-password` → `/app/reset-password` single-screen) following `recover-password.html`, `confirm-account.html`, and the canonical `reset-password.html`.
4. Reuse the migrated password requirements validator if it exists. If it does not, port the requirements logic from `~/Projects/GitHub/visomi-dev/.legacy/nive-web-app-old/src/app/components/auth/password-requirements/password-requirements.component.ts` into `shared/ui/forms/password-strength` with English copy and the Open Design 4-bar visual.
5. Migrate auth forms from Reactive Forms to **Signal Forms**, preserving typed field access and stable selectors.
6. Update the e2e suite in `apps/web/app-e2e/src/auth/` so every assertion verifies that the screen matches the Open Design prototype structurally and that the copy matches verbatim.

## Non-Goals

1. Do not introduce new visual dependencies. Every visual change uses `shared/ui/*` and the existing Themis token layer (`apps/web/app/src/styles.css`).
2. Do not redesign the public Astro website in this spec.
3. Do not implement token-in-URL password reset. The reset flow must use the same OTP challenge pattern as sign-up and sign-in verification.
4. Do not change the authenticated shell, dashboard, projects, or activation routes.
5. Do not introduce internationalization tooling beyond what `extract-i18n` already provides.

## Functional Requirements

### Auth Shell (`shared/ui/layout/auth-layout`)

- The auth shell renders a sticky top header with three slots: brand slot (left), controls slot (right). The form/content slot fills the centered single-column card area below.
- The brand slot shows the Themis balance-scale mark inside a rounded square (`bg-accent` background, `text-accent-fg` icon) plus the wordmark `Themis` in display font. The whole brand links to `/`.
- The controls slot shows:
  - A language switcher (`<details>` / `<summary>` with menu items EN/ES/PT-BR/JA/DE/ZH). The visible code is the active language. The menu uses `data-od-id="lang-menu"`.
  - A theme toggle button (sun/moon SVG, `aria-label="Toggle light/dark theme"`).
- The auth shell applies the persisted theme on first render (no flash). The theme toggle writes `localStorage["tm-theme"]` and updates the `data-theme` attribute.
- The auth shell accepts the form/card via `<ng-content>` (no `data-slot` requirement). Remove the legacy brand-column slot.
- All chrome elements must be keyboard accessible (Tab order: brand link → language summary → theme toggle → first form control). The language menu opens on Enter/Space, closes on Escape, click-outside, and selection.

### Auth Card

- Single column, max width 440px on desktop, full width minus 32px on mobile.
- Card padding: 40px on desktop (≥520px viewport), 28px×22px on mobile (<520px).
- Card surface: `bg-panel` (white in light, dark slate in dark). Subtle 1px border (`border-border-subtle`) and shadow-sm.
- Card structure (top to bottom): kicker label → title → optional sub-text → optional alert → form → footer link.
- The kicker is uppercase mono caps (Inter Mono / JetBrains Mono), 12px, muted fg.
- The title is display font (Manrope), 26px, semibold, letter-spacing −0.025em.
- The sub-text is body font, 15px, muted fg.
- Card footer (when present) is a top divider with the secondary action link.

### Field Chrome

- Each field renders: mono uppercase label (`font-mono text-xs font-semibold uppercase tracking-widest text-muted-fg`, 12px) → control → error message (only when invalid).
- Inputs render at min-height 44px, padding 0 14px, `rounded-sm` radius, 1px border `border-border`. Focus: 3px accent soft ring via the `ui-focus-ring` utility.
- Error state: input border becomes `border-danger`, error message appears with the inline error icon (lucide `circle-alert`).
- Password input suffix is a **text** button ("Show" / "Hide") in mono uppercase 11px, not an icon. `aria-label` toggles between `"Show password"` and `"Hide password"`.

### Auth Alert

- The auth alert (top-of-card, above the form) renders danger or success. It carries a `role="alert"` and an icon (lucide `circle-alert` for danger, `circle-check` for success). Tone colors use the soft fills (`bg-danger/10 text-danger`, `bg-accent/10 text-accent`) with strong fg.
- The alert must NOT appear below the form. It must always appear above.

### Forgot Password Success State

- After a successful `forgotten-password` submit, the form is replaced with a success state inside the same card: "We sent a recovery link to **`<email>`**. Open it on this device to choose a new password." plus a "Back to sign in" link.

### Password Reset OTP Flow (single-screen)

The Open Design `reset-password.html` collapses the verify-code step and the set-new-password step into one screen. The route renders a single component that owns both steps; it does not split them across `/app/verify-reset` and `/app/reset-password`.

- `/app/forgotten-password` collects the email and calls `POST /auth/password/forgotten`.
- `POST /auth/password/forgotten` creates a verification challenge with purpose `password_reset` and sends a 6-digit OTP email. It must not create a `sign_in` challenge and must not send a magic-link token.
- After a successful request, the frontend stores the returned `AuthChallenge` in `Auth.pendingChallenge` and navigates to `/app/reset-password`.
- `/app/reset-password` renders the OTP step first. On OTP verification success (via `POST /auth/password/reset/verify`) it reveals the password step in the same card without changing routes. The backend establishes a short-lived reset session after OTP verification (HttpOnly cookie or server session state — never a reset token in the URL or frontend storage).
- The same submit button toggles its label between "Verify code" (OTP step) and "Update password" (password step).
- Resend button with cooldown timer, "Change email" link back to `/app/forgotten-password`, and footer "Back to sign in" link are all visible inside the card on every step.
- After a successful `POST /auth/password/reset`, the form is replaced by a success state inside the same card: title "Password updated", copy "You're all set. Sign in with your new password to continue.", and a "Sign in to continue" link to `/app/sign-in`.
- The reset session is server-owned. If the user reopens `/app/reset-password` without a valid reset session, the route redirects to `/app/forgotten-password`.

### Reset Password — New Route

- New route: `/app/reset-password` with `canActivate: [anonymousGuard, resetSessionGuard]` and `data: { hideAppShell: true }`. The component lives in `apps/web/app/src/app/auth/reset-password/`.
- Form steps (single screen, two internal states):
  - OTP step: 6 cells (`app-pin-input`), auto-advance, paste support, label "Verification code".
  - Password step: new password (with `app-password-strength` + show/hide text button) and confirm new password (with show/hide text button).
- Email hint card above the form: label "Code sent to", email address, "Change email" link.
- Helper text under the new password field: "Use 8+ characters. Mix uppercase, lowercase, numbers, and symbols for the strongest result."
- Submit button label: "Verify code" while the OTP step is active, "Update password" once the OTP step is verified.
- Cancel link: "Back to sign in" footer link → `/app/sign-in`.
- Success state (replaces the form inside the same card): title "Password updated" + copy "You're all set. Sign in with your new password to continue." + "Sign in to continue" button → `/app/sign-in`.
- The reset session is server-owned. If it is missing, expired, or invalid, the route redirects to `/app/forgotten-password`. If submit fails, the form stays mounted and the alert shows the localized failure copy.

### Backend Requirements

- Extend `challengeSchema.purpose` from `sign_in | sign_up` to `sign_in | sign_up | password_reset`.
- Update `VerificationPurpose` consumers, mailbox test schemas, OpenAPI schemas, and e2e mailbox helpers to support `password_reset`.
- Update `requestPasswordReset(email)` so it creates `createChallenge(user, 'password_reset')`, not `createChallenge(user, 'sign_in')`.
- Update `createMessageBody` so `password_reset` emails say the OTP is for resetting the password, not signing in.
- Add `POST /auth/password/reset/verify` accepting `{ challengeId, pin }`, consuming a `password_reset` challenge, and establishing a short-lived reset session.
- Add `POST /auth/password/reset` accepting `{ password }`, requiring the active reset session, updating the password hash, invalidating the reset session, and signing out other sessions/devices where supported.
- Add `GET /auth/password/reset/session` or expose reset-session state through a minimal endpoint if the frontend guard needs to validate session presence before rendering `/app/reset-password`.

### Password Strength (`shared/ui/forms/password-strength`)

- New shared primitive. Selector: `app-password-strength`. Inputs: `password: Signal<string>`. Output: `value: Signal<0|1|2|3|4>` and `label: Signal<string>`.
- Visual: 4 horizontal bars + a label. `data-level` attribute `0..4` drives which bars are filled.
- Levels: `0 → "—"`, `1 → "Weak"`, `2 → "Fair"`, `3 → "Strong"`, `4 → "Excellent"`.
- Rules (in order, all four required for level 4): length ≥ 8, contains lowercase, contains uppercase, contains number, contains symbol. This matches the backend `passwordSchema` minimum and the Nive legacy requirements logic.
- A11y: `aria-hidden="true"` on the visual meter (the label sits next to the input and acts as the accessible value via `aria-describedby`). The label updates live as the user types.
- English copy (matches the Open Design prototype).

## Visual Requirements

- Every screen must reproduce the Open Design prototype structure 1:1: chrome, card, fields, alerts, footer.
- The current two-column brand-column auth layout is removed from `app-auth-layout`.
- Dark mode must reproduce the Open Design dark palette swap (no light bleed-through).
- Mobile (360/390/520px) follows the Open Design responsive rules: card padding shrinks to 28/22px, OTP cells to 52px, language menu collapses correctly.
- Tailwind utility classes are the default styling mechanism in Angular templates. Semantic CSS classes copied from Open Design prototypes (for example `auth-controls`, `auth-card__title`, or `password-strength__bar`) must not appear in route templates.
- Component `.css` files are allowed only for exceptional cases that Tailwind cannot express cleanly: keyframes, `@starting-style`, reduced-motion overrides, or very small element-level selectors inside a reusable primitive. Any custom selector must be documented in the component comment or spec implementation notes.
- Shared primitives may expose `data-slot` and `data-od-id` attributes for tests; tests should not depend on private BEM-style CSS class names.

## Accessibility Requirements

- AXE checks pass on every migrated auth route.
- Stable selectors preserved (see the Stable Selectors section in `plan.md`).
- Error messages wired through `aria-describedby` and `aria-invalid`.
- Theme toggle and language switcher keyboard accessible; language menu closes on Escape and outside click.
- Reduced motion: disable strength meter transitions when `prefers-reduced-motion: reduce`.

## Stable Selectors (e2e must not break)

The e2e suite in `apps/web/app-e2e/src/auth/` and the unit specs under `apps/web/app/src/app/auth/` rely on a fixed set of selectors. The redesign must preserve all of them.

| Surface                      | Stable selector                                                        | Notes                                                                      |
| ---------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| sign-in / sign-up / reset    | `getByLabel('Email')`                                                  | `<label for=…>` + matching `id`                                            |
| sign-in / sign-up / reset    | `getByLabel('Password')` / `'New password'` / `'Confirm new password'` | New labels added for reset; sign-in keeps `Password`                       |
| sign-in / sign-up            | `getByRole('button', { name: 'Sign in' })` / `'Create account'`        |                                                                            |
| sign-up                      | `getByRole('button', { name: 'Create account' })`                      |                                                                            |
| verify-email / verify-device | `getByRole('button', { name: 'Verify and continue' })`                 |                                                                            |
| verify-email / verify-device | `getByRole('button', { name: 'Resend code' })`                         |                                                                            |
| verify-email / verify-device | `[data-slot=pin-input] input`                                          | OTP helper selector (from prior spec)                                      |
| sign-in                      | `getByRole('link', { name: 'Forgotten password?' })`                   |                                                                            |
| forgotten-password           | `#forgotten-password-email`                                            | `id` retained on the input                                                 |
| forgotten-password           | `getByRole('button', { name: 'Send reset link' })`                     |                                                                            |
| forgotten-password           | `getByRole('link', { name: 'Back to sign in' })`                       |                                                                            |
| reset-password (new)         | `getByRole('button', { name: 'Verify code' })`                         | OTP step submit; label toggles to "Update password" after OTP verification |
| reset-password (new)         | `getByRole('button', { name: 'Update password' })`                     | Password step submit                                                       |
| reset-password (new)         | `getByRole('button', { name: 'Resend code' })`                         | Resend inside the card (matches verify-email)                              |
| reset-password (new)         | `getByRole('button', { name: 'Sign in to continue' })`                 | Success state CTA, distinct from sign-in submit                            |
| reset-password (new)         | `getByLabel('Show password')` / `'Hide password'`                      | Text button                                                                |
| reset-password (new)         | `[data-od-id="pending-email"]`                                         | Email hint card slot for visual e2e                                        |
| auth chrome (new)            | `getByRole('button', { name: 'Toggle light/dark theme' })`             | New                                                                        |
| auth chrome (new)            | `[data-od-id="auth-shell"]` / `[data-od-id="auth-card"]`               | For visual e2e assertions                                                  |
| strength meter (new)         | `[data-slot=password-strength]` / `[data-level]`                       | For visual e2e assertions                                                  |

All e2e selectors must resolve after the redesign without source-level changes in `apps/web/app-e2e/src/auth/*.spec.ts` other than the explicitly listed new tests for the reset OTP routes and the visual chrome assertions.

## Out-of-Scope APIs

- Token-in-URL password reset links are explicitly out of scope.
- Runtime locale switching for the language menu is out of scope.
