# Themis Agent Distribution

`.opencode` is the canonical source for Themis agent resources. This directory
is the portable distribution facade and should contain relative symbolic links
to the canonical files rather than duplicate content.

Install the core profile into a project with:

```bash
npx @visomi/themis add core
```

The manifest is consumed by the `themis-agent-cli` Nx application. Skills use
the portable `SKILL.md` format; agents, commands, and tools are runtime-aware
resources and currently target OpenCode or the generic `.agents` layout.
