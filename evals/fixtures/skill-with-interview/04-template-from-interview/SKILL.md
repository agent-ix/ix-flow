---
name: template-from-interview-example
description: Integration of interviews and templates — interview answers drive frontmatter and body of a generated artifact. Demonstrates FR-017..025 end-to-end.
contributes:
  workflows: ./workflows
---

# 04 — Template From Interview

Integration example. Phase 1 collects discovery answers via an
interview. Entering phase 2 renders an FR-style artifact whose
frontmatter and body pull values from the persisted answer item.

<!-- interview: discovery -->

Question bank:

- **`title`** *(text, required)* — Short title for the FR.
- **`statement`** *(text, required)* — One-sentence requirement statement.

## Run

1. `ix-flow run --path <this-dir> --json`
2. `ix-flow record-answers <id> discovery --answers '{"title":"Validate inputs","statement":"The system SHALL validate every CLI argument."}' --json`
3. `ix-flow advance <id> rendered --json` — gates on
   `interview.complete:discovery`, then renders
   `out/FR-${instance.id}.md` from the template using the recorded
   answers as variables.
