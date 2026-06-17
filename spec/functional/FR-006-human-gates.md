---
id: FR-006
title: "Human approval gates"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/US-002"
    type: "implements"
---

# [FR-006] Human approval gates

## Description

A transition whose gate mode is `hitl` SHALL defer when advanced into,
returning the state `gate_deferred` with an open gate carrying a `token`.
The `ack <run-id> <token>` command SHALL record approval for that gate and
SHALL accept the options `--reviewer`, `--kind`, and `--note`. An `ack`
with an invalid token SHALL fail with `gate_token_invalid`. A subsequent
`advance` SHALL commit the transition.

When a gate is deferred, human-readable output SHALL display the gate token
and the next actions, and the command SHALL exit with status 0.

## Inputs

- `advance <run-id> <phase>` into a `hitl`-gated transition
- `ack <run-id> <token> [--reviewer --kind --note]`

## Outputs

- A `gate_deferred` state with an open gate and `token`
- A recorded gate approval, or a `gate_token_invalid` error

## Acceptance Criteria

| ID          | Criteria                                                                            | Verification              |
| ----------- | ----------------------------------------------------------------------------------- | ------------------------- |
| FR-006-AC-1 | Advancing into a `hitl` transition returns `gate_deferred` with a token and exits 0 | Test (tests/gate.test.ts) |
| FR-006-AC-2 | `ack` with a valid token records approval                                           | Test (tests/gate.test.ts) |
| FR-006-AC-3 | `ack` with an invalid token fails with `gate_token_invalid`                         | Analysis                  |
| FR-006-AC-4 | A subsequent `advance` after `ack` commits the transition                           | Test (tests/gate.test.ts) |
| FR-006-AC-5 | Human-readable output shows the gate token and next actions                         | Test (tests/gate.test.ts) |

## Dependencies

- **Upstream**: US-002 approve a human gate
