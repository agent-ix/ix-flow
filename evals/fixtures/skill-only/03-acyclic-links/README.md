# `skill-only/03-acyclic-links`

Adds nodes and links between them; the terminal advance is gated by the
core `acyclic` invariant. Demos the only core invariant that a CLI-only
user can drive to fail and recover.

## What this example demos

- `linkSchemas` declaration
- `link-items` command (appends a link record to `instance.links`)
- A core invariant (`acyclic`) referenced from `def.yaml` with no
  `scripts/invariants.js`
- A transition that **fails** with `transition_invariant_failed` before
  recovery, then **passes** after the cycle is gone

## Files

```text
03-acyclic-links/
  SKILL.md
  workflows/
    build-graph/
      def.yaml
```

## Walkthrough

```sh
# 1. Create.
ix-flow run --path examples/skill-only/03-acyclic-links
# → phase="building"

# 2. Three nodes.
ix-flow add-item <wf-id> node '{"id":"a","label":"A"}'
ix-flow add-item <wf-id> node '{"id":"b","label":"B"}'
ix-flow add-item <wf-id> node '{"id":"c","label":"C"}'

# 3. Build a DAG: a → b, b → c.
ix-flow link-items <wf-id> '{"relation":"depends","from":"a","to":"b"}'
ix-flow link-items <wf-id> '{"relation":"depends","from":"b","to":"c"}'

# 4. Advance — passes (no cycle).
ix-flow advance <wf-id> validated
# → phase="validated"

ix-flow verify <wf-id>
# → ok=true
```

## Failure case (drive the invariant to fail)

Repeat steps 1–3, then:

```sh
# Introduce a cycle: c → a.
ix-flow link-items <wf-id> '{"relation":"depends","from":"c","to":"a"}'

ix-flow advance <wf-id> validated
# → ok=false
# → error.code="transition_invariant_failed"
# → error.details.invariantCode="dependency_cycle"
```

There is no `unlink-items` command — to recover in a real session you'd
either create a fresh instance or model the cycle removal at the
application layer. The failure case above is the demonstration; the
happy walkthrough above it stands on its own.

## How the `acyclic` invariant reads links

Defined in `src/workflow-core/invariants.ts`. For each entry in
`instance.links`, it pulls `from` (or falls back to `source`) and `to`
(or `target`), builds an adjacency map, and runs an iterative DFS for
cycles. Any record without string `from`/`to` (or `source`/`target`) is
skipped silently — so non-graph link records do not interfere.

## Next

[`skill-with-invariant/01-item-exists`](../../skill-with-invariant/01-item-exists)
— write your first custom invariant.
