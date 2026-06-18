---
name: followup-questions-example
description: Two-phase workflow with followUpIf re-surfacing a question downstream. Demonstrates FR-024-AC-8 advisory channel.
contributes:
  workflows: ./workflows
---

# 03 — Follow-up Questions

Two-phase workflow where `open_questions` carries `followUpIf: nonEmpty`.
After the first transition records the answers, advancing to the
second phase that still gates on the same interview surfaces an
`interview_followups` advisory naming `open_questions` for the agent
to re-ask.

<!-- interview: discovery -->

Question bank:

- **`problem_statement`** *(text, required)*
- **`open_questions`** *(list<text>, optional, followUpIf: nonEmpty)*

## Run

1. Create workflow.
2. Record answers including `open_questions: ["timeout default?"]`.
3. Advance to `planned` — interview.complete passes.
4. Inspect `interview_followups` on the transition response — it lists
   `open_questions` since the next transition (`planned → done`) also
   gates on the same interview.
