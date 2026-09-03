# Passwordless Authentication Contract

**Status:** Canonical product contract

**Decision record:** [ADR 016](../architecture/adr/016-unified-passwordless-authentication.md)

**Supersedes:** The password-first and split sign-up/sign-in flow previously documented here

## Purpose

Themis uses one passkey-first journey for account creation, sign-in, and
recovery. The contract removes passwords completely. A verified email code is
not a full authenticator: it creates a short-lived restricted session whose
only authority is account selection and passkey enrollment. Dashboard access
requires a server-verified passkey ceremony.

All source copy and technical states in this contract are English. Localized
interfaces translate these source strings through the normal i18n flow.

## Product invariants

1. The only authentication route is `/sign-in`.
2. The first and primary action is discoverable passkey authentication. It does
   not ask for an email or username before opening the WebAuthn account chooser.
3. Before the secondary action appears, the page explains that a synced
   passkey, another device, or a security key can complete the primary flow.
4. The secondary action is labelled `Try another way` and starts email-code
   bootstrap or recovery. It never offers a password.
5. A server-verified email OTP creates only a restricted session.
6. A restricted session cannot access the dashboard, product APIs, API keys,
   vault data, workspace metadata, billing, or account security settings.
7. Account choice occurs only after email verification. Before verification,
   public responses are equivalent for unknown and existing identities.
8. A restricted user must enroll and immediately verify a passkey before the
   server creates a full session.
9. Every full session is backed by a passkey assertion. Email OTP alone never
   creates, upgrades, or restores a full session.
10. An account always has at least one active passkey. The final active passkey
    cannot be revoked or removed.
11. Password fields, password hashes, password strategies, password reset, and
    password endpoints are outside the authentication model and must be
    deleted during implementation.
12. Account authentication establishes account identity only. It does not
    unlock a PRF-derived vault key or disclose local zero-knowledge material.

## Canonical route and method hierarchy

`/sign-in` presents the following content in this order:

1. Heading: `Sign in to Themis`
2. Primary action: `Continue with a passkey`
3. Guidance: `Your passkey may be saved on this device, synced from another
device, or available on a nearby device or security key.`
4. Cross-device action when the browser exposes it: `Use another device or
security key`
5. Secondary action: `Try another way`

There are no `/sign-up`, `/forgotten-password`, `/reset-password`, or separate
verification routes. The `/sign-in` route renders each state in place and is
safe to reload using its opaque flow reference. Removed routes are not aliases
and do not preserve password-era query parameters.

## Session classes and authority

| Session class | How it is created                                                                                  | Permitted authority                                                                                                 | Expiry and transition                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Anonymous     | No valid cookie                                                                                    | Start passkey authentication; request an email OTP                                                                  | No authenticated authority                                                                             |
| Restricted    | Successful server verification of an email OTP                                                     | Read the verified email's eligible account choices; choose one account; create and verify one new passkey; sign out | 15 minutes absolute; no rolling extension; rotated into a full session only after passkey verification |
| Full          | Successful discoverable passkey assertion, or successful assertion with the newly enrolled passkey | Normal account-authorized product access                                                                            | Seven days absolute; no rolling extension; session ID rotates on authentication and upgrade            |

A restricted session contains an opaque restricted-session ID, verified-email
subject, issued and absolute expiry times, allowed operation set, selected
account ID when chosen, and bootstrap/recovery purpose. It contains no OTP,
challenge value, WebAuthn assertion, credential public key, password material,
PRF output, vault key, or plaintext.

Every restricted endpoint rejects a full-session-only operation with
`restricted_session_required` or `restricted_session_forbidden` as applicable.
Every normal authenticated endpoint rejects a restricted cookie as
unauthenticated. Selecting an account narrows the restricted session and cannot
be undone; choosing a different account requires a new email verification.

## State machine

### Passkey-first authentication

1. The anonymous user activates `Continue with a passkey`.
2. The server creates a five-minute, single-use authentication challenge bound
   to purpose, RP ID, exact origin, and required user verification. No email is
   accepted by this operation.
3. The browser requests a discoverable credential with an empty allow-list so
   the authenticator owns account discovery.
4. The server verifies challenge, type, origin, RP ID hash, user verification,
   credential status, account ownership, signature, and sign-count policy in
   one transaction.
5. Success consumes the challenge, rotates the session ID, records safe audit
   metadata, and creates a full session for the credential's account.
6. Cancellation, timeout, unsupported capability, or platform failure returns
   to the same page. The page repeats synced/cross-device guidance, offers
   `Try passkey again`, and then retains `Try another way`.
