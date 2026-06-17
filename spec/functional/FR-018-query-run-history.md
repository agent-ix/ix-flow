---
id: FR-018
title: "Query run history"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/US-004"
    type: "implements"
---

# [FR-018] Query run history

## Description

The `history <run-id>` command SHALL return a workflow run's recorded events in
order. Under `--json` it SHALL emit the full event records, including their
chain hashes. A `history` command referencing an unknown run id SHALL fail with
`instance_not_found`.

## Inputs

- A run id
- Global flags inherited from FR-002

## Outputs

- The run's recorded event log
- An `instance_not_found` error for an unknown run id

## Acceptance Criteria

| ID          | Criteria                                          | Verification                  |
| ----------- | ------------------------------------------------- | ----------------------------- |
| FR-018-AC-1 | `history` returns the run's recorded events       | Test (tests/commands.test.ts) |
| FR-018-AC-2 | An unknown run id fails with `instance_not_found` | Analysis                      |

## Dependencies

- **Upstream**: US-004 audit and verify a run
