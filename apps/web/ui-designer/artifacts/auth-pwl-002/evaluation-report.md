# AUTH-PWL-002 Passwordless Prototype Evaluation

## Approval outcome

**Recommendation: approve the prototype as implementation input.**

This English report is the human-review package for the transient ui-designer
prototype. It evaluates visual hierarchy, responsive behaviour, interaction
states, security copy, and local brand treatment. It is not Angular, API,
schema, production accessibility, or production security evidence.

## Scope and contract traceability

- Canonical behaviour and copy: `docs/product/auth-flow.md`.
- Passwordless access prototype:
  `apps/web/ui-designer/src/prototypes/passwordless-access.html`.
- Passkey-management prototype:
  `apps/web/ui-designer/src/prototypes/passkey-management.html`.
- No Angular, API, database, migration, or schema file is part of this
  prototype implementation.
- Password, social-login, and remember-me controls are intentionally absent.

### State inventory

| Surface             | States evaluated                                                                                                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Passwordless access | `ready`, `loading`, `cancelled`, `error`, `email`, `otp`, `otp-error`, `account-choice`, `enrollment`, `enrollment-loading`, `enrollment-cancelled`, `verify-new-passkey`, `enrollment-error`, `recovery-expired`, `success` |
| Passkey management  | `list`, `add`, `add-loading`, `add-cancelled`, `rename`, `updated`, `remove`, `removed`, `last-passkey`, `error`, `brand-evaluation`                                                                                         |

The access flow keeps discoverable passkey authentication first, places synced
and cross-device guidance before `Try another way`, grants email verification
only a visibly restricted path, delays account choice until after OTP, and
requires enrollment plus a confirming assertion before success. Management
shows safe metadata, recent-passkey confirmation language, destructive impact,
and the final-passkey guard.

## Deterministic visual evaluation

**Result: pass.** The contracted Nx capture target generated 156 screenshots:
26 states × 3 viewport presets × 2 themes. Every capture uses a 1× device scale,
UTC, the `en-GB` locale, reduced motion, loaded local fonts, disabled screenshot
animation, and a hidden caret.

Automated inspection reported zero failures across all captures:

- every frame returned HTTP 200;
- no console error or failed request occurred;
- no horizontal overflow was detected;
- every visible interactive target measured at least 44 × 44 pixels;
- keyboard focus produced a visible 2px solid outline;
- every enabled white-text action met the 4.5:1 WCAG AA contrast threshold,
  with a minimum measured ratio of 4.77:1 after Chromium converted the rendered
  CSS Color 4 values to sRGB samples;
- all images loaded;
- no remote resource was requested;
- no password input or autocomplete token was present;
- no social-login, remember-me, password-sign-in, raw challenge, credential ID,
  public-key byte, or recovery-code disclosure was visible.

The capture script performed its DOM, resource, focus, target-size, and contrast
inspection on every generated screenshot state. The human-readable snapshot
review then inspected the full-size primary access, OTP, account choice,
enrollment failure, final-passkey guard, destructive removal, management list,
and local-brand captures named below across the available viewport and theme
variants. The centered composition remains calm and legible at all three
breakpoints. Zinc surface steps and ghost borders preserve separation without
heavy sectioning. Manrope headings, Inter body copy, restrained blue actions,
explicit underlined fallback links, red destructive states, and green completion
states establish a clear hierarchy. No clipping, overlap, unintended
truncation, ambiguous destructive action, or remaining contrast issue was
identified in the reviewed captures.

Artifacts:

- screenshots: `apps/web/ui-designer/artifacts/auth-pwl-002/screenshots/`;
- machine inspection: `apps/web/ui-designer/artifacts/auth-pwl-002/inspection.json`;
- representative primary view:
  `screenshots/passwordless-access--ready--desktop--dark.png`;
- representative OTP view:
  `screenshots/passwordless-access--otp--mobile--dark.png`;
- representative management view:
  `screenshots/passkey-management--list--mobile--light.png`;
- representative destructive view:
  `screenshots/passkey-management--remove--desktop--dark.png`;
