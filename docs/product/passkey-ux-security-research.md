# Passkey UX and Security Research

**Work item:** PASSKEY-010
**Phase:** P1 research and decision record
**Status:** Historical research; password and pre-passkey-email decisions are superseded by ADR 016
**Owner:** Account WebAuthn and Passkeys epic

This document is the evidence-backed research and flow contract for
PASSKEY-001 and PASSKEY-011. It defines product behavior and decision
boundaries; it does not implement HTTP routes, Angular screens, or a
prototype. Source copy in this document is English by repository policy.

For AUTH-PASSWORDLESS-001, the canonical contract is
[`auth-flow.md`](auth-flow.md) and ADR 016. Their unified discoverable-passkey
flow supersedes this document wherever this research requires an email before
the primary ceremony, permits a password, or leaves recovery and operational
limits unresolved. The standards evidence and non-conflicting WebAuthn,
accessibility, disclosure, and zero-knowledge findings remain applicable.

## 1. Repository context and research method

The existing product flow in [`docs/product/auth-flow.md`](auth-flow.md) was
password-first and created a session only after email PIN verification. ADR
014 changes the direction to email-gated WebAuthn, retry-before-password
fallback, multiple credentials, and a strict account-authentication versus PRF
vault boundary. The current implementation exposes those concepts as a
contract helper in `apps/web/api/src/auth/passkey-contract.ts`, security
middleware in `passkey-security.ts`, and a browser ceremony adapter in
`apps/web/app/src/app/shared/auth/passkey.ts`. Those files are evidence of
available states and server checks, not a substitute for the flows below.

