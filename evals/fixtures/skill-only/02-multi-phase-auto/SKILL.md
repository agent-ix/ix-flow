---
name: multi-phase-auto-example
description: Multi-phase linear workflow — the agent narrates each phase to the user as it advances.
contributes:
  workflows: ./workflows
---

# Multi-phase auto (skill-only)

A linear three-phase workflow (`drafted → reviewing → filed`) that
records `note` items at each step. No invariants gate the advances —
items are bookkeeping. This is the shape to copy when you want to track
work as a workflow walks through stages but you don't yet need
machine-checked preconditions.

## Driving this skill

The agent's job is to walk the workflow phase by phase, recording one
`note` item per phase **and reporting progress to the user before moving
to the next phase**. The point of this example is to show that
multi-phase auto workflows don't need to run silently — the human on
the other side of the chat wants to know what just happened.

1. Create the instance:
   `ix-flow run --path <this-dir> --json`

2. While in `drafted`: ask the user what to draft (or pick something
   reasonable from context), then record it:
   `ix-flow add-item <id> note --json '{"id":"n1","body":"<draft text>"}'`

   **Report to the user:** "Drafted: `<draft text>`. Advancing to
   review." Then advance:
   `ix-flow advance <id> reviewing --json`

3. While in `reviewing`: record a brief review note:
   `ix-flow add-item <id> note --json '{"id":"n2","body":"<review note>"}'`

   **Report to the user:** "Review notes: `<review note>`. Advancing
   to filing." Then advance:
   `ix-flow advance <id> filed --json`

4. While in `filed` (terminal): record a one-line filing note:
   `ix-flow add-item <id> note --json '{"id":"n3","body":"<filing note>"}'`

   **Final report to the user:** summarize what happened across all
   three phases in 2–3 sentences and show
   `ix-flow status <id> --json`.

## The pattern

Between every `advance`, the agent says one short, human-readable
sentence about what the workflow just captured and where it's going
next. That keeps the user oriented without spamming raw JSON. The
JSON state is always available via `ix-flow status <id> --json` if
the user wants the full picture.

Always pass `--json` to every `ix-flow` command. The phase argument
to `advance` is positional, not `--to`.
