# Themis Auth Fidelity Pass — Validation Plan

## Status

Pending. The validation plan is designed for execution after all ten phases of `plan.md` merge to `main`.

## Definition Of Done (validation gate)

- All ten phases of `plan.md` merged to `main`.
- All commands in the consolidated verification block below exit zero.
- Every e2e spec in `apps/web/app-e2e/src/auth/` passes locally and in CI.
- Visual snapshots at 360/768/1280px in light + dark mode match the Open Design prototypes within tolerance (`maxDiffPixels: 200` for reflow, `0` for chrome).
- AXE reports zero serious or critical violations on every migrated auth route.

## Static Validation

```text
pnpm nx run app:lint                  → ✔ All files pass linting
pnpm nx run shared-ui:lint            → ✔ All files pass linting
pnpm nx run app-e2e:lint              → ✔ All files pass linting
pnpm nx run app:vite:test             → all specs pass (signal forms, password-strength, auth routes)
pnpm nx run shared-ui:test            → all specs pass (label, password-input, error-message, alert, auth-layout, auth-card, lang-switcher, theme-switcher variants)
pnpm nx run app:build                 → browser + SSR bundles emitted
pnpm nx extract-i18n app              → xliff updated with new auth strings; zero warnings
```

## Route Validation

Every route below must render 1:1 with its Open Design prototype and pass the e2e visual + AXE assertions.

| Route                       | Open Design source      | Validation owner                                         |
| --------------------------- | ----------------------- | -------------------------------------------------------- |
| `/app/sign-in`              | `sign-in.html`          | `apps/web/app-e2e/src/auth/sign-in.spec.ts`              |
| `/app/sign-up`              | `sign-up.html`          | `apps/web/app-e2e/src/auth/sign-up.spec.ts`              |
| `/app/forgotten-password`   | `recover-password.html` | `apps/web/app-e2e/src/auth/forgotten-password.spec.ts`   |
| `/app/verify-email`         | `confirm-account.html`  | `apps/web/app-e2e/src/auth/verify-email.spec.ts`         |
| `/app/verify-device`        | `confirm-account.html`  | `apps/web/app-e2e/src/auth/verify-device.spec.ts` (new)  |
| `/app/verify-reset` (new)   | `confirm-account.html`  | Not implemented (collapsed into `/app/reset-password`)   |
| `/app/reset-password` (new) | `reset-password.html`   | `apps/web/app-e2e/src/auth/reset-password.spec.ts` (new) |

For each route, the validation owner must confirm:

1. The chrome (`auth-shell`, brand mark + name, lang-menu, theme-toggle) renders.
2. The card (`auth-card`) renders with the route-specific kicker and title.
3. Every form control renders with the prototype id, label, placeholder, and autocomplete attributes.
4. Every error path renders the localized error message with `aria-describedby` wiring.
5. The success state (forgotten-password, reset-password) replaces the form inside the same card.

## Accessibility Validation

- AXE checks pass on every migrated route — verified with `@axe-core/playwright` integrated into each spec.
- `aria-describedby` and `aria-invalid` wiring preserved on every form field.
- Auth chrome keyboard accessibility: brand → lang summary → theme toggle → first form control, in DOM order.
- Language menu opens on Enter/Space, closes on Escape, click-outside, and selection.
- Theme toggle keyboard accessible, focus visible on `:focus-visible`.
- Reduced motion respected (strength meter transitions disabled when `prefers-reduced-motion: reduce`).

## Visual Validation — E2E (per-route)

The e2e suite is the contract that locks the visual fidelity to the Open Design prototypes. Every assertion below must be in the relevant `apps/web/app-e2e/src/auth/*.spec.ts` file before merge.

### Universal Chrome Assertions (every auth route)

Add to `apps/web/app-e2e/src/support/auth-layout.ts`:

```ts
export async function assertOpenDesignChrome(page: Page) {
  await expect(page.locator('[data-od-id="auth-shell"]')).toBeVisible();
  await expect(page.locator('[data-od-id="brand"]')).toContainText('Themis');
  await expect(page.locator('[data-od-id="brand"] app-icon svg')).toBeVisible();
  await expect(page.locator('[data-od-id="lang-menu"]')).toBeVisible();
  await expect(page.locator('[data-od-id="lang-menu"] summary')).toBeVisible();
  await expect(page.locator('[data-od-id="theme-toggle"]')).toBeVisible();
  await expect(page.locator('[data-od-id="theme-toggle"]')).toHaveAttribute('aria-label', 'Toggle light/dark theme');
  await expect(page.locator('[data-od-id="auth-card"]')).toBeVisible();

  const card = page.locator('[data-od-id="auth-card"]');
  await expect(card).toHaveCSS('max-width', '440px');
  await expect(card).toHaveCSS('padding-top', '40px');
  await expect(card).toHaveCSS('border-style', 'solid');
}
```

