---
id: FR-004
title: "Report run status"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/US-001"
    type: "implements"
---

# [FR-004] Report run status

## Description

The `status <run-id>` command SHALL report a workflow run's current phase, a
summary of the run, any open gates, and the available next actions. A `status`
command referencing an unknown run id SHALL fail with `instance_not_found`.

## Inputs

- A run id
- Global flags inherited from FR-002

## Outputs

- The run's current phase, summary, open gates, and next actions
- An `instance_not_found` error for an unknown run id

## Acceptance Criteria

| ID          | Criteria                                             | Verification                  |
| ----------- | ---------------------------------------------------- | ----------------------------- |
| FR-004-AC-1 | `status` reports the run's current phase and summary | Test (tests/commands.test.ts) |
| FR-004-AC-2 | An unknown run id fails with `instance_not_found`    | Analysis                      |

## Dependencies

- **Upstream**: US-001 run a workflow
