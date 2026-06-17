# Authoring workflows

This guide is for authoring workflows. You write two things — a **flow** and a **skill** —
and your agent runs them by calling `ix-flow`.

## Model

- **Flow** — a workflow definition (`def.yaml`): phases, transitions, gates, invariants.
- **Skill** — a `SKILL.md` that tells the agent how to run a flow.
- **Run** — one live instance of a flow, addressed by a run id.
- **Phase** — a named state. A run is always in exactly one phase, starting at
  `initialPhase`. A phase marked `terminal` ends the run.
- **Transition** — a declared `from → to` edge the agent follows to move the run.
- **Invariant** — a named predicate checked before a transition commits; it must hold for
  the move to succeed.
- **Gate** — a transition's approval mode: `auto` commits immediately, `hitl` pauses for
  human approval.

## 1. Define the flow

A flow lives at `workflows/<name>/def.yaml`. Each subdirectory of `workflows/` with a
`def.yaml` is one flow, named by its `name:` field.

```yaml
name: release # flow name
version: 0.1.0 # definition version
description: Drive a change from draft to release.
initialPhase: draft # must be one of the phases below
phases:
  - { name: draft }
  - { name: in_review, hint: "Awaiting reviewer" } # hint is optional, advisory
  - { name: approved, terminal: true } # terminal ends the run
transitions:
  - from: draft
    to: in_review
    defaultGate: auto # auto | hitl | full-auto
    invariants: [] # names checked before the move
  - from: in_review
    to: approved
    defaultGate: hitl # pauses for human approval
```

Each construct shapes how the run behaves:

- **phases** — the run sits in exactly one; the agent moves between them.
- **transitions** — the legal moves; advancing to an undeclared phase is rejected.
- **defaultGate: hitl** — the move pauses until a human approves it.
- **invariants** — the move succeeds only when every listed predicate holds.
- **terminal** — reaching this phase ends the run.

Built-in invariants you can list under a transition's `invariants:`:

| Name                      | Holds when                                            |
| ------------------------- | ----------------------------------------------------- |
| `acyclic`                 | The run's item links contain no dependency cycle.     |
| `no_open_questions`       | The run has no unresolved open questions.             |
| `interview.complete:<id>` | Interview `<id>`'s required answers are all recorded. |

Add your own by exporting an `invariants` object from `scripts/invariants.js`:

```js
export const invariants = {
  my_check: ({ instance }) =>
    instance.items.report?.length > 0 || {
      ok: false,
      code: "report_missing",
    },
};
```

A definition is content-hashed on load, and a run is pinned to that hash; keep `def.yaml`
stable for the life of a run.

> `def.yaml` also supports `itemSchemas`, `linkSchemas`, `interviews`, `artifactTemplates`,
> and `recipes`, consumed by the workflow runtime. The `ix-flow` CLI itself covers phase
> advancement and gate acknowledgement (`run`, `advance`, `ack`, `status`, `history`).

## 2. Write the skill

`SKILL.md` is the agent's playbook. Its frontmatter points at the flow; its body tells the
agent how to run it.

```markdown
---
name: my-skill
description: What this skill does.
contributes:
  workflows: ./workflows
---

# /my-skill

Start from the run status and follow the reported next actions. Advance the run through its
phases, recording progress as you go, and stop at human gates until they are approved.
```

Lay the two files out together in a skill directory:

```
my-skill/
  SKILL.md
  workflows/
    <name>/
      def.yaml
  scripts/
    invariants.js               # optional custom invariants (ESM)
```

The agent invokes the skill and runs the flow with the commands below.

## Agent command reference

These are the commands your skill instructs the agent to call. Every command accepts
`--json` (which the agent uses to read structured output) and the global flags at the end.

### run

```bash
ix-flow run <flow> [--path <skill-dir>] [--id <id>] [--name <name>] [--target <ref>...]
```

Create a run. `<flow>` resolves a registered definition, or `--path` loads a skill
directory. `--id` sets the run id (otherwise a UUID), `--name` labels the run, and each
`--target` records a file the flow operates on.

### status / resume

```bash
ix-flow status <run-id>
ix-flow resume <run-id>
```

Report the current phase, open gates, and next actions. `resume` lets the agent pick a run
back up — for example in a new session — before continuing.

### advance

```bash
ix-flow advance <run-id> <phase>
```

Move the run into `<phase>`. A failed invariant holds the run in place and reports why. A
`hitl` gate pauses the run and reports the gate token:

```text
advance: gate_deferred
gate: ack_… (to approved)
next: ix-flow ack <run-id> ack_… --reviewer <user>
```

### ack

```bash
ix-flow ack <run-id> <token> [--reviewer <id>] [--kind <kind>] [--note <text>]
```

Record human approval for a paused gate, then `advance` again to complete the move.

### history

```bash
ix-flow history <run-id>
```

Print the run's event log (with `--json`, full event records and hashes).

## JSON output

With `--json`, every command returns the full result envelope. Key fields:

```jsonc
{
  "ok": true,
  "command": "advance",
  "instance_id": "<run-id>",
  "state": "gate_deferred", // ok | gate_deferred | invariant_failed | error | …
  "current_phase": "in_review",
  "open_gates": [{ "token": "ack_…", "from": "in_review", "to": "approved" }],
  "next_actions": [{ "command": "ix-flow ack …", "description": "…" }],
  "events": [
    /* appended events */
  ],
}
```

- `state` — outcome of the command; `gate_deferred` and `invariant_failed` mean the run
  stayed put.
- `current_phase` — the run's phase after the command.
- `open_gates[].token` — the value `ack` takes to clear a `hitl` gate.
- `next_actions` — suggested follow-up commands for the agent.

## State

Each run is one JSON file under `~/.ix/flows`, persisting across agent sessions so a run can
be resumed. To isolate a run (e.g. in tests), set `--state-dir <dir>`, or relocate the whole
`~/.ix` root with `--config-root <dir>`.