7. A mismatched, expired, replayed, unknown, or revoked credential fails closed
   with the same public authentication-failed family. It never starts email
   recovery automatically.

### Email bootstrap or recovery

1. The user explicitly activates `Try another way` and enters an email.
2. The server canonicalizes the email with Unicode NFKC normalization, trim,
   and invariant lowercase, then returns the same status, body shape, copy, and
   timing envelope whether the identity is unknown or existing.
3. The response is `202 Accepted`, includes only an opaque flow reference and
   resend timing, and displays `If you can use that email, check for a 6-digit
code. Delivery can take a few minutes.`
4. The server sends a six-digit code for both eligible new identities and
   eligible existing identities. Suppressed, blocked, or failed delivery still
   uses the public generic response; operational delivery details are recorded
   only in redacted telemetry.
5. The OTP expires after 10 minutes, allows five failed verification attempts,
   has a 60-second resend cooldown, and is stored only as a keyed one-way hash.
   Resend invalidates every earlier code for the flow. Five failures, expiry,
   or successful use consumes the challenge and requires a new request.
6. OTP verification binds the opaque flow, canonical email, purpose, client
   context, and latest active challenge. A successful verification is
   transactionally single-use and rotates into a 15-minute restricted session.
7. The public invalid-code response does not identify whether an account
   exists. Rate limits apply to normalized-email, IP, flow, and delivery
   destination dimensions and use the same public cooldown response.

Public OTP request and resend are limited to five deliveries per normalized
email and 20 attempts per IP address in a rolling hour. OTP verification is
limited by the challenge's five attempts and 30 submissions per IP address in
15 minutes. Passkey option creation is limited to 30 attempts per IP address in
five minutes. A submitted WebAuthn verification consumes its challenge whether
verification succeeds or fails; cancellation before submission does not.
Production limits use shared durable storage. Public throttling responses use
`429` with the same safe message and a rounded `Retry-After` value and do not
identify which limit was reached.

### Account selection after email verification

After OTP verification, and never before it, the server returns the eligible
account choices for that verified email.

- No existing account: the list contains one pending personal account choice
  labelled `Create your Themis account`.
- One existing account: it is selected automatically and its account name is
  shown for confirmation.
- Multiple existing accounts: the user must choose one. Each choice contains
  only an opaque account reference, display name, and safe membership label.
- Suspended, deleted, or unauthorized accounts are omitted. If none remains,
  the restricted flow ends without revealing hidden account details.

The restricted session, verified email, selected account, and later WebAuthn
registration challenge are bound server-side. A client-supplied account ID
that was not in the verified choice set returns the same `account_unavailable`
outcome as a stale or removed choice.

### Mandatory passkey enrollment and verification

1. After selection, the page explains `Create a passkey to finish. Email
verification alone cannot sign you in.`
2. The server creates a five-minute, single-use registration challenge bound to
   the restricted session, verified email, selected account, user, RP ID, exact
   origin, and required user verification.
3. Registration requires a discoverable credential and excludes active
   credentials already owned by the selected account.
4. The server verifies the attestation response, challenge and all bindings,
   stores only the credential ID, COSE public key, transports, backup flags,
   sign count, label, and safe timestamps, and consumes the challenge.
5. Registration alone does not upgrade the session. The server immediately
   issues a fresh five-minute authentication challenge restricted to the newly
   created credential.
6. The user verifies the new passkey with a second user-verifying assertion.
   Only then does the server activate a pending new account when applicable,
   rotate the session ID, consume the restricted session, and create a full
   session.
7. If immediate verification fails, the credential remains pending and cannot
   authenticate. The user may retry verification while the restricted session
   is valid or restart email verification. Expired pending credentials are
   disabled and removed by cleanup; they never become active implicitly.

For an existing account this path is recovery by verified email plus possession
and verification of a newly created passkey. It never reveals, exports, resets,
or impersonates an existing passkey and never unlocks the zero-knowledge vault.

### Passkey lifecycle

A full-session user may list, add, label, and remove passkeys in Security.
Adding or removing requires a passkey step-up no older than five minutes.
Labels are account-local and do not expose raw credential IDs. The list shows
label, created date, last-used date, active status, and whether the current
session used that passkey.

Removal is transactional. The server locks and recounts active credentials,
rejects removal when only one remains, and returns `last_passkey`. Revoked or
pending credentials do not count. Removing the credential used by the current
session revokes that session after the transaction; removing another
credential revokes sessions authenticated by that credential. Adding a passkey
rotates the current session ID but does not revoke other sessions.

