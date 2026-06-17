---
name: release
description: Drive a change from draft through review to release.
contributes:
  workflows: ./workflows
---

# /release

## When To Use

A minimal, runnable `ix-flow` example. Use it to learn the run lifecycle: create a run,
advance through phases, stop at a human gate, acknowledge it, and reach a terminal phase.

## What It Does

Drives a single change through three phases — `draft` → `in_review` → `approved`. The
final transition is a human-in-the-loop (`hitl`) gate, so reaching `approved` requires an
explicit acknowledgement.

## Workflow Behavior

- Start from `ix-flow status` and follow the reported next actions.
- `draft → in_review` advances automatically.
- `in_review → approved` defers on a gate; acknowledge it with `ix-flow ack`, then
  advance again.
