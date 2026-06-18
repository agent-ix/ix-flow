---
name: basic-render-example
description: Minimal artifactTemplates declaration — phase-entry renders one Markdown file from a template with variable substitution. Demonstrates FR-017, FR-018, FR-019.
contributes:
  workflows: ./workflows
---

# 01 — Basic Render

Smallest possible templating workflow. Two phases (`drafting`, `rendered`).
On entry to `rendered` the engine renders `templates/notes.md` to
`out/notes-${instance.id}.md` with variable substitution.

When an agent runs this skill:

1. `ix-flow run --path <this-dir> --json`
2. `ix-flow advance <id> rendered --json`
3. Stop. The rendered file is at the path reported in
   `data.artifacts[0].path`.
