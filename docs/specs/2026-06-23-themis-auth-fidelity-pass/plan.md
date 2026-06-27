# Themis Auth Fidelity Pass — Implementation Plan

The work is sliced into ten phases. Each phase ends with a verification command. Phases 1–3 cover shared primitives and the auth shell; phase 4 fixes the backend OTP reset contract; phases 5–8 cover the per-route rewrites; phase 9 covers e2e visual assertions and snapshots; phase 10 is the mobile-first polish and visual quality pass derived from the `web-design-reviewer` and `premium-frontend-ui` skills. No phase combines infrastructure, product behavior, broad refactors, and e2e coverage in a single PR — the slices below are independently shippable.

The branch is `feat/OC/themis-auth-fidelity-pass`. Each phase lands as one PR (or stacked PRs) on top of `main`.

## Phase 0 — Audit And Selector Inventory

1. Diff each Open Design prototype against the current Angular route, listing every visual element that diverges from the prototype.
2. Re-run `rg "primeng|primeicons|tailwindcss-primeui|pi pi-|\.p-" apps/web/app/src` to confirm there are still no PrimeNG references after the previous spec.
3. Audit route templates and component CSS for semantic/BEM-style prototype classes copied into Angular code. Replace them with Tailwind utilities and `data-slot` / `data-od-id` hooks unless they are exceptional selectors inside reusable primitives.
4. Capture the current selector surface used by `apps/web/app-e2e/src/auth/*.spec.ts` and lock it as the migration contract (see Stable Selectors table in `requirements.md`).
5. Inventory which routes consume `app-auth-layout` (only the five auth routes) to confirm the rewrite scope.

Suggested checks:

```bash
rg 'class="[a-z][a-z0-9-]*(__|--)|auth-controls|auth-card__|password-strength__' apps/web/app/src
rg '^\.[a-z][a-z0-9-]*(__|--)|\.auth-|\.password-strength' apps/web/app/src --glob '*.css'
```

Exit criteria: audit document committed under `docs/specs/2026-06-23-themis-auth-fidelity-pass/audit.md` (out of band — does not block subsequent phases).

## Phase 1 — Auth Shell, Brand Mark, Lang Switcher, Theme Toggle

1. Add the balance-scale icon to `shared/ui/media/icon` (SVG paths from `sign-in.html:680-694`). Export as `icon-paths.logo-mark`.
2. Extend `shared/ui/layout/logo/logo.ts` with `variant: 'mark' | 'wordmark' | 'mark-name'` and add the new SVG path for the mark.
3. Rewrite `shared/ui/layout/auth-layout/auth-layout.html` to the sticky-header + centered-card structure (`auth-shell` + `auth-main` + `<ng-content>`).
4. Add `shared/ui/layout/auth-card/` with selector `app-auth-card`, max-width 440px, padding 40/28, surface + subtle border + shadow-sm.
5. Add `shared/ui/layout/lang-switcher/` (selector `app-lang-switcher`) with `<details>` markup matching the prototype.
6. Extend `shared/ui/layout/theme-switcher` with `variant="toggle"` (sun/moon icon button) + persistence of `localStorage["tm-theme"]` + early `data-theme` application to avoid FOUC.
7. Style the chrome in `apps/web/app/src/styles.css` (tokens already exist; the chrome only consumes them). Confirm dark-mode parity.
8. Add `data-od-id` attributes on every chrome element (`auth-shell`, `brand`, `lang-menu`, `theme-toggle`, `auth-card`) so e2e can assert presence.

Verification:

```bash
pnpm nx run shared-ui:lint
pnpm nx run app:lint
pnpm nx run app:vite:test
pnpm nx run app:build
```

Expected: lint + unit tests pass, build emits browser + SSR bundle, no FOUC on the auth routes.

## Phase 2 — Password Strength Primitive

1. Search for an existing migrated password requirements validator/component in Themis. Reuse it if present.
2. If no migrated implementation exists, port `~/Projects/GitHub/visomi-dev/.legacy/nive-web-app-old/src/app/components/auth/password-requirements/password-requirements.component.ts` to `shared/ui/forms/password-strength/password-strength.ts`.
3. Translate the copy to English and align the visual with the Open Design prototype while preserving the 8+ character threshold used by backend `passwordSchema` and the Nive legacy implementation.
4. Replace the legacy checklist visual with the four-bar meter (`data-level="0..4"`) while keeping an accessible requirements list where the Open Design screen calls for it.
5. Export a `computePasswordStrength(value: string): { level: 0|1|2|3|4; label: string }` helper from `shared/ui/forms/password-strength` so it can be unit-tested without rendering.
6. Add unit specs under `shared/ui/forms/password-strength/password-strength.spec.ts` with a table of sample passwords and expected levels.