## API inventory

All write operations require same-origin CSRF protection in addition to the
session and WebAuthn checks described below. Public error envelopes contain a
stable code, safe message, and correlation ID only.

### Anonymous and session endpoints

| Method and path                                  | Authority          | Contract                                                                              |
| ------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------- |
| `POST /api/auth/passkeys/authentication/options` | Anonymous          | Create discoverable, user-verifying authentication options; accepts no identity hint  |
| `POST /api/auth/passkeys/authentication/verify`  | Anonymous          | Verify assertion and create a full session                                            |
| `POST /api/auth/email-otp/request`               | Anonymous          | Start generic bootstrap/recovery delivery and return `202` with opaque flow reference |
| `POST /api/auth/email-otp/verify`                | Anonymous          | Verify the latest OTP and create a restricted session                                 |
| `POST /api/auth/email-otp/resend`                | Anonymous flow     | Supersede the prior OTP subject to cooldown; return the generic delivery result       |
| `GET /api/auth/session`                          | Any                | Return `anonymous`, `restricted`, or `full` plus only state-appropriate safe fields   |
| `POST /api/auth/sign-out`                        | Restricted or full | Destroy the current server session and clear authentication cookies                   |

### Restricted-session endpoints

| Method and path                                             | Authority                    | Contract                                                                                            |
| ----------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `GET /api/auth/restricted/accounts`                         | Restricted, email verified   | Return only eligible choices for the verified email                                                 |
| `POST /api/auth/restricted/accounts/select`                 | Restricted, email verified   | Bind exactly one eligible account choice to the session                                             |
| `POST /api/auth/restricted/passkeys/registration/options`   | Restricted, account selected | Create bound discoverable registration options                                                      |
| `POST /api/auth/restricted/passkeys/registration/verify`    | Restricted, account selected | Verify and persist a pending passkey; do not create a full session                                  |
| `POST /api/auth/restricted/passkeys/authentication/options` | Restricted, pending passkey  | Create an assertion challenge limited to the newly enrolled credential                              |
| `POST /api/auth/restricted/passkeys/authentication/verify`  | Restricted, pending passkey  | Verify possession, activate credential/account, consume restricted session, and create full session |

### Full-session security endpoints

| Method and path                                | Authority                        | Contract                                            |
| ---------------------------------------------- | -------------------------------- | --------------------------------------------------- |
| `GET /api/auth/passkeys`                       | Full                             | List safe passkey metadata for the selected account |
| `POST /api/auth/passkeys/registration/options` | Full plus recent passkey step-up | Create add-passkey options                          |
| `POST /api/auth/passkeys/registration/verify`  | Full plus recent passkey step-up | Verify and add an active passkey                    |
| `PATCH /api/auth/passkeys/:passkeyId`          | Full plus recent passkey step-up | Change the account-local label                      |
| `DELETE /api/auth/passkeys/:passkeyId`         | Full plus recent passkey step-up | Revoke a non-final passkey transactionally          |

### Removed API and client surface

The implementation must delete, not deprecate, these password-era endpoints:

- `POST /api/auth/sign-up`
- `POST /api/auth/sign-up/verify`
- `POST /api/auth/sign-in/password`
- `POST /api/auth/sign-in/verify`
- `POST /api/auth/verification/resend`
- `GET /api/auth/security/password`
- `POST /api/auth/security/password/reauthenticate`
- `POST /api/auth/security/password`
- `POST /api/auth/password/forgotten`
- `POST /api/auth/password/reset/verify`
- `GET /api/auth/password/reset/session`
- `POST /api/auth/password/reset`

The implementation also deletes password request schemas, Passport local
strategy wiring, password hashing/comparison, password-reset session state,
password database columns after migration, and the `/sign-up`,
`/verify-email`, `/verify-device`, `/forgotten-password`, and
`/reset-password` client routes. Historical migration files remain immutable.

## Technical-state to English interface copy

The UI must translate every state below and must never render the technical
identifier itself.

