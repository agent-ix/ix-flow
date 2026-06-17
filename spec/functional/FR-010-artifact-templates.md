---
id: FR-010
title: "Artifact templates"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/US-007"
    type: "implements"
---

# [FR-010] Artifact templates

## Description

A workflow definition MAY declare `artifactTemplates`. On entering a
template's declared phase, the engine SHALL render that template to its target
path by pure variable substitution, with no code execution, and SHALL append
an `ArtifactRecord` (`templateId`, `path`, `renderedAt`, `contentHash`) to the
run instance's `artifacts`.

Substitution SHALL resolve only the supported variables — `${now}`, `${uuid}`,
`${item.*}`, `${items.<type>.<id>.<field>}`, `${instance.*}`, and
`${project.*}` — from run state. Re-rendering SHALL be idempotent when the
rendered content hash is unchanged. Target paths SHALL resolve within the
project directory, and templates SHALL require path-mode. The engine SHALL
report the errors `template_source_missing` (including when not in path-mode),
`template_write_failed`, `template_render_failed`, and `template_path_invalid`,
as well as variable scope and unresolved-variable errors.

## Behavior

- Templates are evaluated as the run enters the declared phase.
- An unchanged content hash on re-render produces no new write.

## Acceptance Criteria

| ID          | Criteria                                                                      | Verification |
| ----------- | ----------------------------------------------------------------------------- | ------------ |
| FR-010-AC-1 | Entering the declared phase writes the target and appends an `ArtifactRecord` | Analysis     |
| FR-010-AC-2 | Variables resolve from run state by pure substitution with no code execution  | Inspection   |
| FR-010-AC-3 | Re-render is idempotent when the `contentHash` is unchanged                   | Analysis     |
| FR-010-AC-4 | Targets must resolve within the project dir and templates require path-mode   | Analysis     |

## Dependencies

- **Upstream**: US-007 render workflow artifacts
