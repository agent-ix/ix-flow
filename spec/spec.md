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
  automation engine (NFR-004).

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

| ID      | Requirement                                | Verification |
| ------- | ------------------------------------------ | ------------ |
| FR-001  | CLI and Claude Code plugin packaging       | Inspection   |
| FR-002  | Runtime context and global flags           | Test         |
| FR-003  | Create and resolve workflow runs           | Test         |
| FR-004  | Report run status                          | Test         |
| FR-005  | Advance phases                             | Test         |
| FR-006  | Human approval gates                       | Test         |
| FR-007  | Record interview answers                   | Test         |
| FR-008  | Run command recipes                        | Test         |
| FR-009  | Add a workflow item                        | Test         |
| FR-010  | Artifact templates                         | Test         |
| FR-011  | Structured result envelope                 | Test         |
| FR-012  | Local instance store                       | Test         |
| FR-013  | Event log and integrity                    | Test         |
| FR-014  | Workflow definition format                 | Test         |
| FR-015  | Invariant resolution and custom invariants | Test         |
| FR-016  | Skill on-disk format                       | Test         |
| FR-017  | Resume a run                               | Test         |
| FR-018  | Query run history                          | Test         |
| FR-019  | Update a workflow item                     | Test         |
| FR-020  | Link workflow items                        | Test         |
| FR-021  | Optimistic concurrency control             | Analysis     |
| NFR-001 | Agent-readable, deterministic output       | Test         |
| NFR-002 | Local-first operation                      | Inspection   |
| NFR-003 | Auditable, tamper-evident state            | Analysis     |
| NFR-004 | Agent workflow runner positioning          | Review       |

## References

- ISO/IEC/IEEE 29148 — Requirements engineering.
- ISO/IEC 25010 — Product quality model (non-functional attributes).
- The `ix-flow` source repository, `README.md`, and `docs/guide.md`.
- Runtime dependencies: `@agent-ix/ix-cli-core`, `yaml`, and `zod`.
