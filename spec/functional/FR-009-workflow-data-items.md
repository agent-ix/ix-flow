---
id: FR-009
title: "Workflow data items"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/US-008"
    type: "implements"
---

# [FR-009] Workflow data items

## Description

The `add-item <run-id> <type> --item <json>`, `update-item <run-id> <type>
<item-id> --patch <json>`, and `link-items <run-id> --link <json>` commands
SHALL persist and relate typed JSON data on a run. Each command SHALL accept
its payload inline or from a file via the corresponding `--<x>-file <path>`
option.

`add-item` SHALL require an item object carrying a string `id` and SHALL
persist that item under its declared type. Adding an item whose `id` already
exists SHALL fail with `item_already_exists`. `update-item` SHALL apply the
patch to the item addressed by `<item-id>`; updating a missing id SHALL fail
with `item_not_found`. `link-items` SHALL record a typed link between items.

## Inputs

- `<run-id>`, `<type>`, `<item-id>`
- `--item <json>` / `--patch <json>` / `--link <json>`, or the equivalent
  `--<x>-file <path>`

## Outputs

- A persisted item, applied patch, or recorded link on the run

## Acceptance Criteria

| ID          | Criteria                                                              | Verification                  |
| ----------- | --------------------------------------------------------------------- | ----------------------------- |
| FR-009-AC-1 | `add-item` persists an item carrying a string `id`                    | Test (tests/commands.test.ts) |
| FR-009-AC-2 | `update-item` patches by id; a missing id fails with `item_not_found` | Test (tests/commands.test.ts) |
| FR-009-AC-3 | `link-items` records a typed link between items                       | Test (tests/commands.test.ts) |
| FR-009-AC-4 | Adding a duplicate id fails with `item_already_exists`                | Analysis                      |

## Dependencies

- **Upstream**: US-008 record workflow data items
