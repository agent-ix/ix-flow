---
id: US-008
title: "Author structured interviews"
type: US
relationships:
  - target: "ix://agent-ix/ix-flow/StR-005"
    type: "traces_to"
---

# [US-008] Author structured interviews

## Story

**As a** skill author
**I want** to declare a set of questions that must be answered before a workflow moves on
**So that** a run cannot advance until the information it depends on has actually been gathered.

This story expresses the author's perspective in informal language and does not
prescribe how answers are recorded or how completeness is judged.

## Context

Some phases of a workflow need real input before later steps make sense. ix-flow
lets an author declare a question bank as part of the workflow and tie it to a
transition, so the run stays put until those questions are answered and the set
is complete. The agent gathers and records the answers as it works; only then can
the run proceed. The author designs the questions once, and the engine enforces
that they are addressed before moving forward.

## Acceptance Examples (Illustrative)

These examples clarify the author's expectations. They are illustrative only —
not test cases and not verification criteria.

### [US-008-EX-1] The run waits for answers

- **Given** an author has declared a question bank that gates a transition
- **When** a run reaches that transition with the questions unanswered
- **Then** the run does not advance until the answers are recorded

### [US-008-EX-2] Completing the answers lets the run continue

- **Given** the agent has recorded answers covering the declared questions
- **When** the run is asked to advance again
- **Then** the transition is satisfied and the run moves on

## Notes (Informative)

Open question raised in discovery: should partially answered question banks be
saved and resumed, or must they be completed in one pass? Captured here for later
analysis; it introduces no requirement.

## Traceability (Informative)

Potential trace relationships established during refinement: this user story may
trace to a stakeholder requirement for authoring workflows that gather structured
input. Links may be updated as understanding evolves.
