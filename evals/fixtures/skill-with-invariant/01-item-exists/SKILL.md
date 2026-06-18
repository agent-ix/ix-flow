---
name: item-exists-example
description: Custom invariant requires at least one greeting before advancing.
contributes:
  workflows: ./workflows
---

# Item exists (skill-with-invariant)

Smallest custom invariant: `greeting.exists` requires at least one
`greeting` item before `greeted → done` is allowed.

The skill ships its predicate in `scripts/invariants.js`. The engine
loads the file at `loadSkill` time and looks up `greeting.exists` by
name when the gated transition is attempted.
