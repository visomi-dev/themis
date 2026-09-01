# ADR 016: Unified Passwordless Authentication

## Status

Accepted for AUTH-PASSWORDLESS-001. This decision supersedes ADR 014 where ADR
014 requires email before passkey registration, permits password fallback, or
treats a configured password as a viable access method. ADR 014 remains the
historical persistence and WebAuthn-verification baseline where it does not
conflict with this decision.

## Context

The existing product and implementation split account creation, sign-in, email
verification, forgotten-password, and password-reset into separate routes.
ADR 014 then introduced passkeys while preserving mandatory pre-ceremony email
and optional passwords. That model cannot provide a genuinely discoverable
passkey-first experience and leaves email OTP with ambiguous authentication
authority.

The product requires one entry point, no passwords, non-enumerating email
bootstrap and recovery, explicit post-verification account choice, and a hard
passkey gate before product access. The complete product state, endpoint, copy,
and threat contract is normative in
[`docs/product/auth-flow.md`](../../product/auth-flow.md).

## Decision

### One passkey-first entry point

The only client authentication route is `/sign-in`. Its primary operation is a
discoverable WebAuthn authentication ceremony with no email or username hint.
The authenticator performs account discovery. Synced and cross-device passkey
guidance is displayed before the user can choose `Try another way`.

Password authentication, password enrollment, password recovery, Passport
local strategy use, and all password-bearing routes and persistence are
removed. There is no password fallback or password compatibility period in the
target contract.

### Email OTP has restricted authority

`Try another way` starts an enumeration-resistant email OTP flow used for both
new-account bootstrap and existing-account recovery. Before successful OTP
verification, unknown and existing identities receive equivalent public
responses. Successful verification creates a 15-minute restricted session,
not a full account session.

Restricted authority is an explicit deny-by-default capability limited to:

- reading account choices eligible for the verified email;
- selecting exactly one returned account;
- registering one passkey bound to that account; and
- verifying possession of the newly registered passkey.

It cannot use normal authenticated middleware or access any product, workspace,
API-key, billing, security-management, metadata, or vault operation.

### Account choice follows verification

Account names, membership, status, and count are account-existence information
and are disclosed only after email verification. The choice set is generated
server-side and bound to the restricted session. Unknown identities receive a
pending personal-account choice. Existing identities receive only currently
eligible accounts. Selection is immutable within the restricted session.

### Enrollment requires a confirming assertion

Passkey registration stores a pending credential but does not authenticate it.
The server immediately requires a new assertion restricted to that credential.
Only successful user-verifying assertion atomically activates the credential
and any pending account, consumes the restricted session, rotates the session
identifier, and creates a full session. Pending credentials expire closed.

### At least one passkey remains

Only active passkeys are viable account authentication methods. Removal locks
and recounts active credentials in the committing transaction. The final
passkey cannot be removed. Credential removal revokes sessions authenticated by
that credential. A security change requires a passkey step-up no older than
five minutes.

### Fixed challenge and OTP policy

- WebAuthn challenges expire after five minutes and are single-use.
- Email OTPs are six digits, expire after ten minutes, allow five failed
  attempts, and have a 60-second resend cooldown.
- Resend supersedes every older code in the flow.
- Restricted sessions expire absolutely after 15 minutes and do not roll.
- Full sessions expire absolutely after seven days and do not roll.
- OTP delivery is limited to five per normalized email and 20 attempts per IP
  per rolling hour; OTP verification is also limited to 30 submissions per IP
  per 15 minutes.
- Passkey option creation is limited to 30 attempts per IP per five minutes.
- A submitted WebAuthn verification consumes its challenge on success or
  failure; a browser cancellation that submits nothing does not.
- OTP and WebAuthn verification bind purpose, flow/session, subject, and latest
  challenge; WebAuthn also binds ceremony type, exact origin, RP ID, account or
  credential scope, and required user verification.

### Account authentication is not vault unlock

A full account session proves account identity and authorization only. It never
contains or grants access to WebAuthn PRF output, vault keys, plaintext, or
encrypted metadata payloads. Local vault unlock and recovery remain governed by
the zero-knowledge architecture.

## Security consequences

The model resists anonymous account enumeration by postponing account-specific
disclosure until verified email control. It prevents OTP takeover from becoming
immediate product access by requiring creation and verification of a passkey.
It prevents challenge substitution and replay through server-side binding,
short expiry, transactional consumption, and session rotation. It prevents
zero-access accounts through a transactional final-passkey guard.

Email compromise plus attacker-controlled passkey enrollment remains a recovery
risk. The accepted assurance for this product phase is verified email control
plus immediate user-verifying possession of a newly created passkey. This does
not recover local zero-knowledge material. Delivery, OTP, registration,
assertion, session upgrade, and passkey-removal events require redacted audit
records and distributed rate limiting in production.

## Consequences

### Positive

- Returning users get a true username-less passkey path.
- New account, sign-in, and recovery share one comprehensible state machine.
- Email OTP authority is narrow, explicit, and testable.
- Password phishing, storage, reset, and downgrade surfaces disappear.
- Account selection cannot act as a pre-verification enumeration oracle.

### Negative

- Email recovery requires two ceremonies after the OTP: registration and a
  confirming assertion.
- Users who cannot use WebAuthn cannot access Themis.
- Removing password-era persistence and routes requires coordinated migration
  and client/API rollout.
- Email account compromise can authorize a new account passkey, although it
  cannot recover local vault secrets.

## Rejected alternatives

### Keep password as an explicit fallback

Rejected because it preserves phishing, reset, storage, enumeration, and silent
downgrade risks and contradicts complete password removal.

### Grant a full session after email OTP

Rejected because email OTP is the bootstrap/recovery factor, not sufficient
authentication assurance for product access.

### Ask for email before passkey authentication

Rejected because it prevents discoverable credentials from performing account
selection and adds an enumeration-prone identity step to the primary path.

### Select an account before email verification

Rejected because account names and membership disclose identity information to
an unverified caller.

### Treat registration as proof of possession

Rejected because a completed registration response creates a credential but is
not the required authentication assertion. Immediate verification makes the
full-session transition explicit and testable.

### Permit removal of the final passkey when email recovery exists

Rejected because recovery is not an active authentication method and would
allow an account to enter a zero-credential state.

## Implementation boundary

This ADR defines behavior only. Product code, migrations, API implementation,
Angular routes, and prototype work belong to downstream AUTH-PASSWORDLESS work
items. Those items must use the exact inventory, states, source copy, limits,
and negative checks in `docs/product/auth-flow.md`; they must not reintroduce a
password transition period or grant restricted sessions broader authority.
