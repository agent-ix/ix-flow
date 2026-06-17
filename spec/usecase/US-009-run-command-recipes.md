---
id: US-009
title: "Run command recipes"
type: US
relationships:
  - target: "ix://agent-ix/ix-flow/StR-002"
    type: "traces_to"
  - target: "ix://agent-ix/ix-flow/StR-005"
    type: "traces_to"
---

# [US-009] Run command recipes

## Story

**As an** author of a workflow
**I want** to declare named multi-step recipes my agent can run with a single command
**So that** common sequences are easy to invoke while the engine still keeps everything in order.

This story expresses the author's perspective in informal language and does not
prescribe how recipes are executed or where they stop.

## Context

Workflows often involve the same little sequences of steps over and over. ix-flow
lets an author declare these as named recipes, so the agent can kick off a whole
sequence with one command instead of issuing each step itself. The convenience
does not give up control: the engine still owns validation, still honours gates,
and still tells the agent what to do next. A recipe stops the moment a step fails
or a gate is reached, so the user stays in the loop where it matters.

## Acceptance Examples (Illustrative)

These examples clarify the author's expectations. They are illustrative only —
not test cases and not verification criteria.

### [US-009-EX-1] One command runs the whole sequence

- **Given** an author has declared a named recipe of several steps
- **When** the agent runs that recipe
- **Then** the steps are carried out in order without the agent invoking each one separately

### [US-009-EX-2] A recipe stops at a gate

- **Given** a recipe whose steps include a step that requires human approval
- **When** the agent runs the recipe
- **Then** it stops at the gate so the user can approve before the rest proceeds

## Notes (Informative)

Open question raised in discovery: should a recipe that stopped at a gate be
resumable as a recipe, or continue step by step from there? Captured here for
later analysis; it introduces no requirement.

## Traceability (Informative)

Potential trace relationships established during refinement: this user story may
trace to stakeholder requirements for the agent driving the procedure and for
authoring reusable workflow steps. Links may be updated as understanding evolves.
