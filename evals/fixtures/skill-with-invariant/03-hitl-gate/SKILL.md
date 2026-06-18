---
name: hitl-gate-example
description: Terminal advance is gated by first-class CLI HITL state.
contributes:
  workflows: ./workflows
---

# HITL gate

The workflow definition marks `staged -> published` with `defaultGate: hitl`.
The CLI owns that gate: an advance attempt creates an open gate token, the
agent asks the human for approval, `ix-flow ack` records the approval, and
the next advance completes the transition.

## Driving this skill

Always pass `--json` to every `ix-flow` command. After every write, read
`next_actions` and run the command it gives you. If an advance returns
`state: "gate_deferred"`, ask the human for approval in plain English, then
run the provided ack command with the human as reviewer and their response as
the note.
