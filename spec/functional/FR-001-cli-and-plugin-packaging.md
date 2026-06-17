---
id: FR-001
title: "CLI and Claude Code plugin packaging"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/US-006"
    type: "implements"
---

# [FR-001] CLI and Claude Code plugin packaging

## Description

ix-flow SHALL be installable as a global npm CLI exposing the `ix-flow`
binary AND as a Claude Code plugin exposing the `/ix-flow` and
`/ix-flow-create` commands.

The npm package SHALL declare a `bin` entry named `ix-flow` whose launcher
(`bin/ix-flow.js`) invokes the `dist/cli.js` entry point. The package SHALL
ship a Claude plugin manifest (`.claude-plugin/plugin.json`) and marketplace
manifest (`.claude-plugin/marketplace.json`), the command definitions
`commands/ix-flow.md` and `commands/ix-flow-create.md`, and the skill
definitions `skills/ix-flow/SKILL.md` and `skills/ix-flow-create/SKILL.md`.

The published npm tarball SHALL restrict its contents to the `files`
whitelist (`dist`, `bin`, `LICENSE`, `README`); the plugin directories
(`.claude-plugin`, `commands`, `skills`) SHALL NOT be included in the
published npm tarball.

## Constraints

| ID           | Constraint                                                                      | Type      | Validation |
| ------------ | ------------------------------------------------------------------------------- | --------- | ---------- |
| FR-001-CON-1 | The npm `files` whitelist SHALL contain only `dist`, `bin`, `LICENSE`, `README` | Packaging | Inspection |

## Acceptance Criteria

| ID          | Criteria                                                                                                                                | Verification  |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| FR-001-AC-1 | `package.json` declares a `bin` named `ix-flow` resolving through `bin/ix-flow.js` to `dist/cli.js`                                     | Inspection    |
| FR-001-AC-2 | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, the `commands/` definitions, and the `skills/` definitions are present | Inspection    |
| FR-001-AC-3 | The plugin installs via `/plugin marketplace add agent-ix/ix-flow` followed by `/plugin install ix-flow@ix-flow`                        | Demonstration |
| FR-001-AC-4 | The published npm tarball excludes the plugin directories by virtue of the `files` whitelist                                            | Inspection    |

## Dependencies

- **Upstream**: [US-006](../usecase/US-006-publish-a-workflow-set.md) publish a workflow set
