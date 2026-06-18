# `skill-only/02-multi-phase-auto`

A linear three-phase workflow that records items as it goes. Items are
bookkeeping — no invariant requires them, so advances always pass.

## What this example demos

- A linear multi-phase flow (`drafted` → `reviewing` → `filed`)
- `itemSchemas` declaration (the engine stores the shape; nothing enforces
  it at runtime in this example, that's where invariants come in)
- `add-item` and `update-item`
- `defaultGate: auto` everywhere

## Files

```text
02-multi-phase-auto/
  SKILL.md
  workflows/
    intake/
      def.yaml
```

## Walkthrough

```sh
# 1. Create.
ix-flow run --path examples/skill-only/02-multi-phase-auto
# → phase="drafted", id=<wf-id>

# 2. Add a note.
ix-flow add-item <wf-id> note '{"id":"n1","body":"initial draft"}'

# 3. Walk to "reviewing" (auto, no invariants — always passes).
ix-flow advance <wf-id> reviewing
# → phase="reviewing"

# 4. Revise the note.
ix-flow update-item <wf-id> note n1 '{"body":"revised after review"}'

# 5. File it.
ix-flow advance <wf-id> filed
# → phase="filed"

# 6. Audit.
ix-flow status <wf-id>
ix-flow verify <wf-id>
# → ok=true
```

## What can go wrong

- `add-item` with an item missing `id`: `item_id_required`.
- `add-item` re-using an `id` already present in the same type:
  `item_already_exists`.
- `update-item` for an `id` that doesn't exist: `item_not_found`.

These are engine-level checks, not invariants — they fire regardless of
the definition's `itemSchemas`.

## Caveat

`itemSchemas` in this example is decorative — it documents the intended
shape but the engine does not validate items against it. To enforce
shape, declare a custom invariant; see
[`skill-with-invariant/02-item-field-shape`](../../skill-with-invariant/02-item-field-shape).

## Next

[`03-acyclic-links`](../03-acyclic-links) — use the core `acyclic`
invariant to actually gate an advance.
