---
id: FR-021
title: "Optimistic concurrency control"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/StR-003"
    type: "traces_to"
---

# [FR-021] Optimistic concurrency control

## Description

The instance store SHALL guard run state with optimistic concurrency.
`appendAndSave` SHALL check the caller's `expectedVersion` against the persisted
`stateVersion` and SHALL reject a stale write with `state_version_mismatch`,
which surfaces in the result envelope as the `concurrency_conflict` state.
Creating a run on an already existing id SHALL likewise fail with
`state_version_mismatch`. A successful write SHALL increment the run's
`stateVersion`.

## Outputs

- An incremented `stateVersion` on success, or a `state_version_mismatch` error

## Acceptance Criteria

| ID          | Criteria                                                             | Verification |
| ----------- | -------------------------------------------------------------------- | ------------ |
| FR-021-AC-1 | A stale write is rejected with `state_version_mismatch`              | Analysis     |
| FR-021-AC-2 | Creating a run on an existing id fails with `state_version_mismatch` | Analysis     |
| FR-021-AC-3 | A successful write increments the run's `stateVersion`               | Analysis     |

## Dependencies

- **Upstream**: [StR-003](../stakeholder/StR-003-local-first-state.md) local-first workflow state
