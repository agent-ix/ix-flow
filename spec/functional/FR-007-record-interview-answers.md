---
id: FR-007
title: "Record interview answers"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/US-008"
    type: "implements"
---

# FR-007: Record interview answers

## Description

The `record-answers <run-id> <interview-id> --answers '<json>'` command
SHALL validate and persist the supplied answers as one typed item. The
command SHALL accept `--answers-file <path>` and `--merge`.

A transition gated on `interview.complete:<id>` SHALL block until the
interview's required answers are present, where present means non-empty and
correctly typed; the blocking error SHALL name the missing answer keys.
Answers with an invalid enum value, an invalid type, or fewer than the
required items SHALL be rejected at record time. Malformed answer JSON SHALL
produce a usage error. Questions whose `followUpIf` condition is met after a
transition SHALL surface as `interview_followups`.

## Inputs

- `<run-id>`, `<interview-id>`, and `--answers '<json>'` (or
  `--answers-file <path>`), with optional `--merge`

## Outputs

- A persisted typed answer item
- An `interview.complete:<id>` gate that blocks until required answers exist
- `interview_followups` for satisfied `followUpIf` questions

## Acceptance Criteria

| ID          | Criteria                                                                    | Verification                         |
| ----------- | --------------------------------------------------------------------------- | ------------------------------------ |
| FR-007-AC-1 | After `record-answers`, an `interview.complete`-gated advance passes        | Test (tests/commands.test.ts)        |
| FR-007-AC-2 | Advancing before required answers exist is blocked, naming the missing keys | Test (tests/commands.test.ts)        |
| FR-007-AC-3 | An invalid enum value or type is rejected at record time                    | Analysis                             |
| FR-007-AC-4 | Malformed answer JSON produces a usage error                                | Test (tests/commands.test.ts)        |
| FR-007-AC-5 | Matched `followUpIf` questions surface as `interview_followups`             | Test (tests/engine-features.test.ts) |

## Dependencies

- **Upstream**: [US-008](../usecase/US-008-author-structured-interviews.md) author structured interviews
