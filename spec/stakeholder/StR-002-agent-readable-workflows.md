---
id: StR-002
title: "Agent-readable workflows"
type: StR
relationships:
  - target: "ix://agent-ix/ix-flow/FR-005"
    type: "satisfied_by"
  - target: "ix://agent-ix/ix-flow/FR-016"
    type: "satisfied_by"
---

# StR-002: Agent-readable workflows

## Stakeholder Need

Workflows shall ship human- and agent-readable Markdown skills that orient an
agent to the work at hand while the engine remains the authority that enforces
phases, gates, and invariants. Those skills must direct the agent to query the
authoritative run status before acting, rather than infer the current phase from
its own conversational memory.

## Rationale

An agent driving a workflow can lose track of where a run actually is, because its
memory of prior turns may be stale, compacted, or simply wrong. If the agent acts
on an inferred phase, it can skip gates or violate invariants. Pairing orienting
skills with an engine that holds the authoritative state, and instructing the
agent to consult that state, keeps the agent aligned with reality and prevents it
from improvising past enforced controls.

## Validation Criteria

This need is considered satisfied when each workflow provides Markdown skills that
orient an agent, when those skills instruct the agent to read authoritative run
status rather than rely on memory, and when phases, gates, and invariants are
enforced by the engine independently of what the agent believes.

## Stakeholders

The primary stakeholders are workflow authors who write the skills and the agents
that consume them. Workflow owners who depend on gates and invariants being
honoured are affected parties.

## Traceability

This need is expected to be satisfied by functional requirements covering authored
Markdown skills and engine-enforced run status that the skills defer to.
