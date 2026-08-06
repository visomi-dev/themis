---
type: 'query'
date: '2026-08-06T19:41:34.207372+00:00'
question: 'Trace the Auth path through browser, server, challenge, guards, and routes'
contributor: 'graphify'
outcome: 'useful'
source_nodes: ['Auth', 'BrowserAuth', 'ServerAuth', 'AuthChallenge', 'activatedGuard()']
---

# Q: Trace the Auth path through browser, server, challenge, guards, and routes

## Answer

Expanded from graph vocabulary: [auth, browser, server, challenge, guard, route]. Auth at web/app/src/app/shared/auth/auth.ts:L15 is the common abstraction inherited by BrowserAuth and ServerAuth. BrowserAuth exposes sign-in, sign-up, verification, password reset, session, and pending-challenge methods. ServerAuth mirrors the server-rendered versions. Auth references AuthUser and AuthChallenge in auth.models.ts:L10 and L18. Auth is imported by sign-in, sign-up, password reset, verification flows, layout, realtime, and activation guards. activatedGuard() at activated-guard.ts:L14 calls hasCompletedActivation() and is connected to app.routes.ts. All cited relationships are EXTRACTED except the activatedGuard-to-app.routes indirect_call, which is INFERRED.

## Outcome

- Signal: useful

## Source Nodes

- Auth
- BrowserAuth
- ServerAuth
- AuthChallenge
- activatedGuard()