Every existing auth spec must call `await assertOpenDesignChrome(page)` immediately after `page.goto(...)`. The new specs (`reset-password`, `verify-device`) include it too.

### Per-Route Copy Assertions

Each spec must assert the verbatim Open Design copy:

| Route                                 | Verbatim copy (kicker → title → sub → button → footer)                                                                                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/app/sign-in`                        | `Account access` → `Sign in` → `Welcome back. Use your work email to access your Themis workspace.` → `Sign in` → `Create an account`                                                  |
| `/app/sign-up`                        | `New account` → `Create your account` → (no sub) → `Create account` → `Already have an account? Back to sign in`                                                                       |
| `/app/forgotten-password` (form)      | `Account recovery` → `Recover password` → `Enter your work email and we'll send you a recovery link. The link expires in 30 minutes.` → `Send recovery link` → `Back to sign in`       |
| `/app/forgotten-password` (success)   | `We sent a recovery link to <email>. Open it on this device to choose a new password.` → `Back to sign in`                                                                             |
| `/app/verify-email`                   | `Email verification` → `Verify email` → `Enter the 6-digit code we sent to <email>.` → `Verify and continue` → `Start again`                                                           |
| `/app/verify-device`                  | `Device verification` → `Verify device` → `Enter the 6-digit code we sent to <email>.` → `Verify and continue` → `Start again`                                                         |
| `/app/reset-password` (otp step)      | `Password reset` → `Reset your password` → `Enter the 6-digit code we sent to your email, then choose a new password.` → `Verify code` → `Back to sign in`                             |
| `/app/reset-password` (password step) | (same card) → `Update password` button label toggles after OTP verification; helper copy "Use 8+ characters. Mix uppercase, lowercase, numbers, and symbols for the strongest result." |
| `/app/reset-password` (success)       | `Password updated` → `You're all set. Sign in with your new password to continue.` → `Sign in to continue`                                                                             |

Helper:

```ts
export async function assertOpenDesignCopy(page: Page, route: AuthRoute) {
  const expectations = COPY[route];
  for (const [slot, text] of Object.entries(expectations)) {
    await expect(page.locator(`[data-slot="${slot}"]`)).toContainText(text);
  }
}
```

Where `COPY` is keyed by route and slot (`kicker`, `title`, `sub`, `submit`, `footer`).

### Password Strength Assertions (reset-password spec only)

The new spec must verify the meter reacts to sample passwords:

| Sample password   | Expected `data-level` | Expected label |
| ----------------- | --------------------- | -------------- |
| (empty)           | `0`                   | `—`            |
| `password`        | `1`                   | `Weak`         |
| `Password`        | `2`                   | `Fair`         |
| `Password1`       | `3`                   | `Strong`       |
| `Strong-Pass-12!` | `4`                   | `Excellent`    |

Each case fills the password input, then asserts:

```ts
const meter = page.locator('[data-slot="password-strength"]');
await expect(meter).toHaveAttribute('data-level', String(expectedLevel));
await expect(page.locator('[data-slot="password-strength-label"]')).toHaveText(expectedLabel);
```

### Show/Hide Password Text Button Assertions

Every password input must expose a text-based show/hide button. Add to each affected spec:

```ts
const toggle = page.getByRole('button', { name: 'Show password' });
await expect(toggle).toBeVisible();
await expect(toggle).toHaveText('Show');
await toggle.click();
await expect(page.getByLabel('Password')).toHaveAttribute('type', 'text');
await expect(page.getByRole('button', { name: 'Hide password' })).toHaveText('Hide');
```

### Visual Snapshots

For each auth route, generate snapshots at three viewports × two themes:

| Viewport | Theme | Filename pattern              |
| -------- | ----- | ----------------------------- |
| 360px    | light | `auth/<route>-360-light.png`  |
| 360px    | dark  | `auth/<route>-360-dark.png`   |
| 768px    | light | `auth/<route>-768-light.png`  |
| 768px    | dark  | `auth/<route>-768-dark.png`   |
| 1280px   | light | `auth/<route>-1280-light.png` |
| 1280px   | dark  | `auth/<route>-1280-dark.png`  |

Snapshots land under `apps/web/app-e2e/src/auth/__screenshots__/`. The snapshot helper:

```ts
test.use({ viewport: { width: 360, height: 720 } });

test('matches the Open Design at 360px / light', async ({ page }) => {
  await page.goto(route);
  await expect(page).toHaveScreenshot(`auth/${slug}-360-light.png`, {
    maxDiffPixels: 200,
    animations: 'disabled',
  });
});
```

