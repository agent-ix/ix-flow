---
type: master-requirements
name: ix-flow
org: agent-ix
component_type: cli
title: "ix-flow Phase 0 Spec"
---

# Master Requirements Specification

## Purpose

`ix-flow` SHALL provide a standalone installable CLI for running Agent IX
agent-oriented workflows outside the broader `ix` umbrella CLI. This document
states what the CLI does, the boundary of its responsibility, and the quality
attributes it must uphold, so that implementers, reviewers, and downstream
consumers share one authoritative definition of done.

## Scope

### In Scope

- The `ix-flow` command surface — `run`, `status`, `resume`, `advance`, `ack`,
  and `history` — and the persisted workflow-run state each command operates on.
- Run state storage rooted at `~/.ix/flows` by default, with `--state-dir` and
  `--config-root` overrides.

### Out of Scope

- The workflow engine internals, which are delegated to the standalone
  `@agent-ix/ix-cli-core` package rather than reimplemented here.
- Generic business-process modelling; `ix-flow` is positioned as an agent
  workflow runner, not a BPM engine.

## System Overview

### System Description

`ix-flow` parses a command and global flags, configures the runtime context
against a config root (default `~/.ix`), and delegates lifecycle operations to a
`WorkflowCommandRunner`. Runs are created from a registered definition name or a
path-mode skill directory (`--path`), and can be inspected and advanced through
`status`, `resume`, `advance`, `ack`, and `history`. Output is human-readable by
default or JSON envelopes under `--json`.

### Intended Users

Agent IX harnesses and the agents they drive, which invoke `ix-flow` to create,
inspect, and advance agent workflow runs.

## Requirements Architecture

The functional and non-functional requirements that make up this specification
are listed below. Each is verified by the indicated method, and coverage is
tracked in `matrix.md`.

| ID      | Requirement                                                                                   | Verification |
| ------- | --------------------------------------------------------------------------------------------- | ------------ |
| FR-001  | The CLI SHALL create workflow runs from a registered definition or path-mode skill directory. | Test         |
| FR-002  | The CLI SHALL expose status, resume, advance, ack, and history commands for persisted runs.   | Test         |
| FR-003  | The CLI SHALL store default run state under `~/.ix/flows`.                                     | Test         |
| FR-004  | The CLI SHALL use the standalone `@agent-ix/ix-cli-core@0.10.1` package.                       | Inspection   |
| NFR-001 | The CLI SHALL be positioned as an agent workflow runner, not a generic BPM engine.            | Review       |

## References

- ISO/IEC/IEEE 29148 — Requirements engineering.
- The `ix-flow` source repository and `README.md`.
- Runtime dependencies: `@agent-ix/ix-cli-core`, `yaml`, and `zod`.
