---
name: release
description: Drive a change from draft through review to release.
contributes:
  workflows: ./workflows
---

# /release

## When To Use

A minimal, runnable example of the define-a-flow / create-a-skill pattern. Use it to learn
how an agent drives a run: create it, advance through phases, stop at a human gate, and
reach a terminal phase.

## What It Does

Drives a single change through three phases — `draft` → `in_review` → `approved`. The final
transition is a human gate, so reaching `approved` requires explicit approval.

## Workflow Behavior

- Start from `ix-flow status` and follow the reported next actions.
- Advance `draft → in_review`, then `in_review → approved`.
- The final transition pauses for human approval; record it with `ix-flow ack`, then
  advance again to finish.
