---
id: NFR-004
title: "Agent workflow runner positioning"
type: NFR
quality_attribute: functional_suitability
relationships:
  - target: "ix://agent-ix/ix-flow/FR-003"
    type: "constrains"
---

# [NFR-004] Agent workflow runner positioning

## Statement

ix-flow SHALL remain an agent workflow runner and SHALL NOT become a general
BPM or automation engine. The command surface SHALL stay scoped to workflow
lifecycle and authoring, excluding general-purpose orchestration features.

## Measurement and Evaluation

| Metric                                                      | Target | Threshold | Method     |
| ----------------------------------------------------------- | ------ | --------- | ---------- |
| Out-of-scope BPM/automation features in the command surface | 0      | 0         | Review     |
| Commands outside lifecycle + authoring scope                | 0      | 0         | Inspection |

## Verification

Verified by Review of the command surface against the lifecycle + authoring
scope, confirming no general BPM or automation features are present.

## Rationale

Keeping the surface scoped preserves the runner's purpose as an agent-driven
workflow tool rather than a general process engine.

## Scope

Applies to the overall ix-flow command surface.

## Dependencies

- Constrains FR-003 create and resolve workflow runs
