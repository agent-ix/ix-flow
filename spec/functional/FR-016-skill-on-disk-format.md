---
id: FR-016
title: "Skill on-disk format"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/StR-002"
    type: "traces_to"
  - target: "ix://agent-ix/ix-flow/US-005"
    type: "implements"
---

# FR-016: Skill on-disk format

## Description

A path-mode skill SHALL be a directory containing a `SKILL.md` whose standard
Agent/Codex frontmatter declares `metadata.ix-flow-workflows: <relative-dir>`.
For backwards compatibility, ix-flow SHALL also accept the legacy top-level
`contributes.workflows: <relative-dir>` declaration. When a declaration key is
present, ix-flow SHALL require its value to be a non-empty string. When a value
is empty or malformed, ix-flow SHALL fail with `skill_format_invalid` even when
the other declaration is valid.
If both declarations are valid and present, they SHALL use the same
relative-directory value. When the declarations conflict, ix-flow SHALL fail
with `skill_format_invalid`. ix-flow SHALL reject an absolute value or a value
containing a parent traversal (`..`) segment. ix-flow SHALL require the resolved
real path to remain within the skill directory. ix-flow SHALL require one
`workflows/<name>/def.yaml` per workflow under the declared directory. A
path-mode skill MAY additionally include either a `scripts/invariants.js` ESM
module or the declared external invariant provider defined by
[FR-022](./FR-022-external-invariant-providers.md). ix-flow SHALL require every
discovered `workflows/<name>` directory and `def.yaml` real path to remain within
the resolved declared workflow directory. When a child or definition escapes,
ix-flow SHALL fail with `skill_format_invalid` before reading its content.

ix-flow SHALL support only `invariants.js` as an implicit skill script. When an
undeclared `invariants.*` script uses another name, ix-flow SHALL fail with
`skill_script_unsupported`. ix-flow SHALL support a non-JavaScript provider file
only through the explicit FR-022 declaration. When `SKILL.md` is missing or
invalid, ix-flow SHALL fail with `skill_format_invalid`. When the skill directory
is missing, ix-flow SHALL fail with `skill_not_found`. ix-flow SHALL resolve a
single-workflow skill without a workflow name. When a multi-workflow skill is
referenced without a name, ix-flow SHALL fail with `workflow_ambiguous`.

## Inputs

- A `--path <skill-dir>` skill directory

## Acceptance Criteria

| ID          | Criteria                                                                                                 | Verification                  |
| ----------- | -------------------------------------------------------------------------------------------------------- | ----------------------------- |
| FR-016-AC-1 | `--path` loads every `workflows/<name>/def.yaml` in the skill                                            | Test (tests/commands.test.ts) |
| FR-016-AC-2 | Standard `metadata.ix-flow-workflows` and legacy `contributes.workflows` declarations are each accepted  | Test (tests/plugin.test.ts)   |
| FR-016-AC-3 | Matching dual declarations are accepted; conflicting dual declarations fail with `skill_format_invalid`  | Test (tests/plugin.test.ts)   |
| FR-016-AC-4 | Missing workflow metadata fails with `skill_format_invalid` and a diagnostic naming both supported forms | Test (tests/plugin.test.ts)   |
| FR-016-AC-5 | An explicit empty or malformed declaration fails even when the other declaration is valid                | Test (tests/plugin.test.ts)   |
| FR-016-AC-6 | Absolute, traversing, or escaping declarations, child directories, and definitions fail closed           | Test (tests/plugin.test.ts)   |
| FR-016-AC-7 | Only `invariants.js` ESM is implicit; undeclared alternatives fail with `skill_script_unsupported`       | Analysis                      |
| FR-016-AC-8 | A single-workflow skill resolves without a name; ambiguous fails with `workflow_ambiguous`               | Analysis                      |

## Dependencies

- **Upstream**: [StR-002](../stakeholder/StR-002-agent-readable-workflows.md) author workflows as skills, [US-005](../usecase/US-005-author-a-workflow-as-a-skill.md) author a workflow as a skill
- **Downstream**: [FR-022](./FR-022-external-invariant-providers.md) external invariant providers
