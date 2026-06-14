# IX Flow

`ix-flow` is the focused Agent IX workflow runner CLI. It drives agent-oriented
flows for Claude/Codex-style harnesses with persisted state, phases, HITL gates,
recipes, and resume/status/ack operations.

It is not intended to be a general BPM or workflow automation engine.

## Usage

```bash
ix-flow run <flow>
ix-flow run write-fr --path ../ix-spec-workflows/skills/write-fr
ix-flow status <run-id>
ix-flow resume <run-id>
ix-flow advance <run-id> <phase>
ix-flow ack <run-id> <token>
ix-flow history <run-id>
```

State defaults to `~/.ix/flows`. Use `--config-root <dir>` or
`--state-dir <dir>` for isolated runs.

## Development

```bash
pnpm install
pnpm run build
pnpm test
pnpm run lint
```

This package builds on `@agent-ix/ix-cli-core@0.10.0` from the standalone
`ix-cli-core` repo.
