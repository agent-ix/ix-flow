---
id: StR-005
title: "External workflow authoring"
type: StR
relationships:
  - target: "ix://agent-ix/ix-flow/FR-014"
    type: "satisfied_by"
  - target: "ix://agent-ix/ix-flow/FR-016"
    type: "satisfied_by"
---

# StR-005: External workflow authoring

## Stakeholder Need

Authors outside the core engine team shall be able to author and ship their own
workflows, both as path-mode skill directories and as name-mode published workflow
sets, and shall be able to run those workflows without modifying or forking the
execution engine. Authoring a workflow must not require privileged access to or
changes within the engine.

## Rationale

The value of the runner grows when many parties can contribute workflows, but that
only holds if authoring is open and decoupled from the engine. If shipping a new
workflow required engine changes or a fork, external authors would be blocked,
contributions would stall, and forks would fragment behaviour. Supporting both a
directory-based authoring mode and a published-set mode lets authors choose the
distribution path that fits them while leaving the engine untouched.

## Validation Criteria

This need is considered satisfied when an author outside the core team can create a
workflow as a path-mode skill directory and as a name-mode published set, when
either can be executed by the runner, and when neither authoring nor execution
requires modifying or forking the engine.

## Stakeholders

The primary stakeholders are external workflow authors and the engine maintainers
who keep the authoring contract stable. Users who run externally authored
workflows are affected parties.

## Traceability

This need is expected to be satisfied by functional requirements covering external
path-mode and name-mode workflow authoring and execution over an unmodified engine.
