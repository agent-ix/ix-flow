---
id: FR-004
title: "Inspect workflow runs"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/US-003"
    type: "implements"
---

# [FR-004] Inspect workflow runs

## Description

The CLI SHALL expose the `status`, `resume`, and `history` commands for
inspecting a workflow run. These commands SHALL report the run's current
phase, any open gates, the available next actions, and the event log.

The `status` command SHALL report the current phase and a summary of the
run. The `resume` command SHALL re-emit the run status together with agent
guidance for continuing the run. The `history` command SHALL return the
run's recorded events. Any inspection command referencing an unknown run id
SHALL fail with `instance_not_found`.

## Inputs

- A run id
- Global flags inherited from FR-002

## Outputs

- Current phase, open gates, next actions, and event log
- An `instance_not_found` error for an unknown run id

## Acceptance Criteria

| ID          | Criteria                                             | Verification                  |
| ----------- | ---------------------------------------------------- | ----------------------------- |
| FR-004-AC-1 | `status` reports the run's current phase and summary | Test (tests/commands.test.ts) |
| FR-004-AC-2 | `resume` re-emits status with agent guidance         | Test (tests/commands.test.ts) |
| FR-004-AC-3 | `history` returns the run's recorded events          | Test (tests/commands.test.ts) |
| FR-004-AC-4 | An unknown run id fails with `instance_not_found`    | Analysis                      |

## Dependencies

- **Upstream**: US-003 resume across sessions
