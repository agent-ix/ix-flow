# Examples

## `release`

A complete, runnable workflow: a **flow** (`def.yaml`) plus the **skill** (`SKILL.md`) the
agent follows to run it. The flow goes `draft → in_review → approved`, with the final step
gated on human approval.

```
release/
  SKILL.md                      # how the agent runs the flow
  workflows/
    release/
      def.yaml                  # the flow definition
```

Make the skill available to your agent, then ask it to run the workflow. The agent creates
the run, advances it through the phases, and pauses at the gate for your approval before
reaching `approved`.

See [`../docs/usage.md`](../docs/usage.md) to author your own flow and skill.
