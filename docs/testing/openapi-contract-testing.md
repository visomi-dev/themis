# OpenAPI Contract E2E Testing

The `api-e2e:openapi` Nx target runs Schemathesis against the OpenAPI document
served by the real composition server. It complements the Jest API workflow
tests; it does not replace tests that require explicit mailbox, session, or
domain setup.

## Run locally

Install `uv`, then run:

```bash
pnpm exec nx run api-e2e:openapi
```

The runner pins Schemathesis to `4.24.3` through `uvx`, starts the same memory
database composition server used by `api-e2e`, and writes sanitized JUnit and
HAR reports to `dist/test-results/api-e2e/openapi/`. The default target runs
the bounded `examples` and `coverage` phases.

For the longer property-based pass, run:

```bash
pnpm exec nx run api-e2e:openapi-fuzz
```

## Test policy

- The schema is loaded from the running API at `/api/openapi.json`.
- Examples, coverage, and deterministic fuzzing are enabled.
- The fixed seed makes failures reproducible in local and CI runs.
- The default target is bounded so it is suitable for pull requests; the
  `openapi-fuzz` target opts into the fuzzing phase explicitly.
- The test API is enabled only to support the existing in-memory composition
  server; its routes must not be treated as public API contract coverage.
- The runner bootstraps one ephemeral account through the in-memory test
  mailbox and passes the resulting sanitized session cookie to generated
  requests. Detailed OTP and password-recovery workflows remain in the
  explicit Jest API E2E suite.

## Reproducing a failure

Schemathesis prints a minimal reproduction for failed cases. The generated HAR
file in the report directory can be inspected without exposing credentials;
report output is configured to sanitize sensitive values.
