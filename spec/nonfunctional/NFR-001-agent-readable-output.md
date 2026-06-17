---
id: NFR-001
title: "Agent-readable, deterministic output"
type: NFR
quality_attribute: compatibility
relationships:
  - target: "ix://agent-ix/ix-flow/FR-011"
    type: "constrains"
---

# [NFR-001] Agent-readable, deterministic output

## Statement

Under `--json`, every command SHALL emit a complete, stably-shaped result
envelope so that a calling agent can parse the outcome without scraping
human-readable text. Event hashing SHALL be deterministic, producing the same
hash for the same canonical event content.

## Measurement and Evaluation

| Metric                                       | Target                   | Threshold                | Method     |
| -------------------------------------------- | ------------------------ | ------------------------ | ---------- |
| Envelope completeness under `--json`         | All named fields present | All named fields present | Test       |
| Envelope shape stability across commands     | Identical field set      | Identical field set      | Inspection |
| Hash determinism for identical event content | Identical hash           | Identical hash           | Test       |

## Verification

Verified by Test against `tests/gate.test.ts`, which asserts the `--json` gate
envelope, and by Inspection of the result-envelope shape across commands.

## Scope

Applies to the `--json` output of every workflow command and to event-chain
hashing.

## Dependencies

- Constrains FR-011 structured result envelope