| Technical state                       | English source copy                                                                     | Required next action                                      |
| ------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `anonymous_ready`                     | `Use a passkey to sign in. You can choose one saved on this or another device.`         | `Continue with a passkey`                                 |
| `passkey_prompt_open`                 | `Follow your device's prompt to continue.`                                              | Wait or cancel in the platform prompt                     |
| `passkey_authenticated`               | `Passkey verified. Opening Themis…`                                                     | Automatic dashboard transition                            |
| `ceremony_cancelled`                  | `Passkey sign-in was cancelled. No changes were made.`                                  | `Try passkey again`                                       |
| `ceremony_timeout`                    | `The passkey request timed out.`                                                        | `Try passkey again`                                       |
| `webauthn_unsupported`                | `This browser cannot use a passkey here.`                                               | `Use another device or security key` or `Try another way` |
| `platform_error`                      | `This device could not complete passkey sign-in.`                                       | Retry, cross-device, or `Try another way`                 |
| `authentication_failed`               | `We could not verify that passkey.`                                                     | Retry or `Try another way`                                |
| `challenge_expired`                   | `This passkey request expired.`                                                         | Start a new passkey attempt                               |
| `challenge_replayed`                  | `This passkey request is no longer valid.`                                              | Start a new passkey attempt                               |
| `challenge_mismatch`                  | `We could not verify this passkey request.`                                             | Start a new passkey attempt                               |
| `origin_mismatch`                     | `This passkey request could not be trusted.`                                            | Return to the official Themis address                     |
| `rp_id_mismatch`                      | `This passkey request could not be trusted.`                                            | Return to the official Themis address                     |
| `user_verification_required`          | `Unlock your passkey on your device to continue.`                                       | Retry with device unlock                                  |
| `credential_not_found`                | `We could not verify that passkey.`                                                     | Retry or `Try another way`                                |
| `credential_revoked`                  | `We could not verify that passkey.`                                                     | Use another passkey or `Try another way`                  |
| `sign_count_regression`               | `We could not verify that passkey.`                                                     | Use another passkey or `Try another way`                  |
| `email_entry`                         | `Enter an email you can verify.`                                                        | `Send code`                                               |
| `otp_delivery_generic`                | `If you can use that email, check for a 6-digit code. Delivery can take a few minutes.` | Enter code                                                |
| `otp_delivery_failed`                 | `If you can use that email, check for a 6-digit code. Delivery can take a few minutes.` | Retry only after the normal resend interval               |
| `otp_resend_cooldown`                 | `You can request another code in {seconds} seconds.`                                    | Wait for resend                                           |
| `otp_invalid`                         | `That code is not valid. Check it and try again.`                                       | Retry while attempts remain                               |
| `otp_expired`                         | `That code expired.`                                                                    | `Send a new code`                                         |
| `otp_attempts_exhausted`              | `That code can no longer be used.`                                                      | `Start again`                                             |
| `otp_superseded`                      | `Use the most recent code we sent.`                                                     | Enter newest code                                         |
| `otp_rate_limited`                    | `Please wait before requesting or checking another code.`                               | Retry after displayed safe delay                          |
| `restricted_session_created`          | `Email verified. A passkey is still required before you can enter Themis.`              | Continue to account choice                                |
| `restricted_session_required`         | `Verify your email again to continue passkey setup.`                                    | `Start again`                                             |
| `restricted_session_expired`          | `This verification session expired.`                                                    | `Start again`                                             |
| `restricted_session_forbidden`        | `Create and verify a passkey before opening this page.`                                 | Return to `/sign-in` enrollment                           |
| `account_choice_required`             | `Choose the account you want to access.`                                                | Select one account                                        |
| `new_account_choice`                  | `Create your Themis account`                                                            | Select and continue                                       |
| `account_selected`                    | `You are setting up access to {accountName}.`                                           | Create passkey                                            |
| `account_unavailable`                 | `That account is not available for this sign-in.`                                       | Start again or choose another returned account            |
| `registration_ready`                  | `Create a passkey to finish. Email verification alone cannot sign you in.`              | `Create passkey`                                          |
| `registration_prompt_open`            | `Follow your device's prompt to save your passkey.`                                     | Complete platform prompt                                  |
| `registration_cancelled`              | `Passkey setup was cancelled. You are not signed in.`                                   | `Try setup again`                                         |
| `registration_failed`                 | `We could not save that passkey.`                                                       | Retry setup                                               |
| `credential_duplicate`                | `That passkey is already registered.`                                                   | Create a different passkey                                |
| `pending_passkey_created`             | `Passkey saved. Verify it once to finish signing in.`                                   | `Verify passkey`                                          |
| `pending_passkey_verification_failed` | `We could not verify the new passkey. You are not signed in yet.`                       | Retry verification or start again                         |
| `pending_passkey_expired`             | `Passkey setup expired before verification.`                                            | Start email verification again                            |
| `full_session_created`                | `Passkey verified. Opening Themis…`                                                     | Automatic dashboard transition                            |
| `passkey_list_empty`                  | `No active passkeys are available.`                                                     | Security incident state; full access fails closed         |
| `passkey_added`                       | `Passkey added.`                                                                        | Return to Security                                        |
| `passkey_label_updated`               | `Passkey name updated.`                                                                 | Return to Security                                        |
| `passkey_label_conflict`              | `Use a different name for this passkey.`                                                | Change the label                                          |
| `passkey_not_found`                   | `That passkey is not available.`                                                        | Refresh the passkey list                                  |
| `passkey_removed`                     | `Passkey removed. Sessions using it were signed out.`                                   | Return to Security                                        |
| `last_passkey`                        | `Keep at least one passkey on your account.`                                            | Add another passkey before removal                        |
| `step_up_required`                    | `Verify a passkey again to make this security change.`                                  | Complete passkey step-up                                  |
| `session_signed_out`                  | `You are signed out.`                                                                   | Return to `/sign-in`                                      |
| `service_unavailable`                 | `Themis cannot complete sign-in right now. Try again shortly.`                          | Retry without claiming email delivery or authentication   |

