---
id: StR-004
title: "Shared CLI contract"
type: StR
relationships:
  - target: "ix://agent-ix/ix-flow/FR-002"
    type: "satisfied_by"
  - target: "ix://agent-ix/ix-flow/FR-011"
    type: "satisfied_by"
---

# StR-004: Shared CLI contract

## Stakeholder Need

The command-line interface shall honour shared runtime conventions, including a
common configuration root and a precedence order in which an explicit flag
overrides an environment variable, which in turn overrides configured values. The
interface must also be able to emit machine-readable output that an agent can
parse deterministically.

## Rationale

Agents and users move between tools in the same ecosystem and expect configuration
and precedence to behave consistently across them; divergent conventions cause
misconfiguration and surprising results. Agents that drive the CLI also need
output they can reliably parse rather than scrape from free-form text, so that
they can branch on results without brittle heuristics.

## Validation Criteria

This need is considered satisfied when the CLI resolves configuration from a shared
root, when an explicit flag takes precedence over an environment variable and an
environment variable takes precedence over configured values, and when the CLI can
produce machine-readable output that an agent parses without scraping human text.

## Stakeholders

The primary stakeholders are agents that drive the CLI and users who configure it.
Maintainers of other tools that share the same runtime conventions are affected
parties.

## Traceability

This need is expected to be satisfied by functional requirements covering shared
runtime configuration and precedence and machine-readable command output.
