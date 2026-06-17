# Examples

## `release`

A minimal, runnable workflow: `draft → in_review → approved`. The first transition is
automatic; the second is a human-in-the-loop gate.

Layout:

```
release/
  SKILL.md                      # declares contributes.workflows: ./workflows
  workflows/
    release/
      def.yaml                  # the workflow definition
```

Run it end-to-end against a throwaway state dir:

```bash
ix-flow run release --path examples/release --state-dir /tmp/flow
ix-flow advance <run-id> in_review --state-dir /tmp/flow
ix-flow advance <run-id> approved --state-dir /tmp/flow          # gate_deferred; prints the token
ix-flow ack <run-id> <token> --reviewer me --state-dir /tmp/flow
ix-flow advance <run-id> approved --state-dir /tmp/flow          # phase: approved
ix-flow history <run-id> --state-dir /tmp/flow
```

See [`../docs/usage.md`](../docs/usage.md) to author your own workflow.
