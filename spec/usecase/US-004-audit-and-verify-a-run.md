---
id: US-004
title: "Audit and verify a run"
type: US
relationships:
  - target: "ix://agent-ix/ix-flow/StR-003"
    type: "traces_to"
---

# US-004: Audit and verify a run

## Story

**As a** user accountable for what a workflow did
**I want** to review a run's history and confirm its record has not been tampered with
**So that** I can trust the account of what happened and show it to others with confidence.

This story expresses the user's perspective in informal language and does not
prescribe how the history is recorded or how its integrity is checked.

## Context

When a workflow touches real work, the user needs to be able to look back and see
what took place — which phases ran, when gates were approved, what answers were
recorded. ix-flow keeps an event log for each run, and the user wants two things
from it: a readable history of the run, and assurance that the log itself has not
been altered after the fact. Being able to verify integrity turns the history
from a convenience into a trustworthy record.

## Acceptance Examples (Illustrative)

These examples clarify the user's expectations. They are illustrative only —
not test cases and not verification criteria.

### US-004-EX-1: Reviewing what happened

- **Given** a run that has progressed through several phases
- **When** the user asks to see its history
- **Then** the user can read the sequence of events that the run recorded

### US-004-EX-2: Confirming the record is intact

- **Given** a run's recorded history
- **When** the user asks to verify it
- **Then** the user is told whether the record is intact or has been tampered with

## Notes (Informative)

Open question raised in discovery: should verification run automatically whenever
history is reviewed, or only when the user explicitly asks? Captured here for
later analysis; it introduces no requirement.

## Traceability (Informative)

Potential trace relationships established during refinement: this user story may
trace to a stakeholder requirement for an auditable, tamper-evident run record.
Links may be updated as understanding evolves.