Verification:

```bash
pnpm nx run shared-ui:lint
pnpm nx run shared-ui:test
pnpm nx run app:vite:test
```

## Phase 3 — Field Chrome Adjustments

1. Update `shared/ui/forms/label/label.ts` so the default tone renders mono uppercase tracking-wider text-xs font-semibold muted-fg. The existing plain tone stays as `tone="plain"`.
2. Update `shared/ui/forms/password-input/password-input.ts` so the suffix button defaults to text "Show" / "Hide" with mono uppercase styling. `variant="icon"` retains the eye/eye-off icon. Stable aria-labels: `"Show password"` / `"Hide password"`.
3. Update `shared/ui/forms/error-message/error-message.ts` to render an inline error icon (lucide `circle-alert`) next to the message text, matching the prototype field chrome.
4. Extend `shared/ui/overlays/alert/alert.ts` with `variant="auth"` (soft container + leading icon + `role="alert"`).

Verification:

```bash
pnpm nx run shared-ui:lint
pnpm nx run shared-ui:test
pnpm nx run app:vite:test
pnpm nx run app:build
```

## Phase 4 — Backend OTP Reset Contracts

1. Extend `apps/web/api/src/auth/auth-schemas.ts` so `challengeSchema.purpose` supports `password_reset` in addition to `sign_in` and `sign_up`.
2. Update `apps/web/api/src/auth/auth-service.ts` so `requestPasswordReset(email)` creates `createChallenge(user, 'password_reset')`, not `createChallenge(user, 'sign_in')`.
3. Update `apps/web/api/src/auth/auth-mail.ts` so `password_reset` emails use reset-specific copy.
4. Add `POST /auth/password/reset/verify` to consume `{ challengeId, pin }`, verify a `password_reset` challenge, and establish a short-lived server-owned reset session.
5. Add `POST /auth/password/reset` to require the reset session, update the password hash, invalidate the reset session, and return success.
6. Add `GET /auth/password/reset/session` if the frontend needs to validate the reset session for `resetSessionGuard`.
7. Update OpenAPI schemas, test mailbox schemas, and e2e mailbox helpers to accept `password_reset` purpose.
8. Add API tests for request, verify, reset submit, expired challenge, consumed challenge, wrong purpose, and missing reset session.

Verification:

```bash
pnpm nx run api:lint
pnpm nx run api:test
pnpm nx run app-e2e:lint
```

## Phase 5 — Verify Reset And Reset Password Routes

1. Add `RESET_PASSWORD_PATH` and `RESET_PASSWORD_URL` constants to `apps/web/app/src/app/shared/constants/routes.ts`. There is no separate verify-reset route — `/app/reset-password` is a single-screen OTP + password flow.
2. Register `/app/reset-password` in `app.routes.ts` with `canActivate: [anonymousGuard, resetSessionGuard]`, `data: { hideAppShell: true }`, and `loadComponent`.
3. Create `apps/web/app/src/app/auth/reset-password/reset-password.{ts,html,css,spec.ts}`.
4. Update `Auth.requestPasswordReset(email)` so it stores the returned `AuthChallenge` and navigates from `forgotten-password` to `/app/reset-password`.
5. Add `Auth.submitPasswordResetVerification(pin)` to call `POST /auth/password/reset/verify`. On success, the route reveals the password step without navigation.
6. Add `Auth.resetPassword({ password })` to call `POST /auth/password/reset` using the active reset session.
7. Add `resetSessionGuard` to redirect missing/expired reset sessions to `/app/forgotten-password`.
8. Migrate the OTP step and the password step to Signal Forms. OTP step uses `app-pin-input`; password step uses new password + confirm new password.
9. Wire `app-password-strength` under the new password field (revealed only after OTP verification).
10. Implement the success state transition (form → success card) with title "Password updated", copy "You're all set. Sign in with your new password to continue.", and "Sign in to continue" CTA.
11. Add the e2e spec `reset-password.spec.ts` covering OTP validation, password validation, strength meter levels, success state, cancel link, and resend cooldown.

