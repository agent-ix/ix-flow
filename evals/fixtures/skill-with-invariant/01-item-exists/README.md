# `skill-with-invariant/01-item-exists`

The smallest custom invariant: a transition that blocks until at least
one item of a given type exists.

## What this example demos

- `scripts/invariants.js` — the ESM module shape `loadSkill` expects
- Referencing a custom invariant name from `def.yaml`
- `transition_invariant_failed` with a structured invariant code
- Recovering from a failed advance by adding the missing item

## Files

```text
01-item-exists/
  SKILL.md
  workflows/
    greet/
      def.yaml
  scripts/
    invariants.js
```

## Walkthrough

```sh
# 1. Create.
ix-flow run --path examples/skill-with-invariant/01-item-exists
# → phase="greeted"

# 2. Try to advance — the invariant blocks because no greeting exists.
ix-flow advance <wf-id> done
# → ok=false
# → error.code="transition_invariant_failed"
# → error.details.invariantCode="greeting_required"

# 3. Add the missing item.
ix-flow add-item <wf-id> greeting '{"id":"g1","message":"hello, world"}'

# 4. Advance succeeds.
ix-flow advance <wf-id> done
# → phase="done"

# 5. Audit.
ix-flow verify <wf-id>
# → ok=true
```

## How the invariant resolves

At advance time, the runner composes the invariant set in this order
(`src/workflow-runner/runner.ts → composeInvariants`):

1. `workflow.invariants` — what this skill's `scripts/invariants.js`
   exports
2. `coreInvariants` — `acyclic`, `no_open_questions` from
   `@agent-ix/workflow-core` (these override same-name skill entries; a
   skill cannot shadow a core predicate)
3. Test-only host overrides (not used in production)

`greeting.exists` isn't a core name, so the skill-exported function is
what runs.

## Common authoring mistakes

- Returning the literal string `"true"` to pass — return boolean `true`
  or `undefined` for success.
- Throwing instead of returning `{ ok: false, code, details }` —
  exceptions surface as a generic `workflow_command_failed`, losing the
  routable invariant code.
- Referencing an invariant in `def.yaml` that isn't exported by
  `scripts/invariants.js` — fails at advance time with
  `transition_invariant_unregistered`, not at load time. Always test
  every gated transition.

## Next

[`02-item-field-shape`](../02-item-field-shape) — invariant that walks
each item's fields.