- final-passkey safeguard:
  `screenshots/passkey-management--last-passkey--mobile--dark.png`;
- enrollment failure:
  `screenshots/passwordless-access--enrollment-error--mobile--light.png`;
- brand comparison:
  `screenshots/passkey-management--brand-evaluation--tablet--light.png` and
  `screenshots/passkey-management--brand-evaluation--tablet--dark.png`.

## Local SVG brand evaluation

The build target copies only the four supplied local SVG files into the
ui-designer public artifact directory. The capture script inspected their
source before rendering. All four contain `currentColor`, and none contains a
script, `foreignObject`, inline event handler, data URL, or remote URL.

| Asset                               | SHA-256                                                            | Evaluation                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `assets/themis-isotype.svg`         | `4dfb8d293391e67e3436fbcefc81356aa4891a8ba5bffaf67cc307816b8acb6e` | Filled mark is strongest at compact header size.                                               |
| `assets/themis-isotype-stroke.svg`  | `e4651fff26ae12627ed585fb6c0b31d09dd2d9a63f0b7abfa25b4f6bc54d4e9e` | Stroke animation correctly disables under reduced motion; too delicate for the compact header. |
| `assets/themis-logotype.svg`        | `1b7d928293fbe1236ac7ff7984c256ca0d8e926416578e315e5d77ab339175b8` | Filled logotype is readable for larger brand placements.                                       |
| `assets/themis-logotype-stroke.svg` | `59cd972bf44fa062912df9d528ca0885808fa0b60392643a724bd35b080f08fd` | Useful as an evaluated display treatment, not the compact production default.                  |

An SVG loaded through external `<img>` is isolated from the parent document and
does not inherit the page's `currentColor` or custom accent property. The
prototype therefore uses the filled isotype with a monochrome filter inside a
blue tile for the live header. The comparison renders a trusted inline copy of
the supplied stroke paths to demonstrate independent zinc and blue treatment.
Production can use trusted inline SVG or explicit pre-coloured light/dark files;
that is a downstream implementation decision, not a prototype change.

Brand comparison capture:
`screenshots/passkey-management--brand-evaluation--tablet--light.png`.

## Security and fallback review

**Result: pass for prototype scope.**

- Fallback discoverability is deliberate: synced/cross-device guidance appears
  before the underlined `Try another way` action.
- Pre-verification email and OTP copy is generic and does not claim an account
  exists or that delivery succeeded.
- Account names appear only in the post-verification account-choice state.
- Email verification copy states that the user is not signed in and a passkey
  remains mandatory.
- Recovery expiry, cancellation, enrollment failure, and final-passkey removal
  all fail closed with an explicit safe next action.
- The prototype never claims that Themis receives a fingerprint, face scan, or
  device PIN.
- All resources are local, and no secret, credential identifier, WebAuthn
  payload, challenge value, OTP value, session value, or remote asset is stored
  in the artifact.

## Validation commands

- Build: `pnpm exec nx run ui-designer:build-css --skip-nx-cache` — passed.
- Capture and automated inspection:
  `pnpm exec nx run ui-designer:capture-passwordless-auth --skip-nx-cache` —
  passed, 156 screenshots and zero inspection failures.
- Focused lint: `pnpm exec nx run ui-designer:lint --skip-nx-cache` — passed with
  one pre-existing warning in `src/server.ts`.

## Human review prompts

The reviewer can approve this package by confirming the following observable
questions against the screenshot directory:

1. Is passkey authentication unmistakably primary without an identity prompt?
2. Is cross-device guidance visible before the fallback action?
3. Is OTP understood as a restricted bootstrap/recovery step rather than sign-in?
4. Is the second passkey verification clearly required before product access?
5. Are cancellation and error states calm, generic, and recoverable?
6. Are passkey naming, removal impact, and final-passkey protection understood?
7. Is the filled isotype accepted as the compact default, with the stroke mark
   retained only as an evaluated alternative?

No unresolved visual or security blocker was found. Independent product-owner
approval may be recorded downstream without changing these prototype artifacts.
