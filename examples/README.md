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

## `intake`

A workflow with a **human gate replaced by a structured interview**. The flow goes
`collecting → drafting → done`; the first transition is gated on the `request` interview, so
the agent records a title and summary before it can advance. It also declares a `finish`
recipe.

```
intake/
  SKILL.md
  workflows/
    intake/
      def.yaml                  # interview-gated flow with a recipe
```

Ask your agent to run it; it conducts the interview, records the answers, advances past the
interview gate, and finishes.

See [`../docs/guide.md`](../docs/guide.md) to author your own flow and skill.
