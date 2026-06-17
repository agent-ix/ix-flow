[![Discord](https://img.shields.io/badge/Discord-Join%20us-5865F2?logo=discord&logoColor=white)](https://discord.gg/6qsdhSPE)

<p align="center">
  <img src="logo.png" alt="IX Flow" width="100%" />
</p>

# IX Flow

`ix-flow` runs agent workflows. A workflow is a small state machine — phases, transitions,
and human gates — that your agent advances step by step, pausing for your approval where it
matters. You **author** a workflow; your **agent runs it** by calling `ix-flow`.

Workflows are packaged as **skills**: a flow definition plus instructions that tell the
agent how to run it. [`ix-spec`](https://github.com/agent-ix/ix-spec), for example, ships
spec skills that drive `ix-flow` — you invoke the skill, and the agent does the rest.

## Install

Install the CLI your agent calls:

```bash
npm i -g @agent-ix/ix-flow
```

Then install the Claude Code plugin, which adds the `/ix-flow` and `/ix-flow-create`
commands:

```text
/plugin marketplace add agent-ix/ix-flow
/plugin install ix-flow@ix-flow
```

The plugin ships two skills: **ix-flow** runs a workflow, and **ix-flow-create** authors a
new one. Author your own workflow below, or install one like `ix-spec` that ships its own.

## Author a workflow

A workflow is two files in a skill directory:

```
release/
  SKILL.md                      # instructs the agent how to run the flow
  workflows/
    release/
      def.yaml                  # the flow: phases, transitions, gates
```

**The flow** (`def.yaml`) declares the states and the moves between them. Here a change goes
`draft → in_review → approved`, with the final step gated on human approval:

```yaml
name: release
version: 0.1.0
initialPhase: draft
phases:
  - { name: draft }
  - { name: in_review }
  - { name: approved, terminal: true }
transitions:
  - { from: draft, to: in_review, defaultGate: auto }
  - { from: in_review, to: approved, defaultGate: hitl } # pauses for approval
```

**The skill** (`SKILL.md`) tells the agent how to run that flow:

```markdown
---
name: release
description: Drive a change from draft through review to release.
contributes:
  workflows: ./workflows
---

# /release

Start from the run status and follow the reported next actions. Advance the run through its
phases, and stop at the human gate until the change is approved.
```

Run `/ix-flow-create` and your agent scaffolds both files for you. See
[`docs/usage.md`](docs/usage.md) for the full authoring reference; a complete, runnable
version of this workflow is in [`examples/release`](examples/release).

## Use a workflow

Run `/ix-flow <workflow>` and your agent drives the run — creating it, advancing through the
phases, and pausing at gates for your approval:

```text
You:    /ix-flow release
Agent:  ▸ created run, advanced draft → in_review → reached the approval gate
        "Ready to release. Approve?"
You:    approve
Agent:  ▸ recorded approval, advanced to approved
        "Released."
```

Under the hood the agent calls `ix-flow` to track the run and enforce the gate. Runs
persist, so the agent can resume one across sessions.

## Concepts

- **Flow** — a workflow definition: phases, transitions, gates, invariants (`def.yaml`).
- **Skill** — the agent's instructions for running a flow (`SKILL.md`).
- **Run** — one live instance of a flow, identified by a run id.
- **Phase** — a named state; a run sits in exactly one phase at a time.
- **Gate** — a `hitl` transition that pauses for human approval.
- **Invariant** — a predicate that must hold before a transition succeeds.

## Development

```bash
pnpm install
pnpm run build
pnpm test
pnpm run lint
```

This package builds on `@agent-ix/ix-cli-core` from the standalone `ix-cli-core` repo.