The research combines the repository constraints with the normative or
maintainer guidance listed in [Sources](#sources). Claims are marked as
**evidence** when they come from a source and **decision** when they are a
Themis product choice derived from that evidence and the accepted ADRs.

<a id="passkey-010-findings"></a>

## 2. Findings: user goals, risks, and constraints

| Finding                                                                          | Evidence and implication                                                                                                                    | Themis decision                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Users expect a passkey to use the device unlock gesture, not a new secret.       | FIDO describes passkeys as credentials unlocked with a device PIN, biometric, or pattern, and as either synced or device-bound.             | Say “passkey” and “use your device unlock”; never imply that Themis receives a biometric or device PIN. Explain synced/device-bound only when it helps a recovery decision.                                         |
| Passkeys are scoped to an RP and origin.                                         | WebAuthn registration and authentication are origin/RP-scoped and user-agent mediated.                                                      | Display the Themis origin in ceremony-adjacent copy only when useful; server verification remains authoritative. A failed origin/RP check is never retried with a weaker method automatically.                      |
| A ceremony can be cancelled, unavailable, or unavailable on a particular device. | WebAuthn defines abort/error paths and supports platform and roaming authenticators; FIDO documents cross-device authentication.            | Treat unsupported, cancelled, timeout, and platform errors as recoverable states. Offer retry first, then an explicit password choice; offer a separate “use another device or security key” route when supported.  |
| Account recovery is a lifecycle property, not an afterthought.                   | WebAuthn security considerations identify credential loss/key mobility; NIST requires authenticator event management and recovery controls. | Require at least one viable active access method before destructive removal. Do not invent recovery via support, email-only reset, or PRF material; unresolved recovery policy is a blocker below.                  |
| Passwords remain useful but are not phishing-resistant.                          | NIST states passwords are not phishing-resistant and requires throttling, secure storage, and password-manager support.                     | Password sign-up is secondary. Sign-in password is absent initially and disclosed only after explicit choice or an offered retry opportunity. Later password setup requires reauthentication and rate limiting.     |
| Errors must be actionable without becoming an oracle.                            | WCAG 2.2 SC 3.3.1 requires text that identifies and describes an input error; ADR 014 prohibits sensitive values in responses/logs.         | Translate failures into next actions, but use generic account wording where revealing account existence would help enumeration. Never display challenge, assertion, PIN, credential public key, or password values. |
| More than one credential improves continuity but increases management risk.      | WebAuthn supports multiple credentials and FIDO describes synced and device-bound credentials.                                              | Show stable, user-assigned labels plus created and last-used dates. Revoke deliberately, reauthenticate for destructive changes, and block removal of the last viable method.                                       |
| Account authentication is not vault unlock.                                      | ADR 013 keeps PRF output, workspace keys, and plaintext local; ADR 014 excludes them from sessions and account rows.                        | Auth success grants account identity only. PRF vault unlock and metadata APIs remain separate explicit operations and are not suggested as account recovery.                                                        |

### Accessibility and inclusion requirements

The prototype and later product must provide labelled controls, text error
messages associated with their fields, keyboard-completable dialogs, visible
focus, a non-colour status cue, and a reduced-motion mode. A user must be able
to understand what to do without hearing or seeing the browser's native
WebAuthn prompt. Copy must not assume a fingerprint, a smartphone, normal
vision, or fine motor control: a security key, device PIN, screen reader, or
cross-device path can be valid alternatives. Ceremony cancellation must not
erase entered email context or strand the user on a spinner.

<a id="passkey-010-invariants"></a>

## 3. Product invariants and terminology

1. **Passkey-first:** the primary CTA starts or retries a passkey ceremony.
2. **Verification-gated:** a pending account and its credential cannot create a
   session or access activated-account capabilities before email verification.
3. **Progressive disclosure:** password controls are not shown on initial
   passkey-first sign-in. They appear after “Use password instead” or after a
   recorded failed/unsupported/cancelled ceremony gives the user a retry and
   fallback choice.
4. **No silent downgrade:** unsupported WebAuthn, platform errors, and failed
   ceremonies never silently select password.
5. **Reauthentication for security changes:** adding, naming, configuring, or
   revoking credentials/password access requires a recent authenticated session
   and an explicit ceremony or equivalent policy-approved step-up.
6. **Viable access:** an active usable passkey or configured password counts;
   pending, expired, revoked, disabled, or otherwise unusable methods do not.
7. **No secret crossing:** account session claims may identify method and
   credential, but never contain PRF output, vault keys, plaintext, PINs,
   passwords, assertions, or challenge values.

“Pending” means a credential exists as part of an unverified enrollment; it
does not mean “signed in”. “Configured password” means an account password is
available as an intentional method; it does not mean the password is displayed
or required.

<a id="passkey-010-flows"></a>

## 4. Explicit user/state/event flows

### 4.1 Primary email-plus-passkey sign-up

1. User enters a canonical email and chooses **Create account with passkey**.
2. The service creates `pending_enrollment`, binds a fresh challenge to that
   enrollment, and starts registration. No session is created.
3. The platform asks for consent and a local unlock gesture. The user may
   cancel, time out, or complete the ceremony.
4. On success, the service stores the public credential as
   `credential_created_pending_verification`, sends a verification PIN, and
   shows “Passkey saved. Verify your email to activate this account.”
5. The user enters the PIN. A valid PIN atomically moves the enrollment to
   active, marks email verified, and makes the credential eligible for sign-in.
6. Expiry, replay, mismatch, supersession, or delivery failure leaves the
   account unable to sign in and offers a safe resend/restart path. It never
   activates a credential as a side effect.

### 4.2 Secondary password sign-up

The sign-up page offers **Use a password instead** as a clearly secondary
choice. The user completes email and password policy checks, receives the same
mandatory verification gate, and sees no claim that a passkey was created.
Password sign-up is not automatically selected because registration failed.

### 4.3 Verification continuation, resend, and restart

The verification screen identifies the destination in masked form, states that
activation is pending, and offers **Enter code**, **Resend code** (with a
cooldown), and **Start over**. A valid code activates exactly once. An invalid
code preserves the enrollment context and reports a text error. An expired or
exhausted challenge invalidates that challenge and offers a new issuance. A
resend supersedes the previous challenge; an old code cannot win a race. If
delivery fails, say it was not sent and offer retry; do not claim success.

### 4.4 Passkey-first sign-in

1. User enters email and sees **Continue with passkey** as the primary action;
   password is initially absent.
2. A clean ceremony authenticates an active credential and starts a session.
3. `email_unverified`, `verification_required`, or another gating state sends
   the user to verification without creating a session.
4. On cancellation, unsupported device, timeout, platform error, or a failed
   attempt, show **Try passkey again** first and **Use password instead** as an
   explicit alternative. Explain that the alternative is not a passkey.
5. Password disclosure requires the explicit alternative or the recorded retry
   opportunity. Invalid password feedback remains non-enumerating.

### 4.5 Later password configuration

In authenticated **Security**, the user chooses **Set up password**. Explain
that this creates a secondary account access method and does not unlock the
vault. Require recent reauthentication, a password-manager-friendly field,
policy feedback, CSRF protection, rate limiting, audit metadata without the
secret, and an explicit success result. Invalidate or rotate sessions only
according to the approved session policy; never unexpectedly log out all
devices as an implicit side effect.

### 4.6 Multiple-passkey lifecycle

In **Security**, the user can:

- **Add passkey:** reauthenticate, name the credential before or immediately
  after the ceremony, then show active status and created date.
- **Name:** edit only the account-local label; preserve stable ID and audit the
  change without logging credential material.
- **List:** show label, created date, last-used date, active/revoked status, and
  whether it is the current session credential when known. Do not expose raw
  credential IDs.
- **Revoke:** require reauthentication and confirmation naming the selected
  label. Show the remaining viable access methods before commit. A revoked
  credential fails closed and cannot be restored by retry.
- **Remove last access:** reject with a clear explanation and route to
  **Add passkey** or **Set up password**. The user must not be able to create a
  zero-access account by clicking through a destructive dialog.

<a id="passkey-010-state-translation"></a>

## 5. Backend-state to human-readable translation

The API contract remains machine-readable; this table is the UX translation
contract. The UI must not display internal state names verbatim.

| Backend state/failure                      | Human meaning                                                      | Next action                                                                | Disclosure rule                                      |
| ------------------------------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------- |
| `pending_enrollment`                       | “Your account setup is not finished.”                              | Continue registration or restart.                                          | Do not create a session.                             |
| `credential_created_pending_verification`  | “Your passkey is saved, but email verification is still required.” | Enter/resend verification code.                                            | Do not imply active sign-in.                         |
| `verification_required`                    | “Verify your email before using this account.”                     | Enter or resend code.                                                      | Generic if account existence is uncertain.           |
| `verification_expired`                     | “This verification code expired.”                                  | Request a new code.                                                        | Do not reveal old code or timing policy.             |
| `retry_passkey`                            | “Passkey sign-in did not complete.”                                | Retry passkey; then choose password explicitly.                            | Say cancelled/unavailable only when safe and useful. |
| `password_available_by_choice`             | “Password sign-in is available because you chose it.”              | Enter password and submit.                                                 | Never show password field on initial passkey view.   |
| `credential_revoked`                       | “That passkey is no longer available.”                             | Try another passkey or an already configured password; otherwise recovery. | Do not reveal other account records.                 |
| `last_viable_access_method`                | “Keep one active way to access your account.”                      | Add another passkey or configure a password first.                         | Recompute server-side at commit time.                |
| `email_required`                           | “Enter your email address to continue.”                            | Correct the field.                                                         | No account lookup.                                   |
| `challenge_expired` / `challenge_replayed` | “This sign-in attempt is no longer valid.”                         | Start a new passkey attempt.                                               | Do not expose challenge values.                      |
| `origin_mismatch` / `rp_id_mismatch`       | “This passkey request could not be trusted.”                       | Return to the official Themis origin; contact support if persistent.       | Log only safe event metadata.                        |
| `user_verification_required`               | “Unlock your passkey on this device to continue.”                  | Retry with device unlock or another credential.                            | Never ask for the device PIN in Themis.              |
| `ceremony_cancelled`                       | “You cancelled passkey sign-in.”                                   | Retry or choose password.                                                  | No automatic fallback.                               |
| `platform_error`                           | “This device could not complete passkey sign-in.”                  | Retry, use another device/key, or choose password.                         | Avoid browser/OS internals in copy.                  |

<a id="passkey-010-threat-decisions"></a>

## 6. Threat, recovery, and security decisions

| Threat or decision                                                              | Mitigation required in downstream work                                                                                                                                                          | Residual risk / blocker                                                                                                                           |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account enumeration through sign-up, sign-in, verification, or credential lists | Use equivalent timing/copy where account existence is not necessary; do not expose whether an email or credential exists.                                                                       | Exact endpoint-by-endpoint equivalence needs API security tests.                                                                                  |
| CSRF against cookie-backed writes                                               | Same-origin protected channel, origin check, CSRF design before new writes, and negative cross-origin tests.                                                                                    | Middleware currently has an in-process rate map; production deployment policy is unresolved.                                                      |
| Challenge theft, replay, race, or substitution                                  | Server-generated high-entropy challenge; bind purpose/account/origin/RP/user verification; short expiry; transactional single use; reject replay/mismatch; supersede old enrollment challenges. | Challenge TTL and attempt limits need one contract-wide value rather than per-route guesses.                                                      |
| Credential phishing or cloned authenticator                                     | Verify origin/RP/client data, user verification policy, signature and sign-count behavior; fail closed on regression.                                                                           | Syncable passkey assurance varies by provider; no per-provider trust claim is made.                                                               |
| Brute force and credential stuffing                                             | Rate limit by account/IP/device context, throttle password and verification attempts, and present cooldown recovery copy.                                                                       | Thresholds, distributed storage, and trusted proxy/IP policy are unresolved.                                                                      |
| Lost device or lost all passkeys                                                | Encourage adding more than one method; show viability before revocation; provide an approved recovery mechanism with reauthentication and audit.                                                | **BLOCKER:** no approved account recovery factor or support-verification policy exists. Do not promise “recover by email” or bypass verification. |
| Malicious or accidental last-method deletion                                    | Recompute active usable methods in the transaction; require recent reauthentication; reject zero-viability result.                                                                              | Password configuration semantics (whether a password can be disabled) need contract confirmation.                                                 |
| Session fixation or unsafe session effects after security changes               | Establish session only after verified activation/authentication; rotate or invalidate sessions based on explicit policy; audit method and time, not secrets.                                    | **BLOCKER:** session rotation/revocation behavior across other devices is not yet specified.                                                      |
| Audit/log disclosure                                                            | Record account/credential opaque identifiers, event kind, assurance, and time only; redact PINs, passwords, challenges, assertions, public-key bytes, and PRF/vault data.                       | Retention and operator access policy need security-owner approval.                                                                                |
| Confusing account auth with vault unlock                                        | Keep account session endpoints and PRF/metadata APIs separate; never use account success as a vault unlock signal.                                                                              | None for this phase; enforce with contract and boundary tests in PASSKEY-001.                                                                     |
| Accessibility or assistive-technology failure                                   | Text status/errors, labels, focus management, keyboard and reduced-motion support, and alternative authenticator/device paths.                                                                  | Real AT coverage belongs to prototype and product evaluation.                                                                                     |

Recovery is therefore **method-preserving**: a user may add another passkey or
set a password while authenticated, but an unauthenticated lost-device flow
must not be designed until the recovery factor, verification strength,
support escalation, rate limits, audit, and vault implications are approved.

<a id="passkey-010-journeys"></a>

## 7. Representative journey walkthroughs

### Primary: new user on a supported device

Maya submits her email, accepts the platform passkey prompt, sees “Passkey
saved; verify your email,” and enters the PIN. The server activates both the
account and credential atomically. A refresh uses the passkey without asking
for a password. No PRF or vault data is returned by account auth.

### Returning user with a clean passkey

Dev enters an email, chooses the primary passkey CTA, unlocks the device, and
lands in the product. The UI never flashes a password field. The session records
passkey method and safe assurance metadata only.

### Unsupported device and cancelled ceremony

Sam is on a browser without WebAuthn, then on a browser where they cancel the
prompt. Both cases show the same calm retry/fallback decision surface; neither
silently submits a password. Sam can choose a password only after that explicit
choice, or use another device/security key where supported.

### Expired verification and resend

Lee returns after the PIN expires. The pending label remains clear; the old PIN
is rejected, resend is cooldown-limited, and only the newest challenge can
activate the enrollment. Delivery failure says the message was not sent and
does not claim activation.

### Password/no-password combinations

Alex has passkeys only and sees **Set up password** in Security. Casey has a
passkey and password and may use either only according to the sign-in hierarchy.
Jordan has password only after secondary sign-up and sees the same verification
and reauthentication safeguards. None of these states expose another user’s
methods.

### Multiple passkeys and destructive action

Priya names a laptop passkey and adds a security-key passkey. The list shows
labels and dates, not raw IDs. When Priya tries to revoke the only remaining
active method, the server rejects the operation at commit time and the UI
explains how to add another method first. A revoked key cannot authenticate.

### Lost device

No approved recovery factor exists in this phase. The product must state that
recovery is unavailable or route to the approved future recovery process; it
must not imply that email verification alone restores a passkey or unlocks the
vault. This journey remains a release blocker until resolved.

<a id="passkey-010-prototype-evaluation"></a>

## 8. Prototype evaluation protocol

PASSKEY-011 must evaluate a transient prototype, not production behavior. No
participant may enter a real email, PIN, password, passkey, recovery code, or
vault secret. Use scripted fictional data and record participant role/context,
task completion, observed confusion, accessibility observations, and quotes
without identifying data.

### Tasks and questions

1. **Sign-up:** “Create an account with a passkey, then tell me what remains
   before you can sign in.” Can the participant distinguish pending from active?
2. **Secondary path:** “You prefer a password. Find that option.” Do they see
   it as deliberate and secondary rather than as a failure?
3. **Sign-in failure:** “The passkey prompt was cancelled. What would you do
   next?” Do they find retry before explicit password disclosure?
4. **Verification:** “Your code expired. Recover without guessing.” Do they
   find resend and understand the cooldown?
5. **Security setup:** “Add a password later.” Do they understand
   reauthentication and the account-auth versus vault-unlock boundary?
6. **Credential management:** “Add, name, and revoke a second passkey.” Can
   they identify the right credential from label/date without raw IDs?
7. **Last-access safety:** “Remove the only remaining passkey.” Do they predict
   the block and understand how to preserve access?

### Pass/fail criteria

| Measure                 | Pass                                                                                                                       | Fail / change required                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Pending comprehension   | At least 4 of 5 participants say email verification is required before sign-in/access.                                     | Any participant believes a saved pending passkey means the account is active, or fewer than 4/5 answer correctly.    |
| Method hierarchy        | At least 4/5 identify passkey as primary and password sign-up as secondary.                                                | Password is mistaken for automatic fallback or is chosen because passkey is visually hidden.                         |
| Retry and disclosure    | At least 4/5 retry or identify retry before finding explicit password; no participant believes password was silently used. | Password appears first, is disclosed without choice, or a participant cannot recover from cancellation.              |
| Verification gating     | 5/5 understand expired code requires a new code and cannot activate the account.                                           | Any participant thinks an old code, passkey creation, or email receipt alone activates access.                       |
| Recovery confidence     | At least 4/5 can name a safe available action and the prototype does not promise unsupported recovery.                     | Any participant is told email alone recovers a lost passkey/vault, or fewer than 4/5 can explain the available path. |
| Naming/listing clarity  | At least 4/5 select the intended credential using label and dates.                                                         | Raw identifiers, truncation, or ambiguous labels cause a wrong selection.                                            |
| Destructive safety      | 5/5 understand why the last viable method cannot be removed and find the add/configure route.                              | Any participant expects deletion to succeed or cannot identify how to retain access.                                 |
| Accessibility/operation | Keyboard path completes all tasks; focus and text errors are observable; reduced motion does not remove meaning.           | Any critical task requires pointer-only, colour-only, or unannounced transient feedback.                             |

Classify each finding as **pass**, **change required**, or **accepted
trade-off**, with evidence and disposition. Every change-required finding must
be re-evaluated or recorded as a blocker before Angular implementation.

<a id="passkey-010-blockers"></a>

## 9. Unresolved blockers and downstream traceability

The following are intentionally unresolved and must not be silently decided by
PASSKEY-001 or PASSKEY-011:

1. **Recovery authority:** choose recovery factors, strength, support
   escalation, account-enumeration posture, and whether recovery can ever
   rebind a passkey. Until approved, lost-all-methods recovery is blocked.
2. **Session policy:** specify whether setting/revoking a method rotates the
   current session, all sessions, or neither, and how users are notified.
3. **Operational limits:** approve challenge TTL, PIN/ceremony attempt limits,
   resend cooldown, distributed rate-limit storage, and retention/access for
   audit events.
4. **Credential terminology:** confirm whether the product distinguishes
   synced and device-bound passkeys in the UI, and which assurance claims are
   permitted.
5. **Verification delivery:** define the delivery-failure and email-change
   policy without allowing a pending credential to become an activation bypass.

### 9.1 Auditable downstream acceptance citation map

The following named anchors are the stable citation targets for downstream
acceptance and evidence. A downstream outcome should cite the artifact path and
the exact anchor(s), rather than merely saying “research completed”. This map
is a cross-reference record, not an instruction to resolve any blocker.

| Downstream outcome to evidence                             | PASSKEY-010 citation target                                                                                                                                                                                                 | What the downstream evidence must demonstrate                                                                                                             |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PASSKEY-001: pending enrollment and credential binding     | [`#passkey-010-flows`](#passkey-010-flows), subsections 4.1–4.3; [`#passkey-010-state-translation`](#passkey-010-state-translation)                                                                                         | Pending credential is distinct from an active account; verification, resend, restart, supersession, and terminal behavior map to explicit states/actions. |
| PASSKEY-001: passkey-first sign-in and password disclosure | [`#passkey-010-invariants`](#passkey-010-invariants), items 1–4; [`#passkey-010-flows`](#passkey-010-flows), subsection 4.4; state rows `retry_passkey` and `password_available_by_choice`                                  | No silent downgrade; password is disclosed only after the specified user-visible opportunity.                                                             |
| PASSKEY-001: later password and multi-passkey lifecycle    | [`#passkey-010-flows`](#passkey-010-flows), subsections 4.5–4.6; [`#passkey-010-journeys`](#passkey-010-journeys), “Password/no-password combinations” and “Multiple passkeys and destructive action”                       | Reauthentication, labels, stable identifiers, lifecycle operations, and last-viable-access rejection are represented without secrets.                     |
| PASSKEY-001: security boundary and negative contract tests | [`#passkey-010-threat-decisions`](#passkey-010-threat-decisions), rows for challenge, enumeration, audit/log disclosure, session effects, and vault unlock; [`#passkey-010-invariants`](#passkey-010-invariants), items 5–7 | Each negative test has a documented mitigation or an explicit unresolved blocker; account auth is not PRF or metadata authorization.                      |
| PASSKEY-011: critical prototype states and copy hierarchy  | [`#passkey-010-flows`](#passkey-010-flows), sections 4.1–4.6; [`#passkey-010-state-translation`](#passkey-010-state-translation)                                                                                            | Prototype covers the named states and uses human-readable next actions, with passkey primary and password secondary/explicit.                             |
| PASSKEY-011: representative tasks and human evaluation     | [`#passkey-010-journeys`](#passkey-010-journeys); [`#passkey-010-prototype-evaluation`](#passkey-010-prototype-evaluation), “Tasks and questions”                                                                           | Evaluation records fictional-data safety, task outcomes, comprehension, accessibility, and security misunderstandings without authentication secrets.     |
| PASSKEY-011: pass/fail disposition and approval            | [`#passkey-010-prototype-evaluation`](#passkey-010-prototype-evaluation), “Pass/fail criteria”; [`#passkey-010-blockers`](#passkey-010-blockers)                                                                            | Every measure is classified pass/change-required/accepted-trade-off; change-required findings are re-tested or remain blockers.                           |
| PASSKEY-004: independent security review                   | [`#passkey-010-threat-decisions`](#passkey-010-threat-decisions); [`#passkey-010-blockers`](#passkey-010-blockers)                                                                                                          | Reviewer confirms every listed risk has mitigation or blocker disposition and does not treat unresolved recovery/session/operations policy as decided.    |

Recommended citation form in downstream evidence:

> PASSKEY-010 research: `docs/product/passkey-ux-security-research.md#passkey-010-<anchor>`;
> outcome-specific evidence: `<downstream report or test location>`.

Traceability:

- **PASSKEY-001:** implement the invariants, state/event names, challenge and
  credential lifecycle, viability rule, session/PRF boundary, and security
  negatives described here. Its contract must reference this document.
- **PASSKEY-011:** prototype every flow and state in sections 4, 5, 7, and 8;
  run the tasks and pass/fail measures; do not resolve blockers silently.
- **PASSKEY-002/003/012/013:** consume the approved contract and prototype
  decisions for API and Angular behavior; add endpoint/route tests rather than
  treating this research as runtime evidence.
- **PASSKEY-004:** independently verify the complete validation matrix and
  obtain security sign-off against section 6.

## Sources

Accessed 2026-08-26. The links are intentionally stable primary or standards
sources; they support research decisions but do not replace local acceptance
criteria.

1. W3C, _Web Authentication: An API for accessing Public Key Credentials Level
   3_, especially use cases, RP operations, security/privacy, and accessibility:
   https://www.w3.org/TR/webauthn-3/
2. FIDO Alliance, _Passkeys: Passwordless Authentication_, including synced and
   device-bound credentials, user experience, recovery implications, and
   cross-device authentication:
   https://fidoalliance.org/passkeys/
3. NIST, _SP 800-63B Digital Identity Guidelines: Authentication and Lifecycle
   Management_, sections on passwords, throttling, authenticator events,
   sessions, and recovery:
   https://pages.nist.gov/800-63-4/sp800-63b.html
4. W3C WAI, _WCAG 2.2 Understanding SC 3.3.1 Error Identification_, on
   text-identifiable and actionable errors:
   https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html
5. Themis ADR 014, _Account WebAuthn and Passkey Contract_:
   [`docs/architecture/adr/014-account-webauthn-passkey-contract.md`](../architecture/adr/014-account-webauthn-passkey-contract.md)
6. Themis ADR 013, _Browser WebCrypto and IndexedDB Vault_:
   [`docs/architecture/adr/013-browser-webcrypto-indexeddb-vault.md`](../architecture/adr/013-browser-webcrypto-indexeddb-vault.md)
7. Themis product auth flow and backend auth architecture:
   [`auth-flow.md`](auth-flow.md),
   [`../architecture/backend/auth.md`](../architecture/backend/auth.md)
