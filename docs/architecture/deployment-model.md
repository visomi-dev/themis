# Deployment Model

## Initial Deployment Direction

Themis starts as a single deployable Node runtime.

That runtime composes:

- the Astro site build from `apps/web/site`
- the Express API build from `apps/web/api`
- the gateway runtime in `apps/web/server`

## Benefits

- one deployment unit for early product stages
- simpler local development and staging environments
- clear separation inside the repo without early operational fragmentation

## Future Extraction Path

Split only when there is real operational pressure, for example:

- the API needs independent scaling
- the web app needs a distinct deployment topology
- background jobs require a dedicated worker runtime
- native or hybrid clients need separate release lifecycles
