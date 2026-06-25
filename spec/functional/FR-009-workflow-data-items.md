---
id: FR-009
title: "Add a workflow item"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/US-001"
    type: "implements"
---

# FR-009: Add a workflow item

## Description

The `add-item <run-id> <type> --item <json>` command SHALL persist a typed JSON
item on a run, accepting the payload inline or from a file via `--item-file
<path>`. The item SHALL carry a string `id` and SHALL be persisted under its
declared type. Adding an item whose `id` already exists under that type SHALL
fail with `item_already_exists`.

## Inputs

- `<run-id>`, `<type>`
- `--item <json>` or `--item-file <path>`

## Outputs

- A persisted item on the run, or an `item_already_exists` error

## Acceptance Criteria

| ID          | Criteria                                               | Verification                  |
| ----------- | ------------------------------------------------------ | ----------------------------- |
| FR-009-AC-1 | `add-item` persists an item carrying a string `id`     | Test (tests/commands.test.ts) |
| FR-009-AC-2 | Adding a duplicate id fails with `item_already_exists` | Analysis                      |

## Dependencies

- **Upstream**: [US-001](../usecase/US-001-run-a-workflow.md) run a workflow
