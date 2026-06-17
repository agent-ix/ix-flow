---
id: FR-011
title: "Structured result envelope"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/StR-004"
    type: "traces_to"
---

# [FR-011] Structured result envelope

## Description

Every command SHALL return a structured result envelope carrying the fields
`ok`, `command`, `instance_id`, `state`, `data`, `error` (`code`, `message`,
`details`), `events`, `summary`, `current_phase`, `open_gates`,
`next_actions` (each with `command`, `description`, `required_for`),
`state_version`, `def_hash`, `recipe_steps`, and `interview_followups`.

The envelope `state` SHALL be one of `ok`, `gate_deferred`,
`invariant_failed`, `concurrency_conflict`, `definition_mismatch`, or `error`.
The `state` is the coarse outcome; the underlying error `code` maps onto it —
`transition_invariant_failed` → `invariant_failed`, `state_version_mismatch` →
`concurrency_conflict`, `definition_hash_mismatch` → `definition_mismatch`, and
any other failure → `error`. The envelope MAY also carry read-side fields
(`transitions_available`, `cli_version`) in addition to those listed above.
Output SHALL default to a human-readable form, and the full JSON envelope SHALL
be emitted under `--json`. `next_actions` SHALL guide the calling agent toward
the next valid commands. On failure, the envelope SHALL carry a structured
`error` (`code`, `message`, `details`) and the command SHALL exit non-zero.

## Outputs

- A human-readable summary by default
- The full JSON envelope under `--json`

## Acceptance Criteria

| ID          | Criteria                                                             | Verification              |
| ----------- | -------------------------------------------------------------------- | ------------------------- |
| FR-011-AC-1 | `--json` emits the envelope with the named fields                    | Test (tests/gate.test.ts) |
| FR-011-AC-2 | `state` is one of the enumerated values                              | Inspection                |
| FR-011-AC-3 | `next_actions` guide the agent toward the next commands              | Inspection                |
| FR-011-AC-4 | Errors carry `{code,message,details}` and the command exits non-zero | Test (tests/gate.test.ts) |

## Dependencies

- **Upstream**: StR-004 agent-consumable output
