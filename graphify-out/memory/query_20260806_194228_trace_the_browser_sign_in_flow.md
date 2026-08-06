---
type: 'query'
date: '2026-08-06T19:42:28.790182+00:00'
question: 'Trace the browser sign-in flow'
contributor: 'graphify'
outcome: 'useful'
source_nodes:
  [
    'sign-in.ts',
    'BrowserAuth',
    '.signInWithPassword()',
    'CredentialsPayload',
    'SignInWithPasswordResult',
    'AuthChallenge',
    '.setPendingChallenge()',
  ]
---

# Q: Trace the browser sign-in flow

## Answer

Expanded from graph vocabulary: [browser, sign, password, session, challenge, guard]. The sign-in feature imports Auth and its UI controls from web/app/src/app/auth/sign-in/sign-in.ts. BrowserAuth.signInWithPassword() at web/app/src/app/shared/auth/browser-auth.ts:L65 accepts CredentialsPayload and returns SignInWithPasswordResult; the graph shows it calls setPendingChallenge() at L235. AuthChallenge is the shared challenge state. BrowserAuth also exposes ensureSessionLoaded(), session hint/cookie helpers, verification, sign-out, and password reset methods. The graph links activation guards and SIGN_IN_URL, but does not expose the complete HTTP request endpoint or post-login redirect as direct extracted edges.

## Outcome

- Signal: useful

## Source Nodes

- sign-in.ts
- BrowserAuth
- .signInWithPassword()
- CredentialsPayload
- SignInWithPasswordResult
- AuthChallenge
- .setPendingChallenge()