Tolerance is `maxDiffPixels: 200` to absorb sub-pixel antialiasing differences across Chromium revisions. Re-generate only with `pnpm nx e2e app-e2e -- --update-snapshots` and audit the diff in the PR description.

### AXE Checks

```ts
import AxeBuilder from '@axe-core/playwright';

test('passes AXE on the auth shell + card', async ({ page }) => {
  await page.goto(route);
  const results = await new AxeBuilder({ page })
    .include('[data-od-id="auth-shell"]')
    .include('[data-od-id="auth-card"]')
    .analyze();
  expect(results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([]);
});
```

### Stable Selector Preservation

The existing e2e specs rely on a fixed selector surface. After the migration, every selector in the Stable Selectors table (see `requirements.md`) must still resolve. Validation script:

```bash
pnpm nx e2e app-e2e -- --grep "sign-in|sign-up|forgotten-password|verify-email"
```

Must pass without source changes to `*.spec.ts` other than the new visual assertions, the new reset-password spec, and the new verify-device spec.

## Functional Validation — Per Route

### `/app/sign-in`

1. Empty submit shows "Enter your email address." and "Enter your password.".
2. Invalid email format shows "Enter a valid email address (e.g. you@company.com).".
3. Password shorter than 8 characters shows "Use at least 8 characters.".
4. Successful sign-in (after backend wiring) redirects to the verification route or the app.
5. Invalid credentials show the top-of-card alert "Email or password is incorrect. Try again or recover your account.".
6. "Forgot password?" link navigates to `/app/forgotten-password`.
7. "Create an account" footer link navigates to `/app/sign-up`.
8. Remember-device checkbox persists across sign-out + sign-in.

### `/app/sign-up`

1. Empty submit shows "Enter your email address." and "Choose a password.".
2. Confirm-password mismatch shows "Passwords don't match.".
3. Password below threshold shows the strength meter at level ≤ 1 and an error message.
4. Successful submission navigates to `/app/verify-email`.

### `/app/forgotten-password`

1. Empty submit shows "Enter your email address.".
2. Invalid email format shows the corresponding error.
3. Successful submission transitions to the success state inside the same card with the recipient email rendered.
4. "Back to sign in" footer link navigates to `/app/sign-in`.

### `/app/verify-email` and `/app/verify-device`

1. No active challenge redirects to `/app/sign-in`.
2. Invalid OTP shows "The verification code is invalid.".
3. Resend cooldown returns the same PIN.
4. Successful verification navigates to `/app/` or `/app/activation`.

### `/app/reset-password` (new, single-screen OTP + password)

1. Missing or expired reset session redirects to `/app/forgotten-password`.
2. OTP step:
   - Six `app-pin-input` cells render with the prototype copy and visual chrome.
   - Auto-advance and paste support work the same as the existing `verify-email` flow.
   - Invalid OTP shows the inline error message and does not advance to the password step.
   - Resend button respects the cooldown; a disabled state is visible until the timer expires.
   - "Change email" link navigates to `/app/forgotten-password`.
3. Password step (revealed after successful OTP verification):
   - Empty submit shows "Choose a new password." and "Re-enter your new password.".
   - Password below the threshold shows the corresponding error.
   - Confirm mismatch shows "Passwords don't match.".
   - Strength meter reacts to every level 0..4 with the right label.
   - Submit button label is "Update password".
4. Success state replaces the form inside the same card with title "Password updated", copy "You're all set. Sign in with your new password to continue.", and "Sign in to continue" button.
5. Footer "Back to sign in" link navigates to `/app/sign-in` from every step.
6. Show/Hide text button toggles the input type on the new password field.

## Performance And Bundle Validation

- `pnpm nx run app:build --skip-nx-cache` — the auth bundle delta must be net-negative or net-neutral. We are removing no large dependency; the only additions are `app-password-strength`, `app-auth-card`, `app-lang-switcher`, and the routes/auth components. The bundle should not grow by more than ~15 kB gzipped.
- Initial bundle soft budget warning (`initial` 603.03 kB against 500 kB budget) is pre-existing in scale; this spec must not worsen it.

## Phase 10 — Mobile-First Polish And Visual Quality Validation

This validation block operationalizes the `web-design-reviewer` and `premium-frontend-ui` skills. Each item must be evidenced by either a fixed source file path or a screenshot committed under `apps/web/app-e2e/src/auth/__screenshots__/`.

### 10.A — Viewport Matrix Coverage

