---
id: FR-008
title: "Run command recipes"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/US-009"
    type: "implements"
---

# [FR-008] Run command recipes

## Description

The `recipe <run-id> <recipe-name>` command SHALL run a recipe's declared
steps in order, executing each step through the same operations used by the
individual commands. Execution SHALL stop at the first failing step or
deferred gate, and the command SHALL report the executed steps as
`recipe_steps`.

A recipe step that defers on a `hitl` gate SHALL stop the recipe with state
`gate_deferred`, with `ack` listed among the next actions. A failing step
SHALL return the underlying structured error and stop the recipe. Only the
structured workflow operations (`advance`, `add-item`, `update-item`,
`link-items`, `record-answers`) SHALL be valid recipe steps; a shell or
otherwise unknown step SHALL be rejected at parse time with
`definition_schema_invalid`.

## Inputs

- `<run-id>` and `<recipe-name>`

## Outputs

- `recipe_steps` describing the executed steps
- A `gate_deferred` state, an underlying structured error, or a
  `definition_schema_invalid` parse error when a step is unsupported

## Acceptance Criteria

| ID          | Criteria                                                                          | Verification                  |
| ----------- | --------------------------------------------------------------------------------- | ----------------------------- |
| FR-008-AC-1 | `recipe` runs the declared steps in order and reports `recipe_steps`              | Test (tests/commands.test.ts) |
| FR-008-AC-2 | A `hitl` step stops the recipe with `gate_deferred` and `ack` in the next actions | Analysis                      |
| FR-008-AC-3 | A failing step returns the underlying structured error and stops the recipe       | Analysis                      |
| FR-008-AC-4 | A shell or unknown step is rejected at parse with `definition_schema_invalid`     | Analysis                      |

## Dependencies

- **Upstream**: [US-009](../usecase/US-009-run-command-recipes.md) run command recipes
