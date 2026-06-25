---
id: StR-001
title: "Reusable workflow runner"
type: StR
relationships:
  - target: "ix://agent-ix/ix-flow/FR-001"
    type: "satisfied_by"
  - target: "ix://agent-ix/ix-flow/FR-003"
    type: "satisfied_by"
---

# StR-001: Reusable workflow runner

## Stakeholder Need

Teams that adopt agent-oriented workflows shall be able to run those workflows
through a single runner that operates both as a standalone command-line tool and
as a Claude Code plugin, without forking, patching, or re-implementing the
underlying execution engine. The same authored workflow must produce the same
behaviour regardless of which surface invokes it.

## Rationale

Workflow consumers integrate in different contexts: some drive runs directly from
a terminal, others operate through an agent inside Claude Code. If each context
required its own engine or a divergent fork, behaviour would drift, fixes would
have to be applied in multiple places, and the cost of adopting workflows would
rise sharply. A single reusable runner keeps execution semantics consistent and
keeps maintenance concentrated in one place.

## Validation Criteria

This need is considered satisfied when a single authored workflow can be executed
unchanged both from the standalone CLI and from the Claude Code plugin surface,
when both surfaces share one engine rather than separate forks, and when adopting
the runner in either context requires no modification to the engine itself.

## Stakeholders

The primary stakeholders are teams adopting agent-oriented workflows and the
maintainers responsible for the runner. Agents that drive runs through either
surface are affected parties relying on consistent execution.

## Traceability

This need is expected to be satisfied by functional requirements covering the
standalone runner surface and the Claude Code plugin surface over a shared engine.
