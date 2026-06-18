---
name: minimal-interview-example
description: One question, one phase, interview.complete gates the transition. Demonstrates FR-022, FR-023, FR-024 happy path.
contributes:
  workflows: ./workflows
---

# 01 — Minimal Interview

Single-question interview gating one transition. The agent conducts
the Q&A in chat using the prompt declared below, then persists the
answer via `record-answers`. The transition only fires once
`interview.complete:discovery` is satisfied.

<!-- interview: discovery -->

Question bank (verbatim from def.yaml):

- **`problem_statement`** *(text, required)* — What problem does this feature solve and who has it?

## Run

1. `ix-flow run --path <this-dir> --json`
2. Agent asks the user the question above.
3. `ix-flow record-answers <id> discovery --answers '{"problem_statement":"<answer>"}' --json`
4. `ix-flow advance <id> drafting --json`

Skipping step 3 makes step 4 fail with `invariant_interview_no_answers`.
