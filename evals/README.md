# ix-flow agent-pty evals

These evals drive the **real `claude` agent** (via [agent-pty] + tmux) through the
`ix-flow` workflow CLI and the workflow skills under `fixtures/`, then profile each
run from its Claude Code session transcript. They complement the Vitest suite:
Vitest covers the mechanical CLI; the evals verify that an agent can actually _use_
ix-flow to run workflows end-to-end (golden paths plus blocked/error and human-gate
paths).

> They cost tokens and minutes — run them deliberately, not in CI by default.

## Prerequisites

- `tmux` ≥ 3.0 and `claude` on `PATH`.
- A built `../agent-pty` (sibling checkout): `make build` there. It is imported
  dynamically from its `dist/` — never an npm dependency of this package.
- A built `ix-flow`: `make build` here (the harness shims this checkout's
  `bin/ix-flow.js` onto the agent's `PATH`).

## Running

```bash
make evals                      # canary subset (one scenario per family)
make evals MODEL=opus REPEATS=2 # pick a model, repeat for p50/p95
make evals-all                  # full corpus (EV-001..EV-022)
make eval FILTER=EV-013         # one scenario, keeps the workdir + logs HITL
make evals-rebuild              # re-derive metrics from the last run's transcripts
```

A scenario selector (`--canary | --all | --filter`) and `--model` are **required**
(no accidental full runs; token counts stay comparable across runs).

## Layout

```
run.mjs            orchestrator: select → run agent → extract metrics → assert → report
lib/
  resolve.mjs      locate ix-flow bin + agent-pty sibling; shim PATH
  env.mjs          per-scenario isolated workspace (cwd + flow --state-dir + pinned run id)
  agent.mjs        agent-pty launch, startup-menu handling, sentinel poll, HITL hook
  hitl.mjs         out-of-band gate poller (a "separate reviewer" runs `ix-flow ack`)
  prompt.mjs       task-brief builder (ix-flow tooling + sentinel protocol)
  metrics.mjs      REAL token/tool/latency metrics + ix-flow command classification
  assert.mjs       ground truth via `ix-flow status/verify/history` + the on-disk store
  ixflow.mjs       ix-flow CLI wrapper + run-id resolution
  report.mjs       p50/p95 aggregation, reports/latest.json, summary table
fixtures/          4 workflow-skill families (skill-only, -interview, -invariant, -template)
scenarios/index.mjs  EV-001..EV-022 declarative scenarios + selectScenarios()
reports/latest.json  generated (git-ignored)
```

## How a scenario works

Each scenario points at a workflow skill, gives the agent a goal, and declares the
ground truth to assert. The harness:

1. Makes an isolated workspace: a temp `cwd` and a flow `--state-dir`, plus a pinned
   run id (the lowercased scenario id) so it can assert/ack without scraping output.
2. Writes `EVAL_TASK.md` (the brief: ix-flow tooling, always-`--state-dir`, the
   sentinel completion protocol) and types one kickoff line into the agent.
3. For HITL scenarios with `hitl: { mode: "out_of_band" }`, runs a poller that
   acknowledges the deferred gate from outside the agent (the agent polls
   `ix-flow status` and re-advances once the gate clears). `user_reply`-style gate
   scenarios omit `hitl` — the agent acks its own gate inline.
4. Waits for the `<<<EVAL-COMPLETE>>>` / `<<<EVAL-FAILED>>>` sentinel in the
   transcript, then asserts independently: `phase`, `items`, event-chain `verify`,
   `historyContains`, `artifactRendered`, `cliRejects`.

Pass/fail is the harness's independent verdict against the flow store — never the
agent's self-report.

[agent-pty]: ../../agent-pty
