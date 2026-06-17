---
id: FR-013
title: "Event log and integrity"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/US-004"
    type: "implements"
---

# [FR-013] Event log and integrity

## Description

Each run SHALL maintain an append-only list of events. Each event's hash SHALL
be the SHA-256 over the canonical JSON of `{id, ts, actor, kind, payload,
prevHash}`. The first event's `prevHash` SHALL be `GENESIS_HASH` (64 zeros),
and each subsequent event's `prevHash` SHALL be the prior event's hash.

The `verify <run-id>` command SHALL run `verifyChain` and SHALL report the
chain as intact, or SHALL report the index of the first break when a link or
hash mismatches. Hashing SHALL use canonical JSON with sorted keys so that it is
deterministic.

## Outputs

- An append-only, hash-chained event log per run
- A `verify` report of `intact` or the first broken index

## Acceptance Criteria

| ID          | Criteria                                             | Verification                  |
| ----------- | ---------------------------------------------------- | ----------------------------- |
| FR-013-AC-1 | Each mutation appends a chained event                | Inspection                    |
| FR-013-AC-2 | `verify` on an intact run reports the chain intact   | Test (tests/commands.test.ts) |
| FR-013-AC-3 | A broken chain reports the first break index         | Analysis                      |
| FR-013-AC-4 | Canonical-JSON (sorted-key) hashing is deterministic | Inspection                    |

## Dependencies

- **Upstream**: [US-004](../usecase/US-004-audit-and-verify-a-run.md) audit a workflow run
