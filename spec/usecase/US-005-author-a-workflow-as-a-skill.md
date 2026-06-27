---
id: US-005
title: "Author a workflow as a skill"
type: US
relationships:
  - target: "ix://agent-ix/ix-flow/StR-005"
    type: "traces_to"
---

# US-005: Author a workflow as a skill

## Story

**As a** workflow author
**I want** to package a workflow as an on-disk skill and run it straight from its folder
**So that** I can build and try out a workflow without first publishing it as a package.

This story expresses the author's perspective in informal language and does not
prescribe the skill file format or how the engine loads it.

## Context

Authors iterate on workflows the same way they iterate on code: edit a file, try
it, edit again. ix-flow lets a workflow live as a skill directory on disk — a
skill description, a workflow definition, and optionally a small invariants
script for extra checks. The author can point a run at that folder directly and
exercise the workflow as they build it, with no publishing step in the loop. Fast
local iteration is the whole point.

## Acceptance Examples (Illustrative)

These examples clarify the author's expectations. They are illustrative only —
not test cases and not verification criteria.

### US-005-EX-1: Running a workflow from its folder

- **Given** an author has a workflow defined as a skill directory on disk
- **When** they run it by pointing at that directory
- **Then** the workflow runs without the author having published any package

### US-005-EX-2: Iterating with custom checks

- **Given** the author adds an invariants script alongside the workflow definition
- **When** they run the workflow again from the same folder
- **Then** their custom checks take effect on the next run

## Notes (Informative)

Open question raised in discovery: how much of the skill structure should be
scaffolded for a new author versus written by hand? Captured here for later
analysis; it introduces no requirement.

## Traceability (Informative)

Potential trace relationships established during refinement: this user story may
trace to a stakeholder requirement for authoring workflows as portable skills.
Links may be updated as understanding evolves.
