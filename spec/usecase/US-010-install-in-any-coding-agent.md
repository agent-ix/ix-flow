---
id: US-010
title: "Install ix-flow in the coding agent of my choice"
type: US
relationships:
  - target: "ix://agent-ix/ix-flow/StR-001"
    type: "traces_to"
---

# US-010: Install ix-flow in the coding agent of my choice

## Story

**As a** developer who runs agent workflows in my own coding agent
**I want** to install ix-flow as a plugin in whichever agent I already use — Claude
Code, OpenAI Codex, opencode, or GitHub Copilot
**So that** the `ix-flow` runner and its authoring skills are available in my agent
without my having to switch tools or re-author anything per agent.

This story expresses the adopter's perspective in informal language and does not
prescribe the manifest formats or install commands each agent uses.

## Context

Today ix-flow installs as a Claude Code plugin only, even though its `ix-flow` and
`ix-flow-create` skills are plain `skills/<name>/SKILL.md` files that several
coding agents can read. Adopters on Codex, opencode, or Copilot have no first-class
install path and must copy files by hand. Because the same skill tree is the common
denominator across these agents, the same bundle should be installable from each of
them through that agent's own plugin/skill mechanism, leaving the CLI install
(global npm) unchanged.

## Acceptance Examples (Illustrative)

These examples clarify the adopter's expectations. They are illustrative only —
not test cases and not verification criteria.

### US-010-EX-1: Install from Codex

- **Given** a developer working in OpenAI Codex
- **When** they add the ix-flow marketplace and install the plugin
- **Then** the `ix-flow` and `ix-flow-create` skills appear in Codex without any
  per-agent re-authoring

### US-010-EX-2: Install from opencode or Copilot

- **Given** a developer working in opencode or GitHub Copilot
- **When** they install ix-flow's skills for their agent (e.g. `gh skill install`
  or `copilot plugin marketplace add`)
- **Then** the same skills they would get in Claude Code become available

## Dependencies (Contextual)

Relationships observed during discovery. Upstream: the reusable-runner stakeholder
need ([StR-001](../stakeholder/StR-001-reusable-workflow-runner.md)), which already
spans the standalone CLI and the Claude Code plugin surface. Downstream: a
non-functional requirement that the skill tree stay the single source of truth
across agents. These are potential relationships, not formal traceability.

## Traceability (Informative)

This user story traces to the stakeholder need for a single reusable runner usable
across surfaces, extending that need from one plugin surface to several. Links may
be updated as understanding evolves.
