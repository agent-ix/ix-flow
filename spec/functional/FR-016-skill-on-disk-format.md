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
`contributes.workflows: <relative-dir>` declaration. Each declaration key that
is present SHALL contain a non-empty string; an empty or malformed declaration
SHALL fail with `skill_format_invalid` even when the other declaration is valid.
If both declarations are valid and present, they SHALL use the same
relative-directory value; conflicting declarations SHALL fail with
`skill_format_invalid`. The declared directory SHALL hold one
`workflows/<name>/def.yaml` per workflow and MAY include a `scripts/invariants.js`
(an ESM module exporting an `invariants` object).

Only `invariants.js` SHALL be supported as a skill script; any other script
SHALL fail with `skill_script_unsupported`. A missing or invalid `SKILL.md`
SHALL fail with `skill_format_invalid`, and a missing skill directory SHALL
fail with `skill_not_found`. A single-workflow skill SHALL resolve without a
workflow name; a multi-workflow skill referenced without a name SHALL fail with
`workflow_ambiguous`.

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
| FR-016-AC-6 | Only `invariants.js` ESM is supported, else `skill_script_unsupported`                                   | Analysis                      |
| FR-016-AC-7 | A single-workflow skill resolves without a name; ambiguous fails with `workflow_ambiguous`               | Analysis                      |

## Dependencies

- **Upstream**: [StR-002](../stakeholder/StR-002-agent-readable-workflows.md) author workflows as skills, [US-005](../usecase/US-005-author-a-workflow-as-a-skill.md) author a workflow as a skill
