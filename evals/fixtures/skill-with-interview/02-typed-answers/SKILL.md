---
name: typed-answers-example
description: Question bank exercising every supported answer type — text, list<text>, enum, bool, int — with minItems and required flags. Demonstrates FR-022, FR-023 validation paths.
contributes:
  workflows: ./workflows
---

# 02 — Typed Answers

Exercises every supported question type and the record-time validation
paths (enum out-of-options, list below minItems, missing required,
type mismatches).

<!-- interview: discovery -->

Question bank:

- **`problem_statement`** *(text, required)* — Statement of the problem.
- **`personas`** *(list<text>, required, minItems: 1)* — Personas affected.
- **`size`** *(enum: trivial | simple | complex | platform-critical, required)* — Feature complexity.
- **`needs_migration`** *(bool, optional)* — Does the feature require a data migration?
- **`target_count`** *(int, optional)* — Target user count (rounded integer).

## Negative cases

- `--answers '{"size":"huge"}'` → `interview_answer_enum_invalid`
- `--answers '{"personas":[]}'` → `interview_answer_min_items`
- Omit `problem_statement` and try to advance → `invariant_interview_incomplete` listing the missing key
