// Builds the task brief handed to the agent. Written to a file in the scenario
// working dir; the agent is told (in one typed line) to read and execute it.
// Keeping the typed input to a single line avoids multi-line paste submitting
// early in the REPL.

import { SENTINEL_COMPLETE, SENTINEL_FAILED } from "./metrics.mjs";

export const TASK_FILENAME = "EVAL_TASK.md";

/** The single line typed into the REPL to kick off the run. */
export function kickoffLine() {
  return `Read the file ./${TASK_FILENAME} in the current directory and complete the task it describes, following its completion protocol exactly.`;
}

/** Full task brief markdown for a scenario. `prompt` may be a string or (ctx)=>string. */
export function buildTaskBrief(scenario, ctx) {
  const task =
    typeof scenario.prompt === "function"
      ? scenario.prompt(ctx)
      : scenario.prompt;
  return `# Automated workflow task (${scenario.id})

You are driving an Agent IX **workflow** end-to-end in an **isolated test workspace**.
This is a measured eval: work efficiently, use only the \`ix-flow\` CLI via bash, and
do not invoke any interactive picker.

- Working directory (your cwd): \`${ctx.cwd}\`
- Workflow skill under test: \`${ctx.fixtureAbs ?? "(see task)"}\`

## Tooling

\`ix-flow\` is the workflow runner. **Every** command MUST include
\`--json --state-dir ${ctx.stateDir}\`. Create the run with the fixed id
\`${ctx.runId}\` so the rest of the commands address it:

- \`ix-flow run <flow> --path <skill-dir> --id ${ctx.runId} --json --state-dir ${ctx.stateDir}\`
  — create an instance. \`<flow>\` is the positional workflow name; omit it only when
  the skill ships exactly one workflow.
- \`ix-flow status ${ctx.runId} --json --state-dir ${ctx.stateDir}\` — inspect phase,
  items, open gates, artifacts. Follow the \`nextActions\` it reports.
- \`ix-flow advance ${ctx.runId} <phase> --json --state-dir ${ctx.stateDir}\` — move to a
  phase. The phase is positional, not \`--to\`. A blocked invariant returns
  \`ok:false\` with an \`error.code\`; a human gate returns \`state:"gate_deferred"\`
  with an \`ack_token\` in \`open_gates\`.
- \`ix-flow ack ${ctx.runId} <token> --reviewer eval --note approved --json --state-dir ${ctx.stateDir}\`
  — acknowledge a deferred human gate, then re-run \`advance\`.
- \`ix-flow record-answers ${ctx.runId} <interview-id> --answers '<json-object>' --json --state-dir ${ctx.stateDir}\`
- \`ix-flow add-item ${ctx.runId} <type> --item '<json-object>' --json --state-dir ${ctx.stateDir}\`
- \`ix-flow link-items ${ctx.runId} --link '<json-object>' --json --state-dir ${ctx.stateDir}\`
- \`ix-flow recipe ${ctx.runId} <recipe-name> --json --state-dir ${ctx.stateDir}\`
- \`ix-flow verify ${ctx.runId} --json --state-dir ${ctx.stateDir}\` — check the event
  hash-chain (\`data.ok\`).
- \`ix-flow history ${ctx.runId} --json --state-dir ${ctx.stateDir}\` — the event log.

Read the skill's \`SKILL.md\` first to learn its phases, interviews, and invariants.

## Task

${task}

## Rules

- Use only \`ix-flow\` via bash; never invoke an interactive picker.
- Pass \`--json --state-dir ${ctx.stateDir}\` on every command and address the run by
  id \`${ctx.runId}\`.
- Do not modify files outside \`${ctx.cwd}\`.

## Completion protocol (required)

Your **final action** must be a single shell command that prints the result marker:

- On success (the task's end state is reached and confirmed via \`ix-flow status\`):
  \`\`\`
  echo '${SENTINEL_COMPLETE}'
  \`\`\`
- If you cannot complete the task:
  \`\`\`
  echo '${SENTINEL_FAILED}'
  \`\`\`

Print exactly one marker, only as the very last step. Do not print it earlier.
`;
}
