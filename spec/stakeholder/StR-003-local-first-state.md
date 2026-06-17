---
id: StR-003
title: "Local-first workflow state"
type: StR
relationships:
  - target: "ix://agent-ix/ix-flow/FR-012"
    type: "satisfied_by"
  - target: "ix://agent-ix/ix-flow/FR-013"
    type: "satisfied_by"
---

# [StR-003] Local-first workflow state

## Stakeholder Need

Run state shall default to a local directory owned by the user, must be recorded
as an auditable, append-only event log that captures the history of a run, and
must allow any corruption or tampering of that log to be detected by a dedicated
verification command. Operating a workflow run shall not require a remote service
to hold its state.

## Rationale

Users need to start and complete workflow runs without depending on external
infrastructure, and they need confidence that the recorded history of a run is
both complete and trustworthy. An append-only log gives an auditable account of
what happened, and a verification capability lets users detect when that account
has been altered or damaged, so they can trust or reject a run's history.

## Validation Criteria

This need is considered satisfied when run state is stored in a local directory by
default, when the history of a run is recorded as an append-only event log, and
when a verification command reports a run as intact for an unmodified log and as
corrupt for a log that has been altered.

## Stakeholders

The primary stakeholders are users who own and operate runs locally and auditors
who rely on the integrity of a run's recorded history. Tooling that reads run
history is an affected party.

## Traceability

This need is expected to be satisfied by functional requirements covering local
append-only event-log storage and a run-integrity verification command.
