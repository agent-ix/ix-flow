# `skill-with-invariant/02-item-field-shape`

A custom invariant that walks every item of a type and asserts a field
constraint on each one. The "real-world" shape — most production
invariants look like this.

## What this example demos

- Per-item field validation in an invariant
- A structured invariant failure that names the offending items
- Using `update-item` to satisfy the invariant (item already exists; you
  patch it rather than re-create)
- Two-phase advance where one transition is gated and one is free

## Files

```text
02-item-field-shape/
  SKILL.md
  workflows/
    triage/
      def.yaml
  scripts/
    invariants.js
```

## Walkthrough

```sh
# 1. Create.
ix-flow run --path examples/skill-with-invariant/02-item-field-shape
# → phase="collecting"

# 2. Two reports — only one has a summary.
ix-flow add-item <wf-id> report \
  '{"id":"r1","title":"Login outage","summary":"DB connection pool exhausted"}'
ix-flow add-item <wf-id> report '{"id":"r2","title":"Stale cache"}'

# 3. Try to advance — invariant names r2 as the offender.
ix-flow advance <wf-id> summarized
# → ok=false
# → error.details.invariantCode="report_summary_missing"
# → error.details.invariantDetails.item_ids=["r2"]

# 4. Patch r2.
ix-flow update-item <wf-id> report r2 \
  '{"summary":"CDN TTL set too high, refresh on deploy"}'

# 5. Advance — passes now.
ix-flow advance <wf-id> summarized
# → phase="summarized"

# 6. Free advance to the terminal phase.
ix-flow advance <wf-id> closed
# → phase="closed"

ix-flow verify <wf-id>
# → ok=true
```

## Empty-collection guard

The invariant also fails with `report_required` when there are _no_
report items at all. That's a common pattern: many invariants need to
reject the empty case
explicitly, because "all of an empty set satisfy P" is vacuously true
and usually not what you want for a workflow gate.

## Next

[`03-hitl-gate`](../03-hitl-gate) — gate a transition
on a human ack instead of on item state.
