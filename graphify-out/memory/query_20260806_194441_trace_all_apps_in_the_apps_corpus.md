---
type: 'query'
date: '2026-08-06T19:44:41.646467+00:00'
question: 'Trace all apps in the apps corpus'
contributor: 'graphify'
outcome: 'useful'
source_nodes:
  [
    'Auth',
    'BrowserAuth',
    'ServerAuth',
    'Activation',
    'ProjectsApi',
    'queueProjectSeed()',
    'subscribeToProjectSeedEvents()',
    'createGatewayApp()',
    'getSiteContent()',
    'ensurePrototypesSynced()',
  ]
---

# Q: Trace all apps in the apps corpus

## Answer

Completed an autonomous traversal of the apps corpus. The graph contains web/app (847 nodes), web/api (265), web/server (140), web/ui-designer (131), web/realtime (121), worker (116), web/app-e2e (99), web/site (94), api-e2e (54), server-e2e (53), realtime-e2e (40), worker-e2e (40), and site-e2e (33). Main flows: browser auth through Auth/BrowserAuth/ServerAuth and challenges; activation through API key and milestones; projects through ProjectsApi, API routers, seed queue, worker/realtime events; gateway boot through API, Angular SSR, Astro, realtime, and worker runtimes; site content through Astro pages and locale content; UI designer through prototype sync, manifest, preview, and health routes. Cross-app edges are sparse and graph health reported 539 dangling endpoints, so runtime handoffs are not fully represented.

## Outcome

- Signal: useful

## Source Nodes

- Auth
- BrowserAuth
- ServerAuth
- Activation
- ProjectsApi
- queueProjectSeed()
- subscribeToProjectSeedEvents()
- createGatewayApp()
- getSiteContent()
- ensurePrototypesSynced()
