---
name: variant-selection-example
description: Template variant chosen at render time from an item field (component_type). Demonstrates FR-019 variant resolution.
contributes:
  workflows: ./workflows
---

# 04 — Variant Selection

The agent adds a `component` item that declares `component_type`. The
template's `variant` field is `templates/${item.component_type}`, so
the renderer reads from `templates/fastapi-service/spec.md` or
`templates/react-lib/spec.md` depending on the recorded item. When no
matching variant ships, the template falls back to `templates/default/`.

Run:

1. `ix-flow run --path <this-dir> --json`
2. `ix-flow add-item <id> component '{"id":"c1","component_type":"fastapi-service"}' --json`
3. `ix-flow advance <id> rendered --json`

Re-create with a different `component_type` to see the other variant
selected.
