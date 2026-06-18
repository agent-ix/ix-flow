# `skill-only/01-helloworld`

The smallest workflow you can ship as a skill.

## What this example demos

- `SKILL.md` frontmatter (`contributes.workflows`)
- A single `def.yaml` under `workflows/<name>/`
- One auto-gated transition with no invariants
- The four "always available" commands: `run`, `advance`, `history`,
  `verify`

## Files

```text
01-helloworld/
  SKILL.md
  workflows/
    helloworld/
      def.yaml
```

No `scripts/`. No invariants. No items, links, or artifacts.

## Walkthrough

Run from the repo root.

```sh
# 1. Create an instance.
ix-flow run --path examples/skill-only/01-helloworld
# → ok=true, summary.defName="helloworld", summary.phase="start"
#   summary.id=<wf-id>  ← copy this

# 2. Advance to terminal.
ix-flow advance <wf-id> done
# → ok=true, summary.phase="done"

# 3. See the event log (2 events: workflow.created, phase.advanced).
ix-flow history <wf-id>

# 4. Confirm the SHA256 event chain is intact.
ix-flow verify <wf-id>
# → ok=true
```

## What can go wrong

- Try to advance to a phase the workflow doesn't define
  (`ix-flow advance <wf-id> nope`):
  → `transition_not_found`.
- Try to advance from `done` (the terminal phase): there are no outgoing
  transitions, so any target phase fails with `transition_not_found`.

## Next

[`02-multi-phase-auto`](../02-multi-phase-auto) — add items and walk a
multi-phase flow.
