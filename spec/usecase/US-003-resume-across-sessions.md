---
id: US-003
title: "Resume a workflow across sessions"
type: US
relationships:
  - target: "ix://agent-ix/ix-flow/StR-003"
    type: "traces_to"
---

# US-003: Resume a workflow across sessions

## Story

**As a** user whose work spans more than one sitting
**I want** my agent to pick a paused run back up later
**So that** I can stop and come back without losing the progress a workflow has already made.

This story expresses the user's perspective in informal language and does not
prescribe how run state is persisted or reloaded.

## Context

Workflows can be long-running, and a user rarely finishes one in a single
session. Because run state is kept on disk, a run that was started yesterday — or
that paused at a gate — is still there today. When the user returns, the agent
can look up the run and continue it from exactly where it left off, rather than
starting over. Persistence is what makes coming back later possible.

## Acceptance Examples (Illustrative)

These examples clarify the user's expectations. They are illustrative only —
not test cases and not verification criteria.

### US-003-EX-1: A paused run is still there later

- **Given** a user started a run in an earlier session and then stopped
- **When** the user returns in a new session and asks about their runs
- **Then** the agent can find the earlier run and report where it stands

### US-003-EX-2: The agent continues from where it left off

- **Given** a saved run that has not yet finished
- **When** the user asks their agent to carry on with it
- **Then** the run resumes from its last phase rather than from the beginning

## Notes (Informative)

Open question raised in discovery: how long should completed or abandoned runs be
kept before they are cleared away? Captured here for later analysis; it
introduces no requirement.

## Traceability (Informative)

Potential trace relationships established during refinement: this user story may
trace to a stakeholder requirement for durable, resumable run state. Links may be
updated as understanding evolves.
