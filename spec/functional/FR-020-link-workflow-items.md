---
id: FR-020
title: "Link workflow items"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/US-001"
    type: "implements"
---

# FR-020: Link workflow items

## Description

The `link-items <run-id> --link <json>` command SHALL record a typed link
between items on a run, accepting the link inline or from a file via
`--link-file <path>`. The recorded link SHALL be appended to the run's links.

## Inputs

- `<run-id>`
- `--link <json>` or `--link-file <path>`

## Outputs

- A recorded link appended to the run

## Acceptance Criteria

| ID          | Criteria                                        | Verification                  |
| ----------- | ----------------------------------------------- | ----------------------------- |
| FR-020-AC-1 | `link-items` records a typed link between items | Test (tests/commands.test.ts) |

## Dependencies

- **Upstream**: [US-001](../usecase/US-001-run-a-workflow.md) run a workflow
