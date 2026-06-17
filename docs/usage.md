# ix-flow usage

`ix-flow` is the lifecycle runner an agent calls to run a workflow. This guide covers the
model, how to author a flow and the skill that runs it, the command reference, and the JSON
output agents consume.

## Model

- **Flow** — a workflow definition (`def.yaml`): phases, transitions, gates, invariants.
- **Run** — one live instance of a flow, addressed by a run id.
- **Phase** — a named state. A run is always in exactly one phase, starting at
  `initialPhase`. A phase marked `terminal` ends the run.
- **Transition** — a declared `from → to` edge. The agent makes one with `advance`.
- **Invariant** — a named predicate checked before a transition commits. If it fails, the
  `advance` is rejected and the run stays put until the agent satisfies it.
- **Gate** — a transition's approval mode: `auto` commits immediately, `hitl` pauses for a
  human, recorded with `ack`.
- **Event log** — each run is an append-only, hash-chained list of events
  (`workflow.created`, `phase.advanced`, `gate.deferred`, `gate.acknowledged`, …).
  `history` prints it.

## Authoring: define a flow, then create a skill to run it

A flow and its skill ship together in a **skill directory**:

```
my-skill/
  SKILL.md                      # instructions the agent follows to run the flow
  workflows/
    <name>/
      def.yaml                  # the flow: phases, transitions, gates, invariants
  scripts/
    invariants.js               # optional custom invariants (ESM)
```

### 1. Define the flow

Each subdirectory of `workflows/` that contains a `def.yaml` is one flow, named by its
`name:` field.

```yaml
name: release # flow name (used by `ix-flow run <name>`)
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

Each construct maps to how the agent drives the run:

- **phases** — the run sits in exactly one; the agent moves between them with `advance`.
- **transitions** — the legal `advance` moves; advancing to an undeclared phase is rejected.
- **defaultGate: hitl** — `advance` pauses (`gate_deferred`); the agent must obtain an
  `ack` before advancing again.
- **invariants** — checked on `advance`; a failure blocks the move until the agent makes it
  hold.
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

A definition is content-hashed on load, and a run is pinned to that hash; editing
`def.yaml` mid-run is rejected as a definition mismatch.

> `def.yaml` also supports `itemSchemas`, `linkSchemas`, `interviews`, `artifactTemplates`,
> and `recipes`. These are consumed by the workflow runtime; the `ix-flow` CLI itself
> drives **phase advancement and gate acknowledgement** (`run`, `advance`, `ack`, `status`,
> `history`) — it does not record interview answers or run recipes.

### 2. Create the skill that runs it

`SKILL.md` is the agent's playbook. Its frontmatter points at the flow; its body tells the
agent how to drive the run.

```markdown
---
name: my-skill
description: What this skill does.
contributes:
  workflows: ./workflows
---

# /my-skill

Start from `ix-flow status` and follow the reported next actions. Advance through the
flow's phases, recording progress as you go. Stop at human gates and resume after an `ack`.
```

An agent invokes the skill and runs the flow with the commands below.

## Commands

All commands accept `--json` and the global flags below.

### run

```bash
ix-flow run <flow> [--path <skill-dir>] [--id <id>] [--name <name>] [--target <ref>...]
```

Create a run. Pass `<flow>` to resolve a registered definition, or `--path` to load a skill
directory. `--id` sets the run id (otherwise a UUID), `--name` labels the run, and each
`--target` records a file the flow operates on.

```bash
ix-flow run release --path examples/release
# create: ok
# run: <run-id>
# phase: draft
```

### status / resume

```bash
ix-flow status <run-id>
ix-flow resume <run-id>
```

Report the current phase, open gates, and next actions. `resume` is how an agent picks a
run back up — for example in a new session — before continuing.

### advance

```bash
ix-flow advance <run-id> <phase>
```

Make the transition into `<phase>`. If a required invariant fails, the run stays put and
the command reports the failure. If the transition is a `hitl` gate, the run pauses and
prints the gate token:

```bash
ix-flow advance <run-id> approved
# advance: gate_deferred
# gate: ack_… (to approved)
# next: ix-flow ack <run-id> ack_… --reviewer <user>
```

### ack

```bash
ix-flow ack <run-id> <token> [--reviewer <id>] [--kind <kind>] [--note <text>]
```

Record human approval for a paused gate, then `advance` again to complete the transition.

```bash
ix-flow ack <run-id> ack_… --reviewer alice
ix-flow advance <run-id> approved
# phase: approved
```

### history

```bash
ix-flow history <run-id>
```

Print the run's event log (use `--json` for full event records with hashes).

## JSON output

Agents add `--json` to consume the full result envelope. Key fields:

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

- `state` — outcome of the command; `gate_deferred` and `invariant_failed` mean the run did
  not move.
- `current_phase` — the run's phase after the command.
- `open_gates[].token` — pass to `ack` to clear a `hitl` gate.
- `next_actions` — suggested follow-up commands for the agent.

## State

Each run is one JSON file under `~/.ix/flows`, persisting across agent sessions so a run can
be resumed. To isolate a run (e.g. in tests), override the location with `--state-dir`, or
relocate the whole `~/.ix` root with `--config-root`.
