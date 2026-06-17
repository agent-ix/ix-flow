[![Discord](https://img.shields.io/badge/Discord-Join%20us-5865F2?logo=discord&logoColor=white)](https://discord.gg/6qsdhSPE)

<p align="center">
  <img src="logo.png" alt="IX Flow" width="100%" />
</p>

# IX Flow

`ix-flow` is the Agent IX workflow runner CLI. It drives agent-oriented flows defined as
small state machines — phases, transitions, human-in-the-loop gates — with persisted,
event-chained run state and resume/status/ack operations.

It is not a general BPM or workflow automation engine.

## Install

```bash
npm i -g @agent-ix/ix-flow
```

Or run from a clone after `pnpm install && pnpm run build`:

```bash
node bin/ix-flow.js --help
```

## Quickstart

Run the bundled [`examples/release`](examples/release) workflow — `draft → in_review →
approved`, with a human gate on the final step. `--state-dir` keeps this run out of your
real state directory.

```bash
# Create a run from a skill directory (path mode).
ix-flow run release --path examples/release --state-dir /tmp/flow
# create: ok
# run: <run-id>
# phase: draft

# Advance through an automatic transition.
ix-flow advance <run-id> in_review --state-dir /tmp/flow
# phase: in_review

# The next transition is gated; it defers and prints the gate token.
ix-flow advance <run-id> approved --state-dir /tmp/flow
# advance: gate_deferred
# gate: ack_... (to approved)
# next: ix-flow ack <run-id> ack_... --reviewer <user>

# Acknowledge the gate, then advance again.
ix-flow ack <run-id> <token> --reviewer me --state-dir /tmp/flow
ix-flow advance <run-id> approved --state-dir /tmp/flow
# phase: approved

ix-flow status <run-id> --state-dir /tmp/flow
ix-flow history <run-id> --state-dir /tmp/flow
```

## Commands

| Command                     | Purpose                                                    |
| --------------------------- | ---------------------------------------------------------- |
| `run <flow> [--path <dir>]` | Create a run from a registered definition or skill dir.    |
| `status <run-id>`           | Show current phase, open gates, and next actions.          |
| `resume <run-id>`           | Re-emit status for an in-progress run.                     |
| `advance <run-id> <phase>`  | Move to the next phase (may defer on a gate or invariant). |
| `ack <run-id> <token>`      | Acknowledge a deferred human gate.                         |
| `history <run-id>`          | Show the run's event log.                                  |

Add `--json` to any command for the full result envelope. See
[`docs/usage.md`](docs/usage.md) for flags, output fields, and authoring.

## Concepts

- **Run** — one instance of a workflow definition, identified by a run id.
- **Phase** — a named state; a run sits in exactly one phase at a time.
- **Transition** — a declared `from → to` move between phases.
- **Gate** — a `hitl` transition defers until acknowledged with `ack`.
- **Invariant** — a predicate that must hold before a transition succeeds.
- **State** — each run is an append-only, hash-chained event log on disk.

## State location

State defaults to `~/.ix/flows`. Override with `--state-dir <dir>` for isolated runs, or
`--config-root <dir>` to relocate the whole `~/.ix` root.

## Development

```bash
pnpm install
pnpm run build
pnpm test
pnpm run lint
```

This package builds on `@agent-ix/ix-cli-core` from the standalone `ix-cli-core` repo.
