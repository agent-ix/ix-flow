---
id: US-007
title: "Author template-driven artifacts"
type: US
relationships:
  - target: "ix://agent-ix/ix-flow/StR-005"
    type: "traces_to"
---

# [US-007] Author template-driven artifacts

## Story

**As a** skill author
**I want** to declare artifact templates that get scaffolded as files when a phase begins
**So that** each run starts from consistent, pre-filled documents instead of blank ones.

This story expresses the author's perspective in informal language and does not
prescribe the template format or how files are rendered.

## Context

Many workflows produce documents as they go, and authors want those documents to
start from a known shape rather than being typed from scratch each time. ix-flow
lets an author declare templates in the workflow definition; when a run enters a
phase, the engine renders the declared templates into files, filling in values
the run has already gathered. The author defines the shape once, and every run
gets the same well-formed starting artifacts, populated from its own state.

## Acceptance Examples (Illustrative)

These examples clarify the author's expectations. They are illustrative only —
not test cases and not verification criteria.

### [US-007-EX-1] Files appear when a phase starts

- **Given** an author has declared artifact templates for a phase
- **When** a run enters that phase
- **Then** the corresponding files are scaffolded for the run to work from

### [US-007-EX-2] Templates reflect the run's own data

- **Given** a template that references values gathered earlier in the run
- **When** the file is scaffolded on phase entry
- **Then** the file is populated with that run's data rather than placeholders

## Notes (Informative)

Open question raised in discovery: what should happen if a templated file already
exists when the phase is entered again? Captured here for later analysis; it
introduces no requirement.

## Traceability (Informative)

Potential trace relationships established during refinement: this user story may
trace to a stakeholder requirement for authoring workflows that scaffold their
own artifacts. Links may be updated as understanding evolves.
