# ix-flow usage

`ix-flow` runs agent-oriented workflows defined as state machines. This guide covers the
model, how to author a workflow, the command reference, and JSON output.

## Model

- **Run** — one live instance of a workflow definition, addressed by a run id.
- **Phase** — a named state. A run is always in exactly one phase, starting at
  `initialPhase`. A phase marked `terminal` ends the run.
- **Transition** — a declared `from → to` edge. `advance` follows one transition.
- **Invariant** — a named predicate checked before a transition commits. If it fails, the
  advance is rejected and the run stays put.
- **Gate** — a transition's approval mode: `auto` commits immediately, `hitl` defers until
  a human acknowledges it with `ack`.
- **Event log** — each run is an append-only, hash-chained list of events
  (`workflow.created`, `phase.advanced`, `gate.deferred`, `gate.acknowledged`, …).
  `history` prints it.

## Authoring a workflow

A workflow ships inside a **skill directory**:

```
my-skill/
  SKILL.md                      # frontmatter points at the workflows dir
  workflows/
    <name>/
      def.yaml                  # one workflow definition per subdirectory
  scripts/
    invariants.js               # optional custom invariants (ESM)
```

`SKILL.md` frontmatter must declare where the workflows live:

```markdown
---
name: my-skill
description: What this skill does.
contributes:
  workflows: ./workflows
---
```

Each subdirectory of `workflows/` that contains a `def.yaml` becomes one workflow, named by
its `name:` field.

### def.yaml reference

```yaml
name: release # workflow name (used by `run <name>`)
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
    defaultGate: hitl # defers until `ack`
```

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

A definition is content-hashed on load; a run is pinned to that hash, so editing
`def.yaml` mid-run is rejected as a definition mismatch.

> `def.yaml` also supports `itemSchemas`, `linkSchemas`, `interviews`, `artifactTemplates`,
> and `recipes`. These are consumed by the workflow runner library; the standalone
> `ix-flow` CLI drives **phase advancement and gate acknowledgement** only (`run`,
> `advance`, `ack`, `status`, `history`). It does not record interview answers or run
> recipes.

## Commands

All commands accept `--json` and the global flags below.

### run

```bash
ix-flow run <flow> [--path <skill-dir>] [--id <id>] [--name <name>] [--target <ref>...]
```

Creates a run. Provide `<flow>` to resolve a registered definition, or `--path` to load a
skill directory (path mode). `--id` sets the run id (otherwise a UUID), `--name` labels the
run, and each `--target` records a file reference the workflow operates on.

```bash
ix-flow run release --path examples/release --state-dir /tmp/flow
# create: ok
# run: <run-id>
# phase: draft
```

### status / resume

```bash
ix-flow status <run-id>
ix-flow resume <run-id>
```

Report the current phase, open gates, and next actions. `resume` adds a reminder to
continue the run in your agent harness.

### advance

```bash
ix-flow advance <run-id> <phase>
```

Follow the transition into `<phase>`. If a required invariant fails, the run stays put and
the command reports the failure. If the transition is a `hitl` gate, the run defers and
prints the gate token:

```bash
ix-flow advance <run-id> approved
# advance: gate_deferred
# gate: ack_… (to approved)
# next: ix-flow ack <run-id> ack_… --reviewer <user>
```

Acknowledge the gate with `ack`, then advance again.

### ack

```bash
ix-flow ack <run-id> <token> [--reviewer <id>] [--kind <kind>] [--note <text>]
```

Acknowledge a deferred gate, then re-run `advance` to complete the transition.

```bash
ix-flow ack <run-id> ack_… --reviewer me
ix-flow advance <run-id> approved
# phase: approved
```

### history

```bash
ix-flow history <run-id>
```

Print the run's event log (use `--json` for full event records with hashes).

## JSON output

`--json` prints the full result envelope. Key fields:

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
  did not move.
- `current_phase` — the run's phase after the command.
- `open_gates[].token` — pass to `ack` to clear a `hitl` gate.
- `next_actions` — suggested follow-up commands.

## State on disk

State lives under `~/.ix/flows` by default, one JSON file per run. Override per command:

- `--state-dir <dir>` — store runs in `<dir>` (use a throwaway dir for experiments).
- `--config-root <dir>` — relocate the whole `~/.ix` config root (state defaults to
  `<config-root>/flows`).
- `--no-project-config` — ignore a project-local `.ix` config.