Verification:

```bash
pnpm nx run app:lint
pnpm nx run app:vite:test
pnpm nx run app:build
pnpm nx e2e app-e2e -- --grep "reset-password"
```

## Phase 6 — Sign-In And Sign-Up Rewrites

1. Migrate `apps/web/app/src/app/auth/sign-in/sign-in.{ts,html,css,spec.ts}` to Signal Forms.
2. Rewrite the template to use `app-auth-layout` + `app-auth-card` + Open Design copy.
3. Replace `app-password-input` with `variant="text"` so the suffix is text.
4. Apply the prototype copy: kicker `Account access`, title `Sign in`, sub `Welcome back. Use your work email to access your Themis workspace.`, button `Sign in`, footer link `Create an account`, forgot-password link `Forgot password?`, remember-device label `Remember this device`.
5. Repeat for `sign-up`. Add the `Confirm password` field with its own `app-password-input` (text variant). Add `app-password-strength` under the password field. Apply the prototype copy verbatim (kicker `New account`, title `Create your account`, helper `Use 8+ characters. Mix uppercase, lowercase, numbers, and symbols for the strongest result.`).
6. Update the existing e2e specs to assert the Open Design chrome (`data-od-id="auth-shell"`, `auth-card`, `lang-menu`, `theme-toggle`) and the verbatim copy.

Verification:

```bash
pnpm nx run app:lint
pnpm nx run app:vite:test
pnpm nx run app:build
pnpm nx e2e app-e2e -- --grep "sign-in|sign-up"
```

## Phase 7 — Forgotten Password And Verification Routes

1. Migrate `apps/web/app/src/app/auth/forgotten-password/{ts,html,css,spec.ts}` to Signal Forms.
2. Apply the Open Design copy: kicker `Account recovery`, title `Recover password`, sub `Enter your work email and we'll send you a recovery link. The link expires in 30 minutes.`, button `Send recovery link`.
3. Implement the success state inside the same card: `We sent a recovery link to <email>. Open it on this device to choose a new password.` plus `Back to sign in`.
4. Migrate `verify-email` and `verify-device` to the Open Design chrome.
5. Apply the Open Design copy:
   - verify-email: kicker `Email verification`, title `Verify email`, sub `Enter the 6-digit code we sent to <email>.`, button `Verify and continue`.
   - verify-device: kicker `Device verification`, title `Verify device`, sub `Enter the 6-digit code we sent to <email>.`, button `Verify and continue`.
6. Drop the duplicated email mention in `verify-email.html` (per `critique.json` self-critique).
7. Add `verify-device.spec.ts` if missing.
8. Update `forgotten-password.spec.ts` so success navigates/links into the reset OTP flow (`/app/reset-password`) instead of implying a token link.
9. Update `forgotten-password.spec.ts` and `verify-email.spec.ts` to assert the Open Design chrome and copy.

Verification:

```bash
pnpm nx run app:lint
pnpm nx run app:vite:test
pnpm nx run app:build
pnpm nx e2e app-e2e -- --grep "forgotten-password|verify-email|verify-device"
```

## Phase 8 — i18n Extraction And Source-Text Sweep

1. Run `pnpm nx extract-i18n app` and confirm the xliff updates include every new label (titles, kickers, sub-text, helper text, alerts, success messages, strength meter labels, link labels, button labels).
2. Grep every auth route for raw copy and confirm `$localize` (or `i18n` attribute) wrapping.
3. Update `docs/design-system/recipes.md` with the auth-shell, auth-card, password-strength, and reset-password recipes.

Verification:

```bash
pnpm nx extract-i18n app
pnpm nx run app:lint
pnpm nx run app:vite:test
```

## Phase 9 — E2E Visual Assertions And Snapshots

1. Add a Playwright helper `assertOpenDesignChrome(page)` in `apps/web/app-e2e/src/support/auth-layout.ts` that asserts:
   - `[data-od-id="auth-shell"]` is visible.
   - `[data-od-id="brand"]` has the `Themis` text and the `logo-mark` SVG.
   - `[data-od-id="lang-menu"]` summary is visible and opens on click.
   - `[data-od-id="theme-toggle"]` button is visible and labeled `Toggle light/dark theme`.
   - `[data-od-id="auth-card"]` is visible with the route-specific kicker and title text.
