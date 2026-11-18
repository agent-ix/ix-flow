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
<path>`. Each item SHALL carry a string `id`. The command SHALL persist the
item under its declared type. If an item with the same `id` already exists
under an ordinary type, then `add-item` SHALL fail with `item_already_exists`.

When an item's type is declared in `systemOwnedItemTypes`, `add-item` SHALL
permit one initial item only while that type has no items. When that type
already contains an item, `add-item` SHALL fail with `item_system_owned`.

## Inputs

- `<run-id>`, `<type>`
- `--item <json>` or `--item-file <path>`

## Outputs

- A persisted item on the run, or an `item_already_exists` or
  `item_system_owned` error

## Acceptance Criteria

| ID          | Criteria                                                                                                                                         | Verification                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| FR-009-AC-1 | `add-item` persists an item carrying a string `id`                                                                                               | Test (tests/commands.test.ts) |
| FR-009-AC-2 | Adding a duplicate id under an ordinary type fails with `item_already_exists`                                                                    | Analysis                      |
| FR-009-AC-3 | For a type declared in `systemOwnedItemTypes`, `add-item` persists one item while the type is empty and later adds fail with `item_system_owned` | Test                          |

## Dependencies

- **Upstream**: [US-001](../usecase/US-001-run-a-workflow.md) run a workflow
