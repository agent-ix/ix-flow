// Declarative eval scenarios for ix-flow. Each entry drives the real agent
// through one workflow skill end-to-end via the `ix-flow` CLI.
//
// Shape: { id, useCase, fixture, prompt|(ctx)=>prompt, setup?, hitl?, expect, canary? }
//   - fixture: skill dir, relative to evals/fixtures (or "examples/..." for the
//     repo's shipped examples). Exposed to the brief as ctx.fixtureAbs.
//   - hitl: { mode: "out_of_band" } spawns a separate-reviewer gate poller.
//   - expect: ground truth asserted by lib/assert.mjs (phase, items, verifyChain,
//     historyContains, artifactRendered, cliRejects, agentRan, sentinel).
//
// The task brief (lib/prompt.mjs) already tells the agent to read SKILL.md, pin
// `--id <runId>`, and pass `--json --state-dir <dir>` on every command, so each
// prompt only states the goal.

export const SCENARIOS = [
  // ── skill-only ────────────────────────────────────────────────────────────
  {
    id: "EV-001",
    useCase: "US-001",
    fixture: "skill-only/01-helloworld",
    canary: true,
    prompt:
      "Run the `helloworld` workflow and advance it to its terminal phase " +
      "`done`. Confirm the final phase with `ix-flow status`.",
    expect: {
      phase: "done",
      historyContains: ["workflow.created", "phase.advanced"],
    },
  },
  {
    id: "EV-002",
    useCase: "US-001",
    fixture: "skill-only/02-multi-phase-auto",
    prompt:
      "Run the `intake` workflow. Before advancing each phase, record a `note` " +
      "item: add notes with ids `n1`, `n2`, and `n3` (each needs an `id` and a " +
      "`body`). Advance through `drafted` → `reviewing` → `filed`.",
    expect: {
      phase: "filed",
      items: { note: ["n1", "n2", "n3"] },
      historyContains: ["item.added", "phase.advanced"],
    },
  },
  {
    id: "EV-003",
    useCase: "US-001",
    fixture: "skill-only/03-acyclic-links",
    prompt:
      "Run the `build-graph` workflow. Add at least two `node` items (ids `n1`, " +
      "`n2`, each with an `id` and `label`), add an acyclic `depends` link " +
      "between them, then advance to `validated` (the transition enforces the " +
      "`acyclic` invariant).",
    expect: {
      phase: "validated",
      items: { node: ["n1", "n2"] },
      historyContains: ["item.added", "items.linked", "phase.advanced"],
    },
  },
  {
    id: "EV-004",
    useCase: "US-004",
    fixture: "skill-only/03-acyclic-links",
    prompt:
      "Run the `build-graph` workflow. Add three `node` items (`n1`, `n2`, " +
      "`n3`) and `depends` links that form a CYCLE (n1→n2→n3→n1). Then attempt " +
      "`ix-flow advance` to `validated`. The `acyclic` invariant MUST reject it " +
      "(`ok:false` with an error code). Confirm the run is still in `building` " +
      "and report success — the rejection is the expected outcome.",
    expect: {
      phase: "building",
      historyContains: ["item.added", "items.linked"],
    },
  },

  // ── skill-with-interview ────────────────────────────────────────────────────
  {
    id: "EV-005",
    useCase: "US-008",
    fixture: "skill-with-interview/01-minimal-interview",
    canary: true,
    prompt:
      "Run the `minimal-interview` workflow. Record answers for the `discovery` " +
      "interview (answer the required `problem_statement` question), then advance " +
      "to `drafting`.",
    expect: {
      phase: "drafting",
      historyContains: ["interview.answers_recorded", "phase.advanced"],
    },
  },
  {
    id: "EV-006",
    useCase: "US-008",
    fixture: "skill-with-interview/01-minimal-interview",
    prompt:
      "Run the `minimal-interview` workflow. WITHOUT recording any interview " +
      "answers, attempt to advance to `drafting`. The `interview.complete:discovery` " +
      "invariant MUST block it. Confirm the run is still in `discovery` and report " +
      "success — being blocked is the expected outcome.",
    expect: {
      phase: "discovery",
      historyContains: ["workflow.created"],
    },
  },
  {
    id: "EV-007",
    useCase: "US-008",
    fixture: "skill-with-interview/02-typed-answers",
    prompt:
      "Run the `typed-answers` workflow. Record answers for the `discovery` " +
      "interview satisfying every required, typed question: `problem_statement` " +
      "(text), `personas` (a non-empty list of text), and `size` (one of the " +
      "enum options). Then advance to `drafting`.",
    expect: {
      phase: "drafting",
      historyContains: ["interview.answers_recorded", "phase.advanced"],
    },
  },
  {
    id: "EV-008",
    useCase: "US-008",
    fixture: "skill-with-interview/02-typed-answers",
    prompt:
      "Run the `typed-answers` workflow. Try to record `discovery` answers with " +
      "an INVALID `size` (a value NOT in the enum) and an empty `personas` list. " +
      "`record-answers` MUST reject the malformed answers. Do not advance. Confirm " +
      "the run is still in `discovery` and report success — the rejection is the " +
      "expected outcome.",
    expect: {
      phase: "discovery",
      historyContains: ["workflow.created"],
    },
  },
  {
    id: "EV-009",
    useCase: "US-008",
    fixture: "skill-with-interview/03-followup-questions",
    prompt:
      "Run the `followup-questions` workflow. Record `discovery` answers " +
      "including a non-empty `open_questions` list (this question has " +
      "`followUpIf: nonEmpty`, so it re-surfaces downstream). Advance " +
      "`discovery` → `planned` → `done`.",
    expect: {
      phase: "done",
      historyContains: ["interview.answers_recorded", "phase.advanced"],
    },
  },
  {
    id: "EV-010",
    useCase: "US-007",
    fixture: "skill-with-interview/04-template-from-interview",
    prompt:
      "Run the `template-from-interview` workflow. Record `discovery` answers " +
      "(`title` and `statement`), then advance to `rendered`. Entering `rendered` " +
      "renders the `fr` artifact template from those answers — confirm the " +
      "artifact path appears in `ix-flow status` under `artifacts`.",
    expect: {
      phase: "rendered",
      artifactRendered: true,
      historyContains: ["interview.answers_recorded", "phase.advanced"],
    },
  },

  // ── skill-with-invariant ────────────────────────────────────────────────────
  {
    id: "EV-011",
    useCase: "US-001",
    fixture: "skill-with-invariant/01-item-exists",
    canary: true,
    prompt:
      "Run the `greet` workflow. The `greeting.exists` invariant blocks the " +
      "terminal transition until a `greeting` item exists. Add a greeting item " +
      "with id `g1` (and a `message`), then advance to `done`.",
    expect: {
      phase: "done",
      items: { greeting: ["g1"] },
      historyContains: ["item.added", "phase.advanced"],
    },
  },
  {
    id: "EV-012",
    useCase: "US-001",
    fixture: "skill-with-invariant/02-item-field-shape",
    prompt:
      "Run the `triage` workflow. The `report.summary_filled` invariant requires " +
      "every `report` item to carry a non-empty `summary`. Add a report (id `r1`, " +
      "with a `title` and a non-empty `summary`), advance to `summarized`, then " +
      "advance to `closed`.",
    expect: {
      phase: "closed",
      items: { report: ["r1"] },
      historyContains: ["item.added", "phase.advanced"],
    },
  },
  {
    id: "EV-013",
    useCase: "US-002",
    fixture: "skill-with-invariant/03-hitl-gate",
    canary: true,
    hitl: { mode: "out_of_band" },
    prompt:
      "Run the `release` workflow and advance from `staged` to `published`. That " +
      "transition is a human (hitl) gate, so the first advance returns " +
      '`state:"gate_deferred"`. A SEPARATE reviewer will acknowledge the gate ' +
      "out of band — do NOT ack it yourself. Poll `ix-flow status` every few " +
      "seconds; when `open_gates` is empty, re-run `ix-flow advance` to " +
      "`published`. Confirm the final phase is `published`.",
    expect: {
      phase: "published",
      historyContains: ["gate.deferred", "gate.acknowledged", "phase.advanced"],
    },
  },
  {
    id: "EV-014",
    useCase: "US-002",
    fixture: "skill-with-invariant/03-hitl-gate",
    prompt:
      "Run the `release` workflow and advance from `staged` to `published`. The " +
      "transition is a human (hitl) gate: the first advance returns " +
      '`state:"gate_deferred"` with an `ack_token` in `open_gates`. Acknowledge ' +
      "the gate yourself with `ix-flow ack` (use `--reviewer eval`), then re-run " +
      "`ix-flow advance` to `published`. Confirm the final phase is `published`.",
    expect: {
      phase: "published",
      historyContains: ["gate.deferred", "gate.acknowledged", "phase.advanced"],
    },
  },
  {
    id: "EV-015",
    useCase: "US-005",
    fixture: "skill-with-invariant/04-multi-workflow",
    prompt: (ctx) =>
      "This skill ships TWO workflows (`publish` and `report`). Run " +
      `\`ix-flow run --path ${ctx.fixtureAbs} --id ${ctx.runId}\` WITHOUT a ` +
      "workflow name. ix-flow MUST reject it as ambiguous (error code " +
      "`workflow_ambiguous`). Report that you observed the ambiguity error — the " +
      "rejection is the expected outcome. Do not create any instance.",
    expect: {
      cliRejects: {
        args: (ctx) => ["run", "--path", ctx.fixtureAbs],
        code: "workflow_ambiguous",
      },
    },
  },
  {
    id: "EV-016",
    useCase: "US-005",
    fixture: "skill-with-invariant/04-multi-workflow",
    prompt:
      "This skill ships two workflows. Run the `publish` workflow by name. The " +
      "`publish.has_target` invariant requires a `target` item, so add a target " +
      "(id `t1`, with a `url`), then advance to `published`.",
    expect: {
      phase: "published",
      items: { target: ["t1"] },
      historyContains: ["item.added", "phase.advanced"],
    },
  },
  {
    id: "EV-017",
    useCase: "US-005",
    fixture: "skill-with-invariant/04-multi-workflow",
    prompt:
      "This skill ships two workflows. Run the `report` workflow by name. The " +
      "`report.has_findings` invariant requires a `finding` item, so add a finding " +
      "(id `f1`, with `text`), then advance to `closed`.",
    expect: {
      phase: "closed",
      items: { finding: ["f1"] },
      historyContains: ["item.added", "phase.advanced"],
    },
  },

  // ── skill-with-template ─────────────────────────────────────────────────────
  {
    id: "EV-018",
    useCase: "US-007",
    fixture: "skill-with-template/01-basic-render",
    canary: true,
    prompt:
      "Run the `basic-render` workflow and advance from `drafting` to `rendered`. " +
      "Entering `rendered` renders the `notes` artifact template — confirm the " +
      "rendered file path appears in `ix-flow status` under `artifacts`.",
    expect: {
      phase: "rendered",
      artifactRendered: true,
      historyContains: ["phase.advanced"],
    },
  },
  {
    id: "EV-019",
    useCase: "US-007",
    fixture: "skill-with-template/04-variant-selection",
    prompt:
      "Run the `variant-select` workflow. Add a `component` item with id `c1` and " +
      "`component_type` set to `fastapi-service`, then advance to `rendered`. The " +
      "template's variant is chosen from `component_type`, so the rendered artifact " +
      "comes from the `fastapi-service` variant. Confirm an artifact appears in " +
      "`ix-flow status`.",
    expect: {
      phase: "rendered",
      items: { component: ["c1"] },
      artifactRendered: true,
    },
  },

  // ── shipped examples: recipe, resume, audit ─────────────────────────────────
  {
    id: "EV-020",
    useCase: "US-009",
    fixture: "examples/intake",
    prompt:
      "Run the `intake` workflow. Record answers for the `request` interview " +
      "(`title` and `summary`), advance to `drafting`, then run the `finish` " +
      "recipe to reach `done` in one step.",
    expect: {
      phase: "done",
      historyContains: ["interview.answers_recorded", "phase.advanced"],
    },
  },
  {
    id: "EV-021",
    useCase: "US-003",
    fixture: "examples/release",
    prompt:
      "Run the `release` workflow and advance from `draft` to `in_review` (an " +
      "auto transition). Then run `ix-flow resume` and `ix-flow status` to " +
      "confirm the run persisted and is in `in_review`. Stop there — do not " +
      "advance further.",
    expect: {
      phase: "in_review",
      historyContains: ["workflow.created", "phase.advanced"],
    },
  },
  {
    id: "EV-022",
    useCase: "US-004",
    fixture: "examples/release",
    prompt:
      "Run the `release` workflow to completion: advance `draft` → `in_review` " +
      "(auto), then `in_review` → `approved` (a human gate — acknowledge it " +
      "yourself with `ix-flow ack --reviewer eval`, then re-advance). Finally, " +
      "audit the run: `ix-flow verify` must report the event chain intact and " +
      "`ix-flow history` must show the full event log.",
    expect: {
      phase: "approved",
      verifyChain: true,
      historyContains: ["gate.deferred", "gate.acknowledged", "phase.advanced"],
    },
  },
];

export function selectScenarios({ canary, all, filter } = {}) {
  if (filter) {
    const needle = filter.toLowerCase();
    return SCENARIOS.filter((s) => s.id.toLowerCase().includes(needle));
  }
  if (all) return SCENARIOS;
  if (canary) return SCENARIOS.filter((s) => s.canary);
  return [];
}
