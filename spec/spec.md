---
type: master-requirements
name: ix-flow
org: agent-ix
component_type: cli
title: "ix-flow Master Requirements"
---

# Master Requirements Specification

## Purpose

`ix-flow` is the Agent IX workflow runner: a standalone CLI and Claude Code plugin that
runs agent-oriented workflows defined as state machines (phases, transitions, human gates,
and invariants). An agent calls `ix-flow` to create a run, advance it, record interview
answers, run recipes, and verify integrity; humans step in only to approve `hitl` gates.
This document states what the tool does, the boundary of its responsibility, and the
quality attributes it upholds, so that implementers, reviewers, and downstream consumers
share one authoritative definition of done.

## Scope

### In Scope

- The `ix-flow` command surface — `run`, `status`, `resume`, `advance`, `ack`,
  `record-answers`, `recipe`, `add-item`, `update-item`, `link-items`, `verify`, and
  `history` — and the persisted run state each command operates on.
- The vendored workflow engine in `src/workflow-core/` and `src/workflow-runner/`:
  the definition model, instance state, hash-chained event log, local instance store,
  phase/transition/gate/invariant machinery, interviews, artifact templates, and recipes.
- Authoring surfaces: the `def.yaml` workflow definition format, the on-disk skill format
  (path mode), name-mode workflow resolution, and the Claude Code plugin packaging.
- Local run-state storage rooted at `~/.ix/flows` by default, with `--state-dir` and
  `--config-root` overrides.

### Out of Scope

- Runtime context only — config-root resolution and flag-over-env-over-config precedence —
  is delegated to `@agent-ix/ix-cli-core`. The workflow engine itself is vendored here,
  not delegated.
- Generic business-process modelling; `ix-flow` is an agent workflow runner, not a BPM or
  automation engine ([NFR-004](./nonfunctional/NFR-004-runner-positioning.md)).

## System Overview

### System Description

`ix-flow` parses a command and global flags, configures the runtime context against a
config root (default `~/.ix`) via `@agent-ix/ix-cli-core`, and delegates lifecycle
operations to a vendored `WorkflowCommandRunner`. Runs are created from a registered
definition name (name mode) or a path-mode skill directory (`--path`), pinned to the
definition's content hash, and persisted as an append-only, SHA-256 hash-chained event log
under `~/.ix/flows`. Commands inspect and advance runs, defer at human gates, record
interview answers, run recipes, mutate workflow data, and verify chain integrity. Output is
human-readable by default or a structured JSON envelope under `--json`.

### Intended Users

Agent IX harnesses and the agents they drive — which invoke `ix-flow` to create, inspect,
advance, and audit workflow runs — and workflow authors, who package workflows as on-disk
skills or published plugin sets.

## Requirements Architecture

The functional and non-functional requirements are listed below. Each is verified by the
indicated method, traces to the user stories and stakeholder requirements in this bundle,
and is covered in `matrix.md`.

| ID                                                          | Requirement                                | Verification |
| ----------------------------------------------------------- | ------------------------------------------ | ------------ |
| [FR-001](./functional/FR-001-cli-and-plugin-packaging.md)   | CLI and Claude Code plugin packaging       | Inspection   |
| [FR-002](./functional/FR-002-runtime-context-and-flags.md)  | Runtime context and global flags           | Test         |
| [FR-003](./functional/FR-003-create-and-resolve-runs.md)    | Create and resolve workflow runs           | Test         |
| [FR-004](./functional/FR-004-inspect-runs.md)               | Report run status                          | Test         |
| [FR-005](./functional/FR-005-advance-phases.md)             | Advance phases                             | Test         |
| [FR-006](./functional/FR-006-human-gates.md)                | Human approval gates                       | Test         |
| [FR-007](./functional/FR-007-record-interview-answers.md)   | Record interview answers                   | Test         |
| [FR-008](./functional/FR-008-run-command-recipes.md)        | Run command recipes                        | Test         |
| [FR-009](./functional/FR-009-workflow-data-items.md)        | Add a workflow item                        | Test         |
| [FR-010](./functional/FR-010-artifact-templates.md)         | Artifact templates                         | Test         |
| [FR-011](./functional/FR-011-result-envelope.md)            | Structured result envelope                 | Test         |
| [FR-012](./functional/FR-012-local-instance-store.md)       | Local instance store                       | Test         |
| [FR-013](./functional/FR-013-event-log-and-integrity.md)    | Event log and integrity                    | Test         |
| [FR-014](./functional/FR-014-workflow-definition-format.md) | Workflow definition format                 | Test         |
| [FR-015](./functional/FR-015-invariants.md)                 | Invariant resolution and custom invariants | Test         |
| [FR-016](./functional/FR-016-skill-on-disk-format.md)       | Skill on-disk format                       | Test         |
| [FR-017](./functional/FR-017-resume-a-run.md)               | Resume a run                               | Test         |
| [FR-018](./functional/FR-018-query-run-history.md)          | Query run history                          | Test         |
| [FR-019](./functional/FR-019-update-a-workflow-item.md)     | Update a workflow item                     | Test         |
| [FR-020](./functional/FR-020-link-workflow-items.md)        | Link workflow items                        | Test         |
| [FR-021](./functional/FR-021-optimistic-concurrency.md)     | Optimistic concurrency control             | Analysis     |
| [NFR-001](./nonfunctional/NFR-001-agent-readable-output.md) | Agent-readable, deterministic output       | Test         |
| [NFR-002](./nonfunctional/NFR-002-local-first.md)           | Local-first operation                      | Inspection   |
| [NFR-003](./nonfunctional/NFR-003-tamper-evident-state.md)  | Auditable, tamper-evident state            | Analysis     |
| [NFR-004](./nonfunctional/NFR-004-runner-positioning.md)    | Agent workflow runner positioning          | Review       |

## References

- ISO/IEC/IEEE 29148 — Requirements engineering.
- ISO/IEC 25010 — Product quality model (non-functional attributes).
- The `ix-flow` source repository, `README.md`, and `docs/guide.md`.
- Runtime dependencies: `@agent-ix/ix-cli-core`, `yaml`, and `zod`.
