---
id: FR-014
title: "Workflow definition format"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/US-005"
    type: "implements"
---

# FR-014: Workflow definition format

## Description

A workflow definition (`def.yaml`) SHALL conform to the `WorkflowDef` shape
with the fields `name`, `version`, optional `description`, `initialPhase`,
`phases` (`name`, optional `terminal`, optional `hint`), `transitions`
(`from`, `to`, `invariants`, `defaultGate` ∈ {`auto`, `hitl`, `full-auto`}),
`itemSchemas`, `linkSchemas`, optional `interviews`, optional
`artifactTemplates`, and optional `recipes`. The `defaultGate` enum accepts
`auto`, `hitl`, and `full-auto`, though only `auto` and `hitl` currently drive
distinct runtime behavior (`full-auto` is reserved and behaves as `auto`).
`parseWorkflowDef` SHALL validate it (via zod) and SHALL pin a `contentHash`
(SHA-256 of its canonical JSON).

Referential checks SHALL require that `initialPhase` and every transition
`from`/`to` are declared phases, that each interview `itemType` is a key in
`itemSchemas`, that each template `phase` is a declared phase, and that literal
template targets are unique. A definition that fails schema or referential
validation SHALL fail with `definition_schema_invalid`, and unparseable YAML
SHALL fail with `definition_yaml_parse_failed`.

## Outputs

- A validated `WorkflowDef` with a pinned `contentHash`

## Acceptance Criteria

| ID          | Criteria                                                              | Verification                  |
| ----------- | --------------------------------------------------------------------- | ----------------------------- |
| FR-014-AC-1 | A valid definition loads and pins a `contentHash`                     | Test (tests/commands.test.ts) |
| FR-014-AC-2 | `initialPhase` and transition endpoints must be declared phases       | Analysis                      |
| FR-014-AC-3 | Interview `itemType` ∈ `itemSchemas` and template `phase` is declared | Analysis                      |
| FR-014-AC-4 | An invalid definition fails with `definition_schema_invalid`          | Analysis                      |

## Dependencies

- **Upstream**: [US-005](../usecase/US-005-author-a-workflow-as-a-skill.md) author a workflow as a skill
