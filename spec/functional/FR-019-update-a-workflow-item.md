---
id: FR-019
title: "Update a workflow item"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/US-001"
    type: "implements"
---

# FR-019: Update a workflow item

## Description

The `update-item <run-id> <type> <item-id> --patch <json>` command SHALL apply
a JSON patch to the item addressed by `<item-id>` under the given type,
accepting the patch inline or from a file via `--patch-file <path>`. Updating an
item id that does not exist SHALL fail with `item_not_found`.

## Inputs

- `<run-id>`, `<type>`, `<item-id>`
- `--patch <json>` or `--patch-file <path>`

## Outputs

- The patched item on the run, or an `item_not_found` error

## Acceptance Criteria

| ID          | Criteria                                                | Verification                  |
| ----------- | ------------------------------------------------------- | ----------------------------- |
| FR-019-AC-1 | `update-item` patches the item addressed by `<item-id>` | Test (tests/commands.test.ts) |
| FR-019-AC-2 | Updating a missing id fails with `item_not_found`       | Analysis                      |

## Dependencies

- **Upstream**: [US-001](../usecase/US-001-run-a-workflow.md) run a workflow
