<p align="center">
  <img src="logo.png" alt="IX Flow" width="100%" />
</p>

# IX Flow

[![Discord](https://img.shields.io/badge/Discord-Join%20us-5865F2?logo=discord&logoColor=white)](https://discord.gg/6qsdhSPE)

`ix-flow` runs agent workflows. A workflow is a small state machine — phases, transitions,
and human gates — that your agent advances step by step, pausing for your approval where it
matters. You **author** a workflow; your **agent runs it** by calling `ix-flow`.

Workflows are packaged as **skills**: a flow definition plus instructions that tell the
agent how to run it. [`quoin`](https://github.com/agent-ix/quoin), for example, ships
spec skills that drive `ix-flow` — you invoke the skill, and the agent does the rest.

## Install

Install the CLI your agent calls:

```bash
npm i -g @agent-ix/ix-flow
```

Then add the plugin to your coding agent. The same two skills — **ix-flow** (runs a workflow)
and **ix-flow-create** (authors a new one) — install into **Claude Code, OpenAI Codex,
opencode, and GitHub Copilot**. Pick your agent below. No Anthropic API key is required —
your existing agent subscription is used.

<details>
<summary><b>Claude Code</b></summary>

Run these inside Claude Code (they add the `/ix-flow` and `/ix-flow-create` commands):

```text
/plugin marketplace add agent-ix/ix-flow
/plugin install ix-flow@ix-flow
```

</details>

<details>
<summary><b>OpenAI Codex</b></summary>

```bash
codex plugin marketplace add agent-ix/ix-flow
codex plugin add ix-flow
```

Or browse and install ix-flow from the `/plugins` menu inside the Codex TUI.

</details>

<details>
<summary><b>opencode</b></summary>

Install the skills with the GitHub CLI (requires `gh` ≥ 2.90.0). `--all` installs
both skills; `--scope user` makes them available in every repo:

```bash
gh skill install agent-ix/ix-flow --all --scope user --agent opencode
```

</details>

<details>
<summary><b>GitHub Copilot</b></summary>

With the Copilot CLI:

```bash
copilot plugin marketplace add agent-ix/ix-flow
copilot plugin install ix-flow@ix-flow
```

Or install the skills with the GitHub CLI (requires `gh` ≥ 2.90.0):

```bash
gh skill install agent-ix/ix-flow --all --scope user --agent github-copilot
```

</details>

Author your own workflow below, or install one like `quoin` that ships its own.

> A clean-room, repeatable check of the Claude Code install path lives in [`smoke/`](./smoke) —
> run `make install-smoke`.

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
[`docs/guide.md`](docs/guide.md) for the full authoring reference; a complete, runnable
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

See [`docs/guide.md`](docs/guide.md) for the full guide — gates, invariants, interviews,
artifact templates, the run lifecycle, and the complete command reference.

## Development

```bash
pnpm install
pnpm run build
pnpm test
pnpm run lint
```

This package builds on `@agent-ix/ix-cli-core` from the standalone `ix-cli-core` repo.

### Evals

Beyond the unit tests, `ix-flow` uses the shared
[`@agent-ix/cli-agent-evals`](../cli-agent-evals) toolkit to drive real coding-agent
CLIs through each workflow skill end-to-end. The suite definition lives in
[`cli-agent-evals.config.mjs`](cli-agent-evals.config.mjs); project-specific fixtures,
prompts, and assertions remain under [`evals/`](evals/).

Live runs use `agent-pty` + tmux and cost tokens/minutes, so they are opt-in:

```bash
make evals          # canary subset (one scenario per family)
make evals-all      # full corpus (EV-001..EV-022)
make eval FILTER=EV-013
make evals-rebuild
```

Direct CLI form:

```bash
node ../cli-agent-evals/bin/cli-evals.js run \
  --suite ./cli-agent-evals.config.mjs \
  --canary \
  --agent claude \
  --model sonnet
```

Agent plugin setup for authoring/running evals from an agent:

```bash
claude plugin marketplace add agent-ix/cli-agent-evals
claude plugin install cli-agent-evals

codex plugin marketplace add agent-ix/cli-agent-evals
codex plugin add cli-agent-evals

gh skill install agent-ix/cli-agent-evals --all --scope user --agent opencode
gh skill install agent-ix/cli-agent-evals --all --scope user --agent github-copilot
```

Minimal integration pattern:

```js
import { defineSuite } from "../cli-agent-evals/dist/index.js";
import { SCENARIOS } from "./evals/scenarios/index.mjs";

export default defineSuite({
  name: "ix-flow",
  rootDir: import.meta.dirname,
  scenarios: SCENARIOS,
});
```

## License

MIT — see [`LICENSE`](LICENSE).