2. Add `assertOpenDesignCopy(page, routeKey)` to assert every piece of prototype copy is present on the page.
3. Add visual snapshots at 360px, 768px, and 1280px in light and dark mode for each route. Land snapshots under `apps/web/app-e2e/src/auth/__screenshots__/` with descriptive filenames.
4. Wire AXE checks (`@axe-core/playwright`) into every existing auth spec plus the new reset-password spec.
5. Run the full e2e suite end-to-end:

```bash
pnpm nx e2e app-e2e
```

6. Re-run with `--update-snapshots` only if the diff is intentional (audit the diff in the PR description).

Verification:

```bash
pnpm nx e2e app-e2e
pnpm nx run-many --target lint --projects app,app-e2e,shared-ui
pnpm nx run-many --target test --projects app,app-e2e,shared-ui
pnpm nx run app:build --skip-nx-cache
```

Expected: all auth route suites pass (sign-in, sign-up, forgotten-password, verify-email, verify-device, reset-password), all visual snapshots match, AXE reports zero violations, lint and unit tests pass.

## Nx Verification Commands (consolidated)

```bash
pnpm nx lint app
pnpm nx lint shared-ui
pnpm nx lint app-e2e
pnpm nx test app
pnpm nx test shared-ui
pnpm nx build app
pnpm nx extract-i18n app
pnpm nx e2e app-e2e
```

If a target is missing or changes, inspect it first with:

```bash
pnpm nx show project app --json
pnpm nx show project app-e2e --json
pnpm nx show project shared-ui --json
```

## Phase 10 — Mobile-First Polish And Visual Quality Pass

This phase operationalizes the `.opencode/skills/web-design-reviewer` and `.opencode/skills/premium-frontend-ui` skills inside the auth fidelity pass scope, since those skills cannot be executed from open-design. It does not introduce new visual primitives; it tightens the existing ones against a mobile-first viewport matrix and a premium-UI checklist.

### 10.1 — Viewport Matrix

For every auth route (`sign-in`, `sign-up`, `forgotten-password`, `verify-email`, `verify-device`, `reset-password`), capture screenshots at:

| Name    | Width  | Height | Notes                              |
| ------- | ------ | ------ | ---------------------------------- |
| Mobile  | 360px  | 720px  | Tightest target (Android baseline) |
| Mobile  | 390px  | 844px  | iPhone 13/14 baseline              |
| Mobile  | 520px  | 720px  | Tailwind `sm:` breakpoint boundary |
| Tablet  | 768px  | 1024px | Tailwind `md:` breakpoint boundary |
| Desktop | 1280px | 800px  | Tailwind `lg:` breakpoint boundary |
| Wide    | 1920px | 1080px | Optional sanity check              |

Snapshots land under `apps/web/app-e2e/src/auth/__screenshots__/` with the naming pattern `<route>-<width>-<theme>.png`. Only `360`, `390`, `520`, `768`, and `1280` are committed; `1920` is on-demand.

### 10.2 — Issue Matrix (web-design-reviewer)

Each issue is logged in the PR description using the skill's template:

| Severity | Class              | Examples                                                                   |
| -------- | ------------------ | -------------------------------------------------------------------------- |
| P1       | Functional layout  | Element overflow, viewport overflow, content unreachable on mobile         |
| P1       | Touch targets      | Buttons or rows < 44px on touch devices                                    |
| P1       | Focus state        | Missing or invisible `:focus-visible` ring on any interactive element      |
| P2       | Responsive         | Layout breaks between breakpoints, awkward horizontal scroll, awkward wrap |
| P2       | Visual consistency | Mixed font families, off-token colors, inconsistent spacing scale          |
| P2       | Accessibility      | Insufficient contrast, missing labels, missing `aria-describedby` wiring   |
| P3       | Polish             | Inconsistent radius, drift from token scale, micro-spacing issues          |

### 10.3 — Premium UI Checklist (premium-frontend-ui)

For each route, run through these checks:

