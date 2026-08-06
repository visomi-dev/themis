# Graph Report - libs (2026-08-06)

## Corpus Check

- Corpus is ~4,703 words - fits in a single context window. You may not need a graph.

## Summary

- 302 nodes · 420 edges · 22 communities (21 shown, 1 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)

- Community 0
- Community 1
- Dotenv
- Contracts
- Bullmq
- Community 5
- Ref
- Tsconfig Spec
- Tsconfig Spec
- Tsconfig
- Tsconfig
- Safe Insert
- Community 12
- Tsconfig
- Session Postgressessionstore
- Tsconfig
- Building
- Building

## God Nodes (most connected - your core abstractions)

1. `withAccountContext()` - 15 edges
2. `env` - 8 edges
3. `PostgresSessionStore` - 8 edges
4. `getProject()` - 7 edges
5. `createDocument()` - 7 edges
6. `mapAsyncJob()` - 7 edges
7. `options` - 6 edges
8. `updateAsyncJob()` - 6 edges
9. `publishProjectAsyncJobEvent()` - 6 edges
10. `processProjectSeedJob()` - 6 edges

## Surprising Connections (you probably didn't know these)

- `deleteProject()` --calls--> `withAccountContext()` [EXTRACTED]
  projects/src/lib/projects-service.ts → shared/src/lib/db/account-context.ts
- `getProjectSeedQueue()` --calls--> `getRedis()` [EXTRACTED]
  projects/src/lib/seed/queue.ts → shared/src/lib/redis/connection.ts
- `listProjects()` --calls--> `withAccountContext()` [EXTRACTED]
  projects/src/lib/projects-service.ts → shared/src/lib/db/account-context.ts
- `getProject()` --calls--> `withAccountContext()` [EXTRACTED]
  projects/src/lib/projects-service.ts → shared/src/lib/db/account-context.ts
- `createProject()` --calls--> `withAccountContext()` [EXTRACTED]
  projects/src/lib/projects-service.ts → shared/src/lib/db/account-context.ts

## Import Cycles

- None detected.

## Communities (22 total, 1 thin omitted)

### Community 0 - "Community 0"

Cohesion: 0.12
Nodes (24): AsyncJobEvent, AsyncJobEventName, AsyncJobRecord, AsyncJobStatus, AsyncJobType, JobsListResponse, ProjectSeedJobInput, ProjectSeedJobResult (+16 more)

### Community 1 - "Community 1"

Cohesion: 0.13
Nodes (20): TenantContext, db, getDb(), getPool(), env, environmentSchema, createAuthRuntimeMiddleware(), logger (+12 more)

### Community 2 - "Dotenv"

Cohesion: 0.06
Nodes (31): dotenv, @electric-sql/pglite, express, express-session, passport, pg, pino, pino-pretty (+23 more)

### Community 3 - "Contracts"

Cohesion: 0.15
Nodes (22): Project, ProjectDocument, ProjectDocumentStatus, ProjectDocumentType, ProjectSourceType, ProjectStatus, ProjectWithDocuments, createDocument() (+14 more)

### Community 4 - "Bullmq"

Cohesion: 0.11
Nodes (17): bullmq, dependencies, bullmq, drizzle-orm, ioredis, shared, tslib, drizzle-orm (+9 more)

### Community 5 - "Community 5"

Cohesion: 0.11
Nodes (17): executor, options, outputs, {options.outputPath}, name, assets, main, outputPath (+9 more)

### Community 6 - "Ref"

Cohesion: 0.11
Nodes (17): libs/shared/\*.md, executor, options, outputs, {options.outputPath}, name, assets, main (+9 more)

### Community 7 - "Tsconfig Spec"

Cohesion: 0.12
Nodes (15): compilerOptions, module, moduleResolution, outDir, types, extends, include, jest (+7 more)

### Community 8 - "Tsconfig Spec"

Cohesion: 0.12
Nodes (15): compilerOptions, module, moduleResolution, outDir, types, extends, include, jest (+7 more)

### Community 9 - "Tsconfig"

Cohesion: 0.13
Nodes (14): compilerOptions, declaration, outDir, types, exclude, extends, include, jest.config.cts (+6 more)

### Community 10 - "Tsconfig"

Cohesion: 0.13
Nodes (14): compilerOptions, declaration, outDir, types, exclude, extends, include, jest.config.cts (+6 more)

### Community 11 - "Safe Insert"

Cohesion: 0.18
Nodes (8): isUniqueViolation(), safeInsert(), ErrorEnvelope, errorEnvelopeSchema, HttpError, httpResponse, ResponseEnvelope, responseEnvelopeSchema

### Community 12 - "Community 12"

Cohesion: 0.17
Nodes (11): accountMemberships, accounts, apiKeys, asyncJobs, authVerificationChallenges, projectDocuments, projects, userActivationMilestones (+3 more)

### Community 13 - "Tsconfig"

Cohesion: 0.25
Nodes (7): compilerOptions, module, extends, files, include, ../../tsconfig.base.json, references

### Community 15 - "Tsconfig"

Cohesion: 0.25
Nodes (7): compilerOptions, module, extends, files, include, ../../tsconfig.base.json, references

### Community 16 - "Building"

Cohesion: 0.60
Nodes (5): Building, Jest, Nx, projects library, Unit tests

### Community 17 - "Building"

Cohesion: 0.60
Nodes (5): Building, Jest, Nx, shared library, Unit tests

## Knowledge Gaps

- **137 isolated node(s):** `name`, `version`, `private`, `type`, `main` (+132 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `PostgresSessionStore` connect `Session Postgressessionstore` to `Community 1`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `HttpError` connect `Safe Insert` to `Community 0`, `Contracts`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `getProject()` (e.g. with `mapDocument()` and `mapAsyncJob()`) actually correct?**
  _`getProject()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _137 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.1268939393939394 - nodes in this community are weakly interconnected._
- **Should `Dotenv` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._
