---
id: FR-002
title: "Runtime context and global flags"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/StR-004"
    type: "traces_to"
---

# [FR-002] Runtime context and global flags

## Description

The CLI SHALL configure its runtime context through `@agent-ix/ix-cli-core`
by calling `configureRuntimeContext` with `configRoot` (default `~/.ix`),
`configNamespace` `ix`, `projectConfigRoot` `.ix`, and a
`projectConfigEnabled` flag.

The CLI SHALL resolve configuration values with flag-over-environment-over-
config precedence. The CLI SHALL honor the global flags `--json`,
`--state-dir` (default `~/.ix/flows`), `--config-root` (default `~/.ix`),
and `--no-project-config`. When `--json` is set, command output SHALL be
emitted as a JSON envelope; otherwise output SHALL be human-readable.

## Inputs

- Global flags: `--json`, `--state-dir`, `--config-root`,
  `--no-project-config`, `--version`, `--help`
- Environment variables and configuration files resolved by ix-cli-core

## Outputs

- A configured runtime context (config root, namespace, project-config state)
- Human-readable output, or a JSON envelope when `--json` is set

## Acceptance Criteria

| ID          | Criteria                                                                                  | Verification                  |
| ----------- | ----------------------------------------------------------------------------------------- | ----------------------------- |
| FR-002-AC-1 | With no overrides, the state dir defaults to `~/.ix/flows` and the config root to `~/.ix` | Test (tests/commands.test.ts) |
| FR-002-AC-2 | `--state-dir` overrides the default state directory                                       | Test (tests/commands.test.ts) |
| FR-002-AC-3 | `--json` switches command output to the JSON envelope                                     | Test (tests/gate.test.ts)     |
| FR-002-AC-4 | `--version` and `--help` print version and usage                                          | Test (tests/scripts.test.ts)  |

## Dependencies

- **Upstream**: [StR-004](../stakeholder/StR-004-shared-cli-contract.md) shared CLI contract