1. **Typography rhythm**: title size uses `clamp()` or token scale; body copy keeps a readable rhythm (≥ 16px on mobile, 0.9375rem is acceptable here).
2. **Spacing scale**: padding/margin adhere to the 8/16/24/40 grid; no off-scale values.
3. **Motion**: entrance transitions for kicker/title/sub use `transform`/`opacity` only; respect `prefers-reduced-motion`.
4. **Focus visible**: every interactive element has a visible `:focus-visible` ring driven by the `--color-ring` token.
5. **Touch targets**: every clickable element is at least 44×44px on mobile (use `ui-touch-target` utility where available).
6. **Surface hierarchy**: tonal surfaces over heavy borders; avoid stacking more than two surfaces on a single screen.
7. **Optical balance**: card content is centered with `mx-auto`, has consistent vertical rhythm, and does not hug the viewport edges (padding stays at `px-4` minimum on mobile).
8. **Dark mode parity**: every color used has an explicit dark-mode value through the Catalyst token layer.
9. **Glass/depth**: avoid ad-hoc `backdrop-filter` blur; if used, it lives in `app-auth-layout` chrome only and is gated behind `@media (prefers-reduced-motion: no-preference)`.

### 10.4 — Implementation Slices

To stay within the "small vertical slice" rule from `AGENTS.md`, Phase 10 lands as **one PR per P1 cluster**, not one mega PR:

1. **PR10.1 — Touch targets + focus rings audit.** Walk every interactive element on the five routes. Fix any < 44px touch target and any missing `:focus-visible` ring. Snapshot diff at 360/390/520 light + dark.
2. **PR10.2 — Mobile-first layout fixes.** Overflow, wrap, viewport-edge padding, breakpoint awkwardness at 360→520→768. Snapshot diff at the same viewports.
3. **PR10.3 — Visual consistency sweep.** Token drift (off-token colors), spacing scale drift, font drift. Snapshot diff at 768/1280.
4. **PR10.4 — Dark mode parity.** Audit every route in dark mode; fix any element without an explicit dark token. Snapshot diff at 360/768 dark.
5. **PR10.5 — Polish pass.** Radius/spacing/optical balance. Snapshot diff at 1280 light.

Each PR runs the full e2e suite plus the relevant Nx lint/test/build targets before merge.

### 10.5 — Workflow

Because the skills cannot be executed directly in open-design, this spec follows an iterative loop until zero P1 issues remain:

1. Boot the gateway locally: `pnpm nx run server:build:production && node dist/apps/web/server/main.js &`.
2. For each route, capture screenshots at the viewport matrix using Playwright (already wired into `apps/web/app-e2e/src/auth/__screenshots__/`).
3. Inspect each screenshot against the issue matrix and premium checklist.
4. Fix one cluster of P1 issues at a time at the source (`shared/ui`, `app-auth-layout`, `app-auth-card`, or route templates).
5. Re-capture and compare with the previous baseline.
6. When no P1 issues remain, mark the PR ready for review. P2/P3 issues are tracked separately and may ship in the polish PR10.5.

### 10.6 — Exit Criteria

- Zero P1 issues at 360/390/520/768/1280px in light and dark mode.
- All five routes have updated snapshots checked into `apps/web/app-e2e/src/auth/__screenshots__/`.
- AXE checks pass at 360px and 1280px for every route.
- `pnpm nx run app:build --skip-nx-cache` passes.
- Bundle delta is within the existing budget (no new primitives introduced).

Verification commands per PR (rotate depending on the slice):

```bash
pnpm nx lint app
pnpm nx lint shared-ui
pnpm nx run app:vite:test
pnpm nx run shared-ui:test
pnpm nx run app:build --skip-nx-cache
pnpm nx e2e app-e2e
```

## Definition Of Done

- All ten phases merged.
- The five auth route families render 1:1 with the Open Design prototypes in light and dark mode at 360/768/1280px.
- The new `app-password-strength` primitive has unit + visual coverage.
- The new OTP reset route sequence (`/app/forgotten-password` → `/app/reset-password` single-screen OTP + password) is mounted, validated, and transitions to the success state.
- Every e2e spec in `apps/web/app-e2e/src/auth/` passes (existing + new).
- Visual snapshots and AXE checks pass.
- `pnpm nx run app:lint`, `pnpm nx run app:vite:test`, `pnpm nx run app:build`, and `pnpm nx extract-i18n app` all green.
- `apps/web/app/version.json` bumped.

## Out Of Scope For This Spec

- Token-in-URL reset-password links.
- Runtime locale switching via the language menu (the menu persists the preference only).
- Site (Astro) auth routes.
