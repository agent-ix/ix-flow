---
id: NFR-002
title: "Local-first operation"
type: NFR
quality_attribute: portability
relationships:
  - target: "ix://agent-ix/ix-flow/FR-012"
    type: "constrains"
---

# [NFR-002] Local-first operation

## Statement

Local workflows SHALL run with no dependency on any IX service or network
connection. Run state SHALL be stored under the local configuration root so
that a workflow can be created, advanced, and audited entirely offline.

## Measurement and Evaluation

| Metric                                   | Target | Threshold | Method        |
| ---------------------------------------- | ------ | --------- | ------------- |
| IX service dependencies for a local run  | 0      | 0         | Analysis      |
| Network calls required for a local run   | 0      | 0         | Demonstration |
| State stored under the local config root | 100%   | 100%      | Inspection    |

## Verification

Verified by Analysis of the command surface for service couplings and by
Demonstration that a local run completes without network access, with state
under the local configuration root.

## Scope

Applies to local (path-mode) workflow runs and their persisted state.

## Dependencies

- Constrains FR-012 local instance store and concurrency
