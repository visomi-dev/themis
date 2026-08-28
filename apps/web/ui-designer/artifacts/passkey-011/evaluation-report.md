# PASSKEY-011 Prototype Evaluation Report

## Scope and traceability

This report evaluates transient ui-designer prototypes only. It is not Angular,
API, product E2E, or production security evidence.

- PASSKEY-010 flow and copy anchors:
  `docs/product/passkey-ux-security-research.md#passkey-010-flows` and
  `#passkey-010-state-translation`.
- PASSKEY-010 evaluation anchors:
  `#passkey-010-journeys`, `#passkey-010-prototype-evaluation`, and
  `#passkey-010-blockers`.
- PASSKEY-001 contract anchor:
  `apps/web/api/src/auth/passkey-contract.ts` (pending activation, progressive
  disclosure, lifecycle, and viable-access model only).

The five unresolved PASSKEY-010 blockers remain unresolved: recovery authority,
session policy, operational limits, credential terminology, and verification
delivery. The prototypes do not silently decide them.

## Approved-state inventory and downstream map

| Prototype                      | State                  | Decision represented                                              | Downstream owner |
| ------------------------------ | ---------------------- | ----------------------------------------------------------------- | ---------------- |
| `passkey-sign-up.html`         | `default`              | Passkey is the primary sign-up method.                            | PASSKEY-003      |
| `passkey-sign-up.html`         | `secondary-password`   | Password sign-up is deliberate and secondary.                     | PASSKEY-003      |
| `passkey-sign-up.html`         | `pending-verification` | Saved credential remains pending; no session exists.              | PASSKEY-003      |
| `passkey-sign-up.html`         | `error`                | Expired verification requires a new code and does not activate.   | PASSKEY-003      |
| `passkey-sign-in.html`         | `default`              | Password is absent from the initial passkey-first view.           | PASSKEY-012      |
| `passkey-sign-in.html`         | `retry`                | Retry is primary after cancellation/failure; no silent downgrade. | PASSKEY-012      |
| `passkey-sign-in.html`         | `disclosed-password`   | Password appears only after explicit choice.                      | PASSKEY-012      |
| `passkey-sign-in.html`         | `error`                | Generic, non-enumerating failure exposes no ceremony detail.      | PASSKEY-012      |
| `security-password-setup.html` | `setup`                | Later password is secondary account access, not vault unlock.     | PASSKEY-013      |
| `security-passkeys.html`       | `list`                 | Human labels and dates appear; raw credential IDs do not.         | PASSKEY-013      |
| `security-passkeys.html`       | `add`                  | Add requires naming and recent passkey confirmation.              | PASSKEY-013      |
| `security-passkeys.html`       | `name`                 | Rename changes only the account-local label.                      | PASSKEY-013      |
| `security-passkeys.html`       | `revoke`               | Destructive copy names the method and remaining access.           | PASSKEY-013      |
| `security-passkeys.html`       | `last-access-blocked`  | Last viable access removal fails and routes to safe alternatives. | PASSKEY-013      |

## Automated and expert inspection findings

**Status: pass for prototype inspection.** The required matrix contains 14
states × 3 viewport presets × 2 themes = 84 deterministic screenshots under
`apps/web/ui-designer/artifacts/passkey-011/screenshots/`. The final Playwright
inspection is recorded in `inspection.json` and reported zero failures:

- all frame responses were HTTP 200;
- no horizontal overflow or undersized interactive targets were observed;
- keyboard focus produced a 2px solid outline on every inspected state;
- password inputs remained blank and prohibited credential/identifier terms were
  absent from visible content;
- reduced-motion emulation was enabled for every capture.

The desktop and mobile light/dark representatives were manually reviewed for
hierarchy, contrast, truncation, overflow, destructive-action clarity, and
unintended secret display. No change-required visual finding was identified.
The ui-designer build target now copies the installed Catalyst font assets into
its public files directory, so the screenshots use the live token typography
without font-load errors.

## Human evaluation

**Status: pass.**

**Participant role/context:** Product owner/user reviewing the generated
prototype screenshots in
`apps/web/ui-designer/artifacts/passkey-011/screenshots/`.

The six provided task-level human evaluation answers were all **Yes**:

| Task-level finding                                                               | Outcome | Classification |
| -------------------------------------------------------------------------------- | ------- | -------------- |
| Pending verification is understood.                                              | Yes     | pass           |
| The secondary password path is discovered and understood as secondary.           | Yes     | pass           |
| Retry is found before explicit password disclosure after passkey failure.        | Yes     | pass           |
| Later password setup is understood.                                              | Yes     | pass           |
| Multiple passkeys can be named and managed.                                      | Yes     | pass           |
| The last viable access method cannot be removed and the safeguard is understood. | Yes     | pass           |

No change-required findings were provided.

Qualitative interview follow-up is deferred and non-blocking for this prototype
milestone; no qualitative, accessibility, or security observations are inferred.

The approval applies to the approved-state inventory and copy decisions in this
report. It authorizes PASSKEY-003, PASSKEY-012, and PASSKEY-013 to use the
following traceability map as their implementation input:

- PASSKEY-003: sign-up `default`, `secondary-password`,
  `pending-verification`, and `error` states and their passkey-primary,
  password-secondary, and verification-gated copy.
- PASSKEY-012: sign-in `default`, `retry`, `disclosed-password`, and `error`
  states and their passkey-first, explicit-password-disclosure, retry, and
  non-enumerating copy.
- PASSKEY-013: password setup `setup` plus passkey lifecycle `list`, `add`,
  `name`, `revoke`, and `last-access-blocked` states and their later-password,
  human-label, naming, destructive-action, and viable-access copy.

## Approval outcome

**Approved.** The product owner/user approved the prototype proposal after
reviewing the generated responsive light/dark screenshots. The approved states,
copy, and pass findings are mapped above to PASSKEY-003, PASSKEY-012, and
PASSKEY-013. This evaluation does not turn the prototype artifacts into
production validation.

## Validation evidence index

- CSS/build output: `pnpm exec nx run ui-designer:build-css --skip-nx-cache`
- Capture and inspection: `pnpm exec node apps/web/ui-designer/artifacts/passkey-011/capture.mjs`
- Preview URL family: `http://localhost:4300/preview/<slug>/frame?theme=<light|dark>&state=<state>`
- Screenshot directory: `apps/web/ui-designer/artifacts/passkey-011/screenshots/`
- Browser inspection report: `apps/web/ui-designer/artifacts/passkey-011/inspection.json`
- Human approval record: this report, **Human evaluation**, lines 61–87
