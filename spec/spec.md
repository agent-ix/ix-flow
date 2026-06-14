---
artifact_type: master-requirements
name: ix-flow
org: agent-ix
component_type: cli
---

# ix-flow Phase 0 Spec

## Description

`ix-flow` SHALL provide a standalone installable CLI for running Agent IX
agent-oriented workflows outside the broader `ix` umbrella CLI.

## Requirements

| ID      | Requirement                                                                                   | Verification |
| ------- | --------------------------------------------------------------------------------------------- | ------------ |
| FR-001  | The CLI SHALL create workflow runs from a registered definition or path-mode skill directory. | Test         |
| FR-002  | The CLI SHALL expose status, resume, advance, ack, and history commands for persisted runs.   | Test         |
| FR-003  | The CLI SHALL store default run state under `~/.ix/flows`.                                    | Test         |
| FR-004  | The CLI SHALL use the standalone `@agent-ix/ix-cli-core@0.10.0` package.                      | Inspection   |
| NFR-001 | The CLI SHALL be positioned as an agent workflow runner, not a generic BPM engine.            | Review       |

## Dependencies

- `@agent-ix/ix-cli-core`
- `@agent-ix/workflow-cli-plugin`
- `@agent-ix/workflow-core`
