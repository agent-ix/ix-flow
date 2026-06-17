---
name: intake
description: Collect a request through a short interview, then draft and finish.
contributes:
  workflows: ./workflows
---

# /intake

## When To Use

A runnable example of an interview-gated workflow. Use it to learn how an agent collects
answers, passes an interview gate, and runs a recipe.

## What It Does

Drives a request through `collecting` → `drafting` → `done`. The `collecting → drafting`
transition is gated on the `request` interview, so the agent must record the title and
summary before it can advance.

## Workflow Behavior

- Start from `ix-flow status` and follow the reported next actions.
- Record interview answers with `ix-flow record-answers <run-id> request --answers '{...}'`
  before advancing to `drafting`.
- Advance `collecting → drafting`, then finish with the `finish` recipe or by advancing to
  `done`.
