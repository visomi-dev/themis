# Auth Flow

## Purpose

Describe the intended user-facing auth journey for the first working Themis implementation.

This flow is designed for:

- Angular-owned auth screens
- email and password credentials
- email verification with a PIN sent through Mailgun
- PostgreSQL persistence implemented through Drizzle ORM
- session-based authentication after successful verification

## Goals

The first auth flow should feel:

- quiet and precise
- simple to complete without hidden state
- safe for same-origin session auth
- visually aligned with the Themis sign-in references

## Entry Points

Initial entry points:

- `/app/sign-in`
- `/app/sign-up`

The public site can link into those routes, but the auth experience itself lives in the Angular app.

## Primary Flows

### Sign Up

#### Step 1: Create Account

The user lands on `/app/sign-up` and submits:

- email
- password

Expected backend response:

- account created in unverified state
- verification challenge created
- verification PIN email sent

Expected UI response:

- transition to `/app/verify-email`
- success copy explaining that a PIN was sent
- email address displayed in masked or confirmed form

#### Step 2: Enter Verification PIN

The user submits the 6-digit PIN from their email.

Expected backend response:

- challenge validated
- email marked verified
- authenticated session created

Expected UI response:

- success confirmation
- redirect into the authenticated product surface

### Sign In

#### Step 1: Verify Password

The user lands on `/app/sign-in` and submits:

- email
- password

Expected backend response:

- Passport validates credentials
- verification challenge created
- verification PIN email sent

Expected UI response:

- transition to `/app/verify-email`
- success copy explaining that a sign-in PIN was sent

#### Step 2: Enter Verification PIN

The user submits the PIN.

Expected backend response:

- challenge validated
- authenticated session created

Expected UI response:

- redirect into the authenticated product surface

## Verification Screen Behavior

The verification screen should support both sign-up and sign-in without becoming a separate visual pattern.

Required states:

- idle input state
- submitting state
- invalid PIN state
- expired PIN state
- resend available state
- resend cooldown state

Recommended content:

- heading that confirms verification is required
- supporting text that references the destination email
- PIN input optimized for 6 digits
- resend action with clear cooldown behavior
- way back to sign-in if the user started the wrong flow

## Session Restoration

When the user revisits the Angular app with a valid session cookie:

1. Angular requests `GET /api/auth/session`.
2. If authenticated, the app should bypass sign-in routes and send the user into the product shell.
3. If unauthenticated, the user remains on the auth route they requested.

## Sign Out

Sign out should be explicit and immediate.

Expected behavior:

1. Angular posts to `POST /api/auth/sign-out`.
2. API destroys the session and clears the cookie.
3. Angular returns the user to `/app/sign-in`.

## Error Handling

### Invalid Credentials

When email or password verification fails:

- stay on `/app/sign-in`
- show a generic error message
- avoid disclosing whether the email exists

### Invalid PIN

When the PIN is wrong:

- stay on `/app/verify-email`
- preserve the current challenge context
- show a concise inline error

### Expired PIN

When the PIN is expired:

- show that the code has expired
- allow resend if cooldown rules permit

### Too Many Attempts

When the challenge reaches the attempt limit:

- invalidate the current challenge
- require a new PIN issuance
- explain the next step without exposing internal policy details

### Email Delivery Failure

When Mailgun send fails:

- do not pretend the PIN was sent
- show a retry-friendly error message
- allow the user to retry the previous step

## UX States

The first implementation should support the following frontend states.

### Form States

- pristine
- invalid
- submitting
- success transition
- server error

### Feedback States

- inline validation for malformed input
- inline message for auth failures
- toast or banner for operational errors when appropriate

### Loading States

- disable primary action while request is active
- show a compact loading indicator in action controls

## Visual Direction

The auth screens should reference the existing Themis Stitch explorations.

Implementation guidance:

- use the simplified sign-in composition as the light-theme baseline
- use the dark sign-in composition for the dark theme variant
- preserve Themis typography, spacing, and low-noise surface treatment
- avoid generic dashboard chrome on auth routes

PrimeNG should provide the controls, but page framing should remain custom so the auth flow still feels specific to Themis.

## PrimeNG Usage

Recommended component set for the first auth slice:

- `InputText`
- `Password`
- `Button`
- `Checkbox`
- `InputOtp`
- `Message`
- `Toast`
- `ProgressSpinner`

These are sufficient for the first complete flow without introducing unnecessary component surface area.

## Copy Direction

Auth copy should be direct and operational.

Recommended tone:

- calm
- specific
- low-drama
- no marketing language inside the auth flow

Examples of suitable phrasing:

- `Enter your details to access your workspace.`
- `We sent a verification code to your email.`
- `This code has expired. Request a new one to continue.`

## Redirect Targets

After successful authentication, the user should land in the product app rather than the public site.

Recommended first target:

- `/app`

If deep-link handling is added later, the app can preserve and restore the originally requested product route.

## Test Scenarios

The first delivery should cover these scenarios end to end.

### Sign Up

- valid sign-up completes after PIN verification
- duplicate email is handled safely
- resend PIN works within policy

### Sign In

- valid credentials require PIN before session creation
- invalid password is rejected
- expired PIN requires resend

### Session

- authenticated refresh restores the user session
- sign-out clears session state

### Theme

- auth UI renders correctly in light theme
- auth UI renders correctly in dark theme
- theme switch stays stable across auth screens

## Deferred Scope

Deferred from the first implementation:

- forgot password
- password reset by email
- magic links
- social login
- remembered devices
- backup codes
