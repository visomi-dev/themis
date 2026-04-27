# PRD: First-Run Activation

## Purpose

Replace step-by-step onboarding with a single first-run activation flow that gets a newly authenticated user to a working Themis setup with the fewest possible actions.

The flow should help the user:

- create an API key
- connect OpenCode through MCP
- copy a seed prompt to initialize project context inside Themis
- enter the real product surface without being trapped in a tutorial

## Problem

Traditional onboarding steps are usually skipped, especially by technical users who already know what they want to do.

For Themis, the real value starts when the user's local workspace can talk to the platform and seed initial project context. A tour or wizard adds friction before that value is reached.

## Goal

Make the first authenticated experience feel operational instead of instructional.

The product should move the user from "I signed in" to "my workspace is connected" in one screen.

## Users

### Primary Users

- software engineers
- technical leads
- solo builders
- AI-native users already working inside editors and terminals

### Secondary Users

- product-minded collaborators setting up a workspace for later agent use

## Product Principle

The onboarding replacement should follow KISS.

That means:

- one screen instead of a multi-page wizard
- action-oriented setup instead of explanatory slides
- immediate copy-and-paste utilities instead of abstract education
- skippable flow instead of a hard gate

## User Story

As a newly authenticated user, I want to connect my local tooling to Themis quickly so I can seed my project context and start using the platform without sitting through onboarding steps.

## Scope

### In Scope

- first-run activation screen shown after successful auth
- API key creation and one-time reveal UX
- MCP connection instructions for OpenCode
- copyable MCP configuration snippet
- copyable seed prompt for first project import or analysis
- lightweight completion tracking for activation milestones
- ability to skip and reach the app anyway

### Out of Scope

- guided tours
- interactive product walkthroughs
- multi-step tooltip onboarding
- automatic local MCP verification from the browser
- importing repository contents directly from the frontend in V1
- organization-wide admin provisioning flows

## Success Criteria

The first-run flow is successful if:

- a new user can complete setup from a single screen
- users reach API key creation at a high rate after first auth
- users copy the MCP snippet and seed prompt without needing extra docs
- users who skip activation can still access the product cleanly
- the activation flow produces measurable milestones instead of vague onboarding completion

## Primary Experience

### Entry Condition

The user has:

- completed sign-up plus email verification, or
- completed sign-in plus email verification

After authentication, Themis decides whether the user should see the first-run activation screen.

### First-Run Screen

The page should present a single setup surface with three compact sections:

1. Create API key
2. Connect OpenCode through MCP
3. Seed your project

Each section should include:

- concise explanation
- exact action to take
- copyable output where relevant
- completion state when finished

### Exit Paths

The user can:

- complete all setup tasks
- complete some tasks and continue later
- skip setup and enter the product

The activation screen should be easy to revisit from settings or workspace setup surfaces.

## Functional Requirements

### 1. API Key Creation

The activation screen must allow the user to create a personal API key.

Requirements:

- create key from the activation page
- reveal the full plaintext secret only once
- allow immediate copy
- display a stable label or identifier for the created key
- show key created state after reveal is dismissed

### 2. MCP Setup

The system must generate a ready-to-copy MCP configuration snippet for the authenticated user.

Requirements:

- show exact JSON or config snippet needed for OpenCode
- reference the user API key in the snippet
- keep the config minimal and explicit
- provide copy action
- allow the user to mark the step as done without browser-side validation

### 3. Seed Prompt

The system must provide a ready-to-copy prompt that helps the user initialize project context in Themis.

Requirements:

- keep the prompt concise and operational
- orient the agent toward repository analysis and project setup
- support immediate copy
- allow the prompt to vary later based on workspace or product context

### 4. Progress Tracking

The system must track activation milestones.

Initial milestones:

- `api_key_created`
- `mcp_config_copied`
- `mcp_marked_connected`
- `seed_prompt_copied`
- `activation_skipped`

These milestones are product analytics and workflow signals, not blockers.

### 5. Skip Behavior

The flow must never fully block product access.

Requirements:

- provide a visible skip action
- preserve partial completion state
- allow returning later through a persistent entry point

## UX Requirements

The first-run experience should feel:

- calm
- technical
- lightweight
- precise
- free of marketing language

The page should avoid:

- carousel patterns
- educational empty prose
- celebratory setup theater
- more than one screen before product access

## Frontend Requirements

The Angular app should:

- treat activation as a route-level product page
- fetch first-run state from the API
- render API key, MCP, and seed prompt sections in one layout
- support asynchronous copy and completion feedback with signals
- preserve a mobile-friendly stacked layout with desktop enhancement

## Backend Requirements

The backend should:

- decide whether activation should be shown for the current user
- create and persist API keys securely
- expose a sanitized activation status payload
- emit server-trusted milestone events when applicable
- generate seed prompt and config payloads without exposing internal secrets beyond the one-time key reveal

## Metrics

Recommended launch metrics:

- authenticated users who see activation
- activation skip rate
- API key creation rate
- MCP snippet copy rate
- seed prompt copy rate
- time from first auth to first API key creation
- time from first auth to first project seed event

## Risks

- users may not understand MCP if the copy is too abstract
- browser-only tracking could overstate completion if not backed by server events
- showing the API key at the wrong moment could create security confusion
- a forced activation gate would recreate the same onboarding friction this flow is meant to remove

## Open Questions

- should every user get exactly one default seed prompt, or should it vary by selected project type?
- should MCP setup support multiple clients beyond OpenCode in the same screen or stay narrowly optimized for one client first?
- should API key creation be mandatory before entering the product for the first time, or only strongly encouraged?

## Recommended V1 Answer

For V1:

- optimize for OpenCode only
- keep one default seed prompt
- make API key creation the primary action but keep the flow skippable
- use milestone tracking instead of a hard onboarding state machine
