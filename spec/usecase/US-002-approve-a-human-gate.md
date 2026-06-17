---
id: US-002
title: "Approve a human gate"
type: US
relationships:
  - target: "ix://agent-ix/ix-flow/StR-002"
    type: "traces_to"
---

# [US-002] Approve a human gate

## Story

**As a** user overseeing a workflow
**I want** to be asked for my approval before a gated step happens
**So that** sensitive or irreversible work proceeds only once I have agreed to it.

This story expresses the user's perspective in informal language and does not
prescribe how the gate defers the run or how approval is recorded.

## Context

Some workflow steps need a human's blessing before the agent goes any further.
When the run reaches such a step, it pauses and waits for the user. The user is
the only human in the loop — the agent drives everything else — so the gate is
the user's moment to review what is about to happen and decide whether the run
should continue. Once the user approves, the run resumes from where it paused.

## Acceptance Examples (Illustrative)

These examples clarify the user's expectations. They are illustrative only —
not test cases and not verification criteria.

### [US-002-EX-1] The run waits for approval

- **Given** a run reaches a step that requires human approval
- **When** the agent tries to advance past it
- **Then** the run pauses and the user is asked to approve before anything more happens

### [US-002-EX-2] Approval lets the run continue

- **Given** a run is paused waiting for the user at a gate
- **When** the user approves the pending step
- **Then** the run continues on to the next phase

## Notes (Informative)

Open question raised in discovery: should a user be able to decline a gate
outright, and what should happen to the run if they do? Captured here for later
analysis; it introduces no requirement.

## Traceability (Informative)

Potential trace relationships established during refinement: this user story may
trace to a stakeholder requirement for human approval of gated steps. Links may
be updated as understanding evolves.
