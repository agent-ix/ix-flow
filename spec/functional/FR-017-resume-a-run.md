---
id: FR-017
title: "Resume a run"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/US-003"
    type: "implements"
---

# FR-017: Resume a run

## Description

The `resume <run-id>` command SHALL re-emit a workflow run's status together
with guidance for an agent to continue the run — for example in a new session.
A `resume` command referencing an unknown run id SHALL fail with
`instance_not_found`.

## Inputs

- A run id
- Global flags inherited from [FR-002](./FR-002-runtime-context-and-flags.md)

## Outputs

- The run status plus continuation guidance
- An `instance_not_found` error for an unknown run id

## Acceptance Criteria

| ID          | Criteria                                            | Verification                  |
| ----------- | --------------------------------------------------- | ----------------------------- |
| FR-017-AC-1 | `resume` re-emits status with continuation guidance | Test (tests/commands.test.ts) |
| FR-017-AC-2 | An unknown run id fails with `instance_not_found`   | Analysis                      |

## Dependencies

- **Upstream**: [US-003](../usecase/US-003-resume-across-sessions.md) resume across sessions
