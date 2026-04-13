# System Architecture

## Recommended Direction

Build Themis as a monolith-friendly product inside this workspace.

The initial repository shape is:

- `apps/web/site` for the public landing surface
- `apps/web/app` for the product web app
- `apps/web/api` for structured backend endpoints
- `apps/web/server` as the composition runtime

## Runtime Topology

Initial composition:

- `/api/*` routes are owned by the Express API
- all remaining public routes are owned by the Astro site
- the Angular application remains independently runnable during development and can later be mounted behind the composed server when product routes are ready

## Why This Shape Fits Themis

- it preserves one repository and one operational runtime entry point
- it keeps the public marketing surface independent from the product app surface
- it allows the API to evolve without tightly coupling every interaction to Astro page logic
- it leaves room for future extraction if mobile, hybrid, or native clients are added later
