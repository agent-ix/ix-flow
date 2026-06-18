# `skill-with-invariant/04-multi-workflow`

A skill that contributes more than one workflow from the same
directory. Demos the positional workflow-name argument to
`run --path`.

## What this example demos

- Two `def.yaml` files under one skill's `workflows/`
- The `workflow_ambiguous` error when `--path` is used without picking
  one
- The positional argument form: `ix-flow run --path <dir> <name>`
- One `scripts/invariants.js` shared across all workflows in the skill
- Namespacing invariant names per-workflow to avoid collisions
  (`report.has_findings`, `publish.has_target`)

## Files

```text
04-multi-workflow/
  SKILL.md
  workflows/
    report/
      def.yaml      # name: report
    publish/
      def.yaml      # name: publish
  scripts/
    invariants.js   # both workflows' predicates
```

## Walkthrough

### Ambiguity first

```sh
ix-flow run --path examples/skill-with-invariant/04-multi-workflow
# → ok=false
# → error.code="workflow_ambiguous"
# → error.details.available=["report","publish"]
```

### Pick `report`

```sh
ix-flow run --path examples/skill-with-invariant/04-multi-workflow report
# → phase="collecting"

ix-flow advance <wf-id> closed
# → blocked: "Add at least one finding before closing the report."

ix-flow add-item <wf-id> finding '{"id":"f1","text":"DB connection pool exhausted"}'

ix-flow advance <wf-id> closed
# → phase="closed"
```

### Pick `publish` (separate instance)

```sh
ix-flow run --path examples/skill-with-invariant/04-multi-workflow publish
# → phase="drafted"

ix-flow advance <wf-id> published
# → blocked: "Set a target before publishing."

ix-flow add-item <wf-id> target '{"id":"t1","url":"https://example.com/v1"}'

ix-flow advance <wf-id> published
# → phase="published"
```

Both `verify` calls return `ok=true`.

## Notes on shared invariants

`loadSkill` reads exactly one `scripts/invariants.js` per skill, so all
workflows in the skill share the same predicate dictionary. That means:

- Invariant names are global to the skill — `report.has_findings` and
  `publish.has_target` could both be named `has_items`, but then a typo
  in one workflow would silently match the other's predicate. Namespace
  them.
- A predicate can read items/links/artifacts agnostic of which workflow
  is calling it. Keep predicates small; if you find them branching on
  `instance.defName`, consider splitting the skill.

## End of the example series

You've now seen every primitive the workflow engine exposes. To compose
these patterns into a real skill, copy the example closest to your use
case and edit. The top-level
[`README.md`](../../../../README.md#author-a-workflow) covers
authoring conventions; the engine source lives in
`src/workflow-core/`.
