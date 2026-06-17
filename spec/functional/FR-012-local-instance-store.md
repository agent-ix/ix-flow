---
id: FR-012
title: "Local instance store and concurrency"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/US-003"
    type: "implements"
---

# [FR-012] Local instance store and concurrency

## Description

The `JsonFileInstanceStore` SHALL persist one JSON file per run under a
configurable state directory, defaulting to `~/.ix/flows`, alongside an
`index.json`. Writes SHALL be atomic, performed by writing a temporary file and
renaming it into place with mode `0600`. A run SHALL be retrievable across
separate processes.

The store SHALL enforce optimistic concurrency: `appendAndSave` SHALL check the
caller's `expectedVersion` against the persisted `stateVersion` and SHALL reject
a stale write with `state_version_mismatch`. Creating a run on an already
existing id SHALL likewise conflict, and reading an unknown id SHALL fail with
`instance_not_found`.

## Outputs

- One persisted JSON file per run plus an `index.json` under the state directory

## Acceptance Criteria

| ID          | Criteria                                                    | Verification                  |
| ----------- | ----------------------------------------------------------- | ----------------------------- |
| FR-012-AC-1 | A run persists and is retrievable across separate processes | Test (tests/commands.test.ts) |
| FR-012-AC-2 | The default state directory is `~/.ix/flows`                | Inspection                    |
| FR-012-AC-3 | A stale write is rejected with `state_version_mismatch`     | Analysis                      |
| FR-012-AC-4 | Writes are atomic via temp file then rename                 | Inspection                    |

## Dependencies

- **Upstream**: US-003 persist workflow runs locally