For each route (`sign-in`, `sign-up`, `forgotten-password`, `verify-email`, `verify-device`, `reset-password`), the snapshots must exist for the following viewports × themes:

```text
<route>-360-light.png     <route>-360-dark.png
<route>-390-light.png     <route>-390-dark.png
<route>-520-light.png     <route>-520-dark.png
<route>-768-light.png     <route>-768-dark.png
<route>-1280-light.png    <route>-1280-dark.png
```

A missing snapshot or a `maxDiffPixels` > 200 against the Open Design prototype fails the gate.

### 10.B — Issue Matrix (web-design-reviewer)

For each route, log findings using this template inside the PR description (one entry per issue):

```markdown
### [P1/P2/P3] {issue title}

- Page: {route}
- Viewport(s): {widths where it appears}
- Element: {data-od-id or selector}
- Issue: {concise description}
- Fix: {file path + summary}
- Screenshot before/after: {paths in **screenshots**}
```

The PR may not merge with any open P1.

### 10.C — Premium UI Checklist (premium-frontend-ui)

Each route must pass:

1. Title scales fluidly between 360 and 1280 (no static px that overflows on small screens).
2. Body copy stays ≥ 0.9375rem on mobile.
3. Card padding is at least `px-4 py-8` on mobile and `p-10` on desktop, never less.
4. Every interactive element has a visible `:focus-visible` ring driven by `--color-ring`.
5. Every touch target is at least 44×44px on mobile (the `ui-touch-target` utility is preferred; manual sizing is acceptable when justified).
6. Motion uses `transform`/`opacity` only; reduced-motion is respected.
7. No off-token colors (`#hex` literals in templates).
8. Dark mode parity: every surface and text color has an explicit dark variant.

### 10.D — Accessibility Re-check

- AXE checks pass at 360px and 1280px in light and dark mode for every auth route.
- Tab order is DOM order on every route.
- `aria-describedby` and `aria-invalid` are wired on every form field.
- The language switcher is keyboard accessible (Enter/Space toggle, Escape close, outside click close).

### 10.E — Regression Check

- The previous test contract still holds: every selector in the Stable Selectors table in `requirements.md` resolves without source changes to `apps/web/app-e2e/src/auth/*.spec.ts` other than the explicitly listed new tests.
- `pnpm nx e2e app-e2e` passes for all auth suites (sign-in, sign-up, forgotten-password, verify-email, verify-device, reset-password).
- `pnpm nx run app:build --skip-nx-cache` passes; bundle delta stays within the existing budget.
- AXE zero serious/critical.

### 10.F — Polish Iteration Loop

Because the skills cannot be executed from open-design, Phase 10 follows this loop until zero P1 issues remain:

1. Boot the gateway locally and capture screenshots at the viewport matrix.
2. Compare against the Open Design prototypes in `resources/open-design/themis-app/`.
3. Log every issue in the PR description using the 10.B template.
4. Fix one cluster of P1 issues per PR (touch targets + focus rings, mobile-first layout, visual consistency, dark mode parity, polish).
5. Re-capture and re-compare before merging.
6. Move P2/P3 issues to follow-up or to the polish PR10.5.

Iteration limit: if a single P1 issue requires more than three fix attempts, surface it to the user for a decision instead of continuing to iterate silently.

## Notes For Future Cleanup

- Runtime locale switching via the lang switcher is intentionally out of scope; the switcher persists the preference but `$localize` reads from build-time locale until a future spec wires runtime locale negotiation.
- The new `app-auth-card` could be folded into `app-card` after the design system graduates from the auth-only patterns to the product surface. Out of scope here.
- The previous backend stub created a `sign_in` challenge from `requestPasswordReset`; this spec replaces it with first-class `password_reset` challenges and reset submit endpoints.
- The balance-scale icon is currently only rendered in the auth chrome. A future spec may want to promote it to the sidebar/topbar brand mark too.

## Validation Run Template

```text
pnpm nx run shared-ui:lint           → ✔ All files pass linting
pnpm nx run shared-ui:test           → all specs pass (label, password-input, error-message, alert, auth-layout, auth-card, lang-switcher, theme-switcher, password-strength)
pnpm nx run app:lint                 → ✔ All files pass linting
pnpm nx run app:vite:test            → all specs pass (signal forms, auth routes, password-strength)
pnpm nx run app:build --skip-nx-cache → browser + SSR bundles emitted; bundle delta within budget
pnpm nx extract-i18n app             → xliff updated; zero warnings
pnpm nx e2e app-e2e                  → all auth specs pass (sign-in, sign-up, forgotten-password, verify-email, verify-device, reset-password); visual snapshots match; AXE zero serious/critical
```
