# ADR 014: Account WebAuthn and Passkey Contract

## Status

Accepted as the contract and persistence foundation for PASSKEY-001. HTTP
ceremonies and Angular UX are delivered by later work.

## Account identity and gating

An account-authentication flow always starts with a mandatory canonical email.
Canonicalization applies Unicode NFKC normalization, trimming, and invariant
lower-casing before lookup, uniqueness checks, or storage; equivalent email
representations therefore identify the same account.
The account may not register or use a passkey until the email verification PIN
has completed and `users.email_verified_at` is set. The email/PIN gate is an
account-authentication prerequisite, not a vault unlock mechanism.

WebAuthn is the default registration and sign-in method. A cancelled,
unsupported, or failed ceremony enters `retry_available`; the client must offer
retry before exposing password fallback. An explicit password choice may enter
`password_fallback` immediately. Neither path bypasses the email/PIN gate.

## Durable model

`account_passkey_credentials` is account-scoped and references both the account
and owning user. It stores the credential ID, opaque COSE public key, RP ID,
display label, transports, backup flags, sign count, use/revocation timestamps,
and no private or PRF material. Credential IDs are unique at the RP and labels
are unique within an account. Revocation is represented by `revoked_at`; a
revoked credential is never accepted again, while other credentials remain
usable.

`account_webauthn_challenges` stores a one-way challenge hash, purpose
(`registration` or `authentication`), account/user binding, expected RP ID and
origin, user-verification policy, expiry, attempt count, and `consumed_at`.
Challenges are short-lived, consumed transactionally on success, and rejected
when expired or already consumed. Raw challenge bytes are not durable data.

## Ceremony verification contract

The server creates a fresh random challenge and verifies the WebAuthn client
data type, compares the received challenge hash to the durable challenge, and
checks the exact configured origin, exact RP ID hash, and configured
user-verification requirement. Authentication selects a credential by its
stable credential ID, checks active account ownership, and rejects a revoked
credential with `credential_revoked`. A received sign count below the stored
count is `sign_count_regression` and fails closed;
equal counters are accepted for authenticators that do not increment counters,
and a larger counter is persisted. All successful ceremonies consume the
challenge and update `last_used_at`.

Failure taxonomy is explicit: `email_required`, `email_unverified`,
`pin_required`, `challenge_expired`, `challenge_replayed`,
`challenge_mismatch`, `origin_mismatch`, `rp_id_mismatch`,
`user_verification_required`, `credential_not_found`, `credential_revoked`,
`sign_count_regression`, `ceremony_cancelled`, and `platform_error`. Responses
and logs must not include credential public-key bytes, challenge values,
assertions, PINs, or passwords.

## Boundary with zero-knowledge data

An account session proves account identity and authorization only. It does not
unlock a PRF-derived vault key, expose vault plaintext, or authorize metadata
payload reads. A later, explicit local vault-unlock ceremony may use the
WebAuthn PRF adapter from ADR 013; that result remains local and is never put
in account credential rows, sessions, auth challenges, or metadata APIs.

Session claims may contain account ID, user ID, role, authentication method,
credential ID, and authentication time/assurance. They must not contain PRF
output, vault keys, vault plaintext, or encrypted metadata payloads.
