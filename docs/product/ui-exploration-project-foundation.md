# UI Exploration: Project Foundation

## Purpose

Explore the first meaningful product UI for Themis after authentication and first-run activation.

The goal is not to design every screen.

The goal is to validate whether the product feels aligned when organized around:

- projects
- project context
- documentation
- decisions

## Product Question

Before building the full task system, what is the smallest interface that makes Themis feel like a serious developer workspace instead of a generic dashboard?

## Proposed Answer

The first product surface should be project-first, not dashboard-first.

Recommended core screens for exploration:

1. first-run activation
2. projects overview
3. project detail
4. project document detail

This gives enough surface area to evaluate the product idea while keeping the UI disciplined.

## UX Principles

The interface should feel:

- calm
- exact
- technical
- structured
- quiet by default

The interface should avoid:

- noisy KPI grids
- gamified onboarding energy
- generic PM dashboard patterns
- empty visual chrome without operational value

## Screen 1: First-Run Activation

### Purpose

- connect the user's local workflow to Themis quickly
- help the user create an API key
- help the user configure OpenCode MCP
- help the user copy a seed prompt

### What The Screen Should Feel Like

- one setup surface
- low-friction
- copy-and-paste friendly
- more like infrastructure setup than onboarding theater

### Key Content Blocks

- page heading and concise explanation
- API key creation card
- MCP config card
- seed prompt card
- continue or skip action

### UI Notes

- the main action should be API key creation
- code blocks should feel first-class and easy to copy
- completion indicators should be lightweight, not celebratory

## Screen 2: Projects Overview

### Purpose

- orient the user across projects
- surface project state without becoming a metrics dashboard
- provide the main entry into project detail

### What The Screen Should Show

- project name
- short summary
- current state
- last updated signal
- one strong context snippet such as next step or architecture summary

### Preferred Layout Direction

- list or structured board of projects
- stronger editorial hierarchy than dashboard-card repetition
- search and filter can exist, but should not dominate the layout

### Why This Matters

If this screen works, Themis feels like a system of record for active projects instead of a loose note-taking tool.

## Screen 3: Project Detail

### Purpose

- become the primary source of truth for one project
- blend structured metadata with readable narrative context
- give both humans and agents a stable place to understand the project

### What The Screen Should Show

- project header with name, summary, and status
- context section with stack, architecture, commands, and environment assumptions
- documentation section with recent documents
- decisions section with recent project decisions
- next recommended actions

### Preferred Layout Direction

- editorial page, not widget dashboard
- left-to-right or top-to-bottom hierarchy that reads naturally
- sections should use tonal surface changes, not hard border grids

### Important Product Test

If this page feels useful before tasks exist, then the project model is strong enough to justify the direction.

## Screen 4: Project Document Detail

### Purpose

- make documentation feel native to the product
- support reading and later editing of markdown-backed content
- prove that long-form context can coexist with structured product data

### What The Screen Should Show

- document title
- document type
- updated timestamp
- markdown content rendered cleanly
- related project navigation

### UI Notes

- this should feel like a technical manuscript, not a blog article
- typographic rhythm matters more than decorative framing
- side metadata should remain secondary to the document body

## Navigation Direction

Recommended initial navigation model:

- `Projects`
- `Docs`
- `Activation` or `Setup` when relevant

Optional later additions:

- `Today`
- `Tasks`
- `Decisions`

The first UI pass should not pretend all product areas already exist.

## Information Hierarchy

Recommended hierarchy for early product views:

1. project identity
2. current understanding of the project
3. durable documentation
4. decisions
5. later task execution details

This order matters because Themis should first know what a project is before it tries to manage every unit of work inside it.

## Visual Direction

Use the existing Themis visual system:

- calm surfaces
- tonal hierarchy instead of hard cards everywhere
- Manrope for display moments
- Inter for dense operational text
- low-noise controls

The product should feel closer to a developer operating notebook than a startup analytics tool.

## Mobile And Desktop

On mobile:

- stack sections vertically
- keep actions full-width where appropriate
- prioritize reading flow over side panels

On desktop:

- use width for context grouping
- allow secondary navigation or metadata rails only when they help scanning
- avoid overfilling the page with parallel panels

## What To Validate In Design Exploration

- does activation feel simpler than a step-by-step onboarding?
- does the projects overview feel calmer than a dashboard?
- does the project detail page feel like a trustworthy system of record?
- does the document view make markdown-backed content feel native to Themis?

## Recommended Review Outcome

After reviewing these screens, we should be able to answer:

- is project-first clearly the right entry point?
- does the documentation-heavy direction feel like the product you want?
- should the next implementation step be data model first, UI first, or both in parallel?
