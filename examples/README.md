# Examples

## `release`

A minimal, runnable workflow showing the pattern: a **flow** (`def.yaml`) plus the **skill**
(`SKILL.md`) an agent follows to run it. The flow goes `draft → in_review → approved`; the
first transition is automatic, the second is a human gate.

Layout:

```
release/
  SKILL.md                      # how the agent drives the flow
  workflows/
    release/
      def.yaml                  # the flow definition
```

An agent runs it with `ix-flow`:

```bash
ix-flow run release --path examples/release
ix-flow advance <run-id> in_review
ix-flow advance <run-id> approved          # pauses for human approval; prints the token
ix-flow ack <run-id> <token> --reviewer alice
ix-flow advance <run-id> approved          # phase: approved
```

See [`../docs/usage.md`](../docs/usage.md) to author your own flow and skill.
