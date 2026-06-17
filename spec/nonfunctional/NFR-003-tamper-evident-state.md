---
id: NFR-003
title: "Auditable, tamper-evident state"
type: NFR
quality_attribute: security
relationships:
  - target: "ix://agent-ix/ix-flow/FR-013"
    type: "constrains"
---

# [NFR-003] Auditable, tamper-evident state

## Statement

Every run mutation SHALL be recorded in an append-only, SHA-256 hash-chained
event log whose integrity is independently verifiable. Any single-event tamper
SHALL be detectable by re-verifying the chain.

## Measurement and Evaluation

| Metric                                    | Target | Threshold | Method     |
| ----------------------------------------- | ------ | --------- | ---------- |
| Undetected single-event tamper            | 0      | 0         | Test       |
| `verify` detection of an introduced break | 100%   | 100%      | Test       |
| Mutations recorded in the chained log     | 100%   | 100%      | Inspection |

## Verification

Verified by Test against `tests/commands.test.ts`, which asserts `chain:
intact`, together with a tamper case in which `verify` reports the first broken
index.

## Scope

Applies to the per-run event log and the `verify` integrity check.

## Dependencies

- Constrains FR-013 event log and integrity
