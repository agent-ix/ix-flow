---
id: FR-003
title: "Create and resolve workflow runs"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/US-001"
    type: "implements"
  - target: "ix://agent-ix/ix-flow/US-005"
    type: "implements"
---

# [FR-003] Create and resolve workflow runs

## Description

The `run <flow>` command SHALL create a workflow run from either a
registered definition name (name-mode) or a `--path <skill-dir>` skill
directory (path-mode). The command SHALL accept the options `--id`,
`--name`, and `--target`.

In path-mode the command SHALL resolve the skill directory and record the
`skillPath` as relative and absolute forms. In name-mode the command SHALL
resolve a registered definition by name. The selected definition SHALL be
pinned by content hash (`defHash`, the SHA-256 of its canonical JSON).

When a referenced definition name is unknown the command SHALL fail with
`definition_not_found`. When a definition's `contentHash` no longer matches
the pinned `defHash` on a later command, that command SHALL fail with
`definition_hash_mismatch`. In path-mode, skill-loading failures surface the
errors defined in FR-016 (`skill_not_found`, `skill_format_invalid`,
`workflow_ambiguous`) and definition-format errors from FR-014
(`definition_schema_invalid`, `definition_yaml_parse_failed`).

## Inputs

- `<flow>` definition name or `--path <skill-dir>`
- Options `--id`, `--name`, `--target`

## Outputs

- A persisted run instance positioned at the definition's initial phase
- A pinned definition content hash (`defHash`)

## Acceptance Criteria

| ID          | Criteria                                                                          | Verification                  |
| ----------- | --------------------------------------------------------------------------------- | ----------------------------- |
| FR-003-AC-1 | `run --path <skill-dir>` creates a run instance at the definition's initial phase | Test (tests/commands.test.ts) |
| FR-003-AC-2 | Name-mode resolves a registered definition by name                                | Demonstration                 |
| FR-003-AC-3 | An unknown definition name fails with `definition_not_found`                      | Analysis                      |
| FR-003-AC-4 | Path-mode records `skillPath` in both relative and absolute forms                 | Inspection                    |
| FR-003-AC-5 | A later content-hash change yields `definition_hash_mismatch`                     | Analysis                      |

## Dependencies

- **Upstream**: US-001 run a workflow, US-005 author a workflow as a skill
