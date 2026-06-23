# End-To-End Testing Guidance

These instructions apply to Playwright and route-flow tests, especially auth and app-shell flows.

## Organization

- Organize Playwright specs by route and feature area, not as one monolithic auth flow file.
- Put shared helpers under `src/support/` for mailbox access, OTP filling, route constants, and auth helpers.
- Keep test names and helper names in English.
- Prefer one scenario group per PR when the helper infrastructure already exists.

## Selectors And Assertions

- Prefer `getByRole`, `getByLabel`, and visible heading assertions over brittle CSS selectors or test IDs.
- Use stable accessible names for buttons, links, fields, and headings.
- Avoid assertions that depend on implementation-only DOM structure.
- Keep route-level auth forms accessible with explicit labels and straightforward heading text.

## Auth Route Coverage

Auth changes should keep the route suite green for:

- `/app/sign-in`
- `/app/sign-up`
- `/app/verify-email`
- `/app/`
- theme behavior across auth and app routes

## Workflow

- Separate enabling Playwright utilities from new product behavior when practical.
- Add or update route-specific specs with the feature slice they verify.
- Avoid combining every auth scenario into one PR unless it is initial infrastructure work.
- Prefer deterministic helpers for OTP, mailbox, session, and route setup.
- When debugging flakiness, isolate the failing route spec before broad suite runs.

## Verification

- Run E2E through Nx targets, not Playwright directly, unless there is no target for the scenario.
- Prefer focused route or project verification before broad e2e runs.
- If an E2E run is too expensive for the current turn, report the exact Nx command to run later and explain why it was skipped.
