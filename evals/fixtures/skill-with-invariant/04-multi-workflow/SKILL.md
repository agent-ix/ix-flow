---
name: multi-workflow-example
description: One skill ships two related workflows; the user disambiguates by passing the workflow name positionally to `run --path`.
contributes:
  workflows: ./workflows
---

# Multi-workflow (skill-with-invariant)

A skill that contributes two workflows from the same directory. When
multiple definitions live under `workflows/`, you must pick one
explicitly when creating an instance:

```sh
ix-flow run --path examples/skill-with-invariant/04-multi-workflow report
ix-flow run --path examples/skill-with-invariant/04-multi-workflow publish
```

Both workflows share a single `scripts/invariants.js`. Invariant names
are shared across all workflows in the skill — pick names like
`report.has_findings` and `publish.has_target` to avoid collisions.
