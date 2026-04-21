# Stitch Prompt Set: Project Foundation UI

Use these prompts to explore the first meaningful product surfaces for Themis.

The output should preserve the existing Themis design system and avoid generic dashboard UI.

## Prompt 1: First-Run Activation

Design only the page content for the first-run activation screen of Themis after authentication.

Do not include the application shell, sidebar navigation, or header bar. Only the main page area and its content blocks.

Focus on a single calm setup page instead of a step-by-step onboarding wizard.

The page must include:

- API key creation
- OpenCode MCP setup instructions
- a copyable seed prompt for initializing the user's project in Themis
- a continue or skip path into the product

The screen should feel technical, minimal, and operational. It should feel like configuring infrastructure, not reading a tutorial.

Avoid:

- carousels
- celebratory setup illustrations
- generic empty-state marketing language
- loud KPI cards
- shell chrome such as topbars, sidebars, or nav menus

## Prompt 2: Projects Overview

Design only the page content for the projects-first home screen of Themis.

Do not include the application shell, sidebar navigation, or header bar. Only the main page area and its content blocks.

The screen should help a user scan multiple active software projects without feeling like a noisy project management dashboard.

Show for each project:

- name
- short summary
- state
- last updated signal
- one meaningful snippet such as architecture summary or next step

The screen should feel like a calm operational briefing.

Avoid:

- heavy analytics framing
- dense metric tiles
- generic enterprise dashboard composition
- shell chrome such as topbars, sidebars, or nav menus

## Prompt 3: Project Detail

Design only the page content for the main project detail page of Themis.

Do not include the application shell, sidebar navigation, or header bar. Only the main page area and its content blocks.

This page should act as the source of truth for one software project.

Include:

- project title and summary
- current project context such as stack, architecture, commands, and environment assumptions
- recent documents
- recent decisions
- recommended next steps

The page should feel editorial and technical, with strong reading flow and low visual noise.

Avoid:

- turning it into a widget board
- shell chrome such as topbars, sidebars, or nav menus

## Prompt 4: Project Document Detail

Design only the page content for a project document detail screen in Themis.

Do not include the application shell, sidebar navigation, or header bar. Only the main page area and its content blocks.

This screen should render markdown-backed technical documentation in a way that feels native to the product.

Include:

- document title
- document type
- update metadata
- rendered content
- navigation back to the project

The design should feel like a technical manuscript inside an application, not a blog page.

Avoid:

- blog-style article layouts
- decorative card frames
- shell chrome such as topbars, sidebars, or nav menus

## Shared Constraints

- preserve the Themis light and dark visual language
- use calm tonal hierarchy instead of obvious bordered cards everywhere
- prefer structured layouts over decorative UI
- ensure mobile and desktop both feel intentional
- avoid AI-slop dashboard patterns
