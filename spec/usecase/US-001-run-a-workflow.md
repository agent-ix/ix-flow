---
id: US-001
title: "Run a workflow to completion"
type: US
relationships:
  - target: "ix://agent-ix/ix-flow/StR-001"
    type: "traces_to"
  - target: "ix://agent-ix/ix-flow/StR-002"
    type: "traces_to"
---

# US-001: Run a workflow to completion

## Story

**As a** user with a workflow installed
**I want** to start a workflow and have my agent drive it through its phases to the end
**So that** the whole multi-step procedure runs to a finished state without me stepping through it by hand.

This story expresses the user's perspective in informal language and does not
prescribe how the engine advances phases or evaluates transitions.

## Context

ix-flow runs agent workflows as state machines. A user installs a workflow,
then asks their coding agent to carry out the task. The agent, not the user,
invokes the CLI: it kicks off the run and keeps advancing the run from phase to
phase until a terminal phase is reached. The user simply wants the end result
and a clear sense of where things stand along the way.

## Acceptance Examples (Illustrative)

These examples clarify the user's expectations. They are illustrative only —
not test cases and not verification criteria.

### US-001-EX-1: A run reaches its terminal phase

- **Given** a user has a workflow installed and asks their agent to run it
- **When** the agent starts the run and advances it through each phase in turn
- **Then** the run finishes at its terminal phase and the user can see it completed

### US-001-EX-2: The user checks where a run stands

- **Given** a run is partway through its phases
- **When** the user asks about progress
- **Then** the agent can report the run's current phase and status

## Notes (Informative)

Open question raised in discovery: when a run involves many short phases, should
progress be summarised for the user or reported phase by phase? Captured here for
later analysis; it introduces no requirement.

## Traceability (Informative)

Potential trace relationships established during refinement: this user story may
trace to stakeholder requirements for running workflows end to end and for the
agent driving the procedure. Links may be updated as understanding evolves.
