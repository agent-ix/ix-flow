---
id: FR-015
title: "Invariant resolution and custom invariants"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/US-005"
    type: "implements"
---

# [FR-015] Invariant resolution and custom invariants

## Description

Transition `invariants` SHALL be names, optionally of the form `name:arg`
(split on the first colon). Invariant resolution SHALL merge the core library
with skill-provided invariants (`scripts/invariants.js`), with the skill
overriding the core. The built-in invariants `acyclic`, `no_open_questions`,
and `interview.complete` SHALL be available without any skill script.

Referencing an unregistered invariant SHALL fail with
`transition_invariant_unregistered`. Evaluators SHALL return structured results
(`ok`, optional `code`, optional `details`); a failing invariant SHALL carry a
`code` and `details` rather than free text, surfaced as
`transition_invariant_failed`.

## Acceptance Criteria

| ID          | Criteria                                                                 | Verification                         |
| ----------- | ------------------------------------------------------------------------ | ------------------------------------ |
| FR-015-AC-1 | Built-in invariants are available without a skill script                 | Test (tests/commands.test.ts)        |
| FR-015-AC-2 | A custom invariant is resolved from `scripts/invariants.js`              | Test (tests/engine-features.test.ts) |
| FR-015-AC-3 | An unregistered invariant fails with `transition_invariant_unregistered` | Test (tests/engine-features.test.ts) |
| FR-015-AC-4 | A failing invariant returns a structured `code`/`details`                | Test (tests/engine-features.test.ts) |

## Dependencies

- **Upstream**: US-005 author a workflow as a skill
