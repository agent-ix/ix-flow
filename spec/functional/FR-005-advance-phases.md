---
id: FR-005
title: "Advance phases"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/US-001"
    type: "implements"
---

# [FR-005] Advance phases

## Description

The `advance <run-id> <phase>` command SHALL move a run along a declared
transition to the target phase.

When no transition to the requested phase is declared, the command SHALL
fail with `transition_not_found`. When a transition's invariant fails, the
command SHALL fail with `transition_invariant_failed` and the run SHALL
remain at its current phase. A phase declared `terminal` is an end state: it
declares no outgoing transitions, so a run that reaches it cannot advance
further (any further `advance` fails with `transition_not_found`).

## Inputs

- A run id and a target phase name

## Outputs

- The run advanced to the target phase (or held at a terminal phase, which
  has no outgoing transitions)
- A structured error (`transition_not_found` or
  `transition_invariant_failed`) when the move is rejected

## Acceptance Criteria

| ID          | Criteria                                                                                          | Verification                  |
| ----------- | ------------------------------------------------------------------------------------------------- | ----------------------------- |
| FR-005-AC-1 | An `auto` transition advances the run to the target phase                                         | Test (tests/gate.test.ts)     |
| FR-005-AC-2 | An undeclared transition is rejected with `transition_not_found`                                  | Analysis                      |
| FR-005-AC-3 | A failing transition invariant returns `transition_invariant_failed` and leaves the run unchanged | Test (tests/commands.test.ts) |
| FR-005-AC-4 | A `terminal` phase has no outgoing transitions, so the run cannot advance further                 | Analysis                      |

## Dependencies

- **Upstream**: [US-001](../usecase/US-001-run-a-workflow.md) run a workflow
