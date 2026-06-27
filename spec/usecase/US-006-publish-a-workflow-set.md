---
id: US-006
title: "Publish a workflow set"
type: US
relationships:
  - target: "ix://agent-ix/ix-flow/StR-001"
    type: "traces_to"
  - target: "ix://agent-ix/ix-flow/StR-005"
    type: "traces_to"
---

# US-006: Publish a workflow set

## Story

**As an** author with a group of related workflows
**I want** to publish them so users invoke each one by name instead of a filesystem path
**So that** people can use my workflows without knowing where the files live on disk.

This story expresses the author's perspective in informal language and does not
prescribe the packaging format or how names are resolved.

## Context

Once a workflow is mature, an author wants others to use it without dealing with
folders. Beyond local skill directories run by path, ix-flow lets an author
publish a set of related workflows so they can be invoked by name. Because many
sets may be installed, the author also wants to know when a name they are
publishing clashes with one already in use, so collisions are caught rather than
silently shadowing another workflow.

## Acceptance Examples (Illustrative)

These examples clarify the author's expectations. They are illustrative only —
not test cases and not verification criteria.

### US-006-EX-1: Invoking a published workflow by name

- **Given** an author has published a set of related workflows
- **When** a user runs one of them by its name
- **Then** the workflow runs without the user supplying any filesystem path

### US-006-EX-2: A name conflict is reported

- **Given** a workflow name in the set matches one that is already available
- **When** the author publishes the set
- **Then** the conflict is reported rather than passing unnoticed

## Notes (Informative)

Open question raised in discovery: when names conflict, should publishing be
refused outright or allowed with a clear warning? Captured here for later
analysis; it introduces no requirement.

## Traceability (Informative)

Potential trace relationships established during refinement: this user story may
trace to stakeholder requirements for running workflows and for distributing them
as named, published sets. Links may be updated as understanding evolves.
