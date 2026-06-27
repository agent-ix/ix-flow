---
id: FR-012
title: "Local instance store"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/US-003"
    type: "implements"
---

# FR-012: Local instance store

## Description

The `JsonFileInstanceStore` SHALL persist one JSON file per run under a
configurable state directory, defaulting to `~/.ix/flows`, alongside an
`index.json`. Writes SHALL be atomic, performed by writing a temporary file and
renaming it into place with mode `0600`. A run SHALL be retrievable across
separate processes, and reading an unknown id SHALL fail with
`instance_not_found`.

## Outputs

- One persisted JSON file per run plus an `index.json` under the state directory

## Acceptance Criteria

| ID          | Criteria                                                    | Verification                  |
| ----------- | ----------------------------------------------------------- | ----------------------------- |
| FR-012-AC-1 | A run persists and is retrievable across separate processes | Test (tests/commands.test.ts) |
| FR-012-AC-2 | The default state directory is `~/.ix/flows`                | Inspection                    |
| FR-012-AC-3 | Writes are atomic via temp file then rename                 | Inspection                    |
| FR-012-AC-4 | Reading an unknown id fails with `instance_not_found`       | Analysis                      |

## Dependencies

- **Upstream**: [US-003](../usecase/US-003-resume-across-sessions.md) persist workflow runs locally