Field validation states use `Enter a valid email address.` and `Enter the
6-digit code.` Authentication errors are announced as text, focus moves to the
error summary or next required heading, and no meaning depends on colour,
animation, biometrics, or a specific device type.

## Security and privacy contract

### Enumeration resistance

Before OTP verification, email request, resend, invalid-code, expiry, rate
limit, and delivery responses use equivalent status families, body shapes, and
safe timing envelopes for unknown and existing identities. No credential list,
account name, membership, account count, account status, or bootstrap/recovery
purpose is disclosed. Account-specific choices are disclosed only to the
restricted session established by successful email verification.

The server pads pre-verification email responses to a minimum of 500
milliseconds plus 0–100 milliseconds of cryptographically random jitter. It
performs delivery work asynchronously so provider latency does not distinguish
account state. This padding is defense in depth; equivalent code paths, payloads,
status families, rate-limit policy, and cache policy remain mandatory.

### Challenge binding and replay

Every OTP and WebAuthn challenge is generated with cryptographic randomness,
stored as a one-way value where applicable, purpose-specific, short-lived,
transactionally single-use, and bound to its session/flow and expected subject.
WebAuthn additionally binds exact origin, RP ID, ceremony type, credential or
account scope, and required user verification. A resend supersedes older OTPs;
a new ceremony never reuses a challenge. Parallel verification permits one
winner and makes every later commit a replay failure.

### Restricted-session isolation

Authorization defaults to deny. Restricted authority is implemented as an
explicit allow-list on dedicated `/api/auth/restricted/*` routes, not as a role
accepted by normal `authed()` middleware. CSRF, origin, expiry, selected-account
binding, and rate-limit checks apply independently. Session IDs rotate after OTP
verification, account-authentication success, and restricted-to-full upgrade.

### Recovery assurance

Recovery requires two verified events: control of the email destination and
creation plus immediate user-verifying possession of a new passkey. Email alone
cannot access the account. Recovery cannot disclose or derive an existing
credential, PRF output, vault key, plaintext, or encrypted metadata. Product
access after recovery remains subject to normal account authorization, and
local vault recovery follows its separate zero-knowledge contract.

### Audit and disclosure

Audit records may contain opaque flow, account, user, session, and credential
references; event kind; method; coarse outcome; timestamp; and correlation ID.
Responses and logs must not contain OTP values or hashes, raw challenges,
assertions, attestation objects, credential public-key bytes, session cookies,
email delivery secrets, PRF output, vault keys, or plaintext. User-facing copy
never claims that Themis receives a fingerprint, face scan, or device PIN.

## Post-authentication destination

Only a full session may proceed to the dashboard or a preserved authorized
deep link. A restricted session always returns to its `/sign-in` state after a
reload. First-run activation begins after the full passkey session exists; it
is never evidence that authentication or vault unlock succeeded.

## Required downstream checks

Implementation work must prove:

- discoverable passkey authentication is first and accepts no identity hint;
- synced/cross-device guidance precedes `Try another way`;
- unknown and existing email requests are externally equivalent before OTP
  verification;
- OTP success cannot call normal product endpoints;
- account choices cannot be listed or selected before email verification;
- account selection and all challenges reject cross-flow substitution and
  replay;
- registration without the immediate assertion cannot create a full session;
- the final active passkey cannot be removed under concurrent requests;
- every removed route, endpoint, schema, strategy, column, and password control
  is absent; and
- account authentication never authorizes PRF or zero-knowledge data access.
