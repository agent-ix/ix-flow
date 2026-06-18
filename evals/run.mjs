#!/usr/bin/env node
// ix-flow agent-pty eval harness.
//
// Drives the REAL `claude` agent (via agent-pty) through the `ix-flow` workflow
// CLI + skills for each selected scenario, captures REAL metrics from the Claude
// Code session transcript, asserts success against the flow store, and writes
// evals/reports/latest.json.
//
// Usage:
//   node evals/run.mjs --canary --model <id>
//   node evals/run.mjs --all --model <id> [--repeats N]
//   node evals/run.mjs --filter EV-013 --model <id> [--keep]
//   node evals/run.mjs --rebuild              # re-derive metrics from last run
//
// A scenario selector (--canary | --all | --filter) is REQUIRED so a full,
// token-costly run is never triggered by accident. --model is REQUIRED so token
// counts are comparable across runs.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { ixFlowBin, findAgentPty, shimDir } from "./lib/resolve.mjs";
import { makeScenarioWorkspace, transcriptPathFor } from "./lib/env.mjs";
import { runAgent } from "./lib/agent.mjs";
import { extractMetrics } from "./lib/metrics.mjs";
import { assertExpectations } from "./lib/assert.mjs";
import {
  buildResult,
  buildReport,
  writeLatest,
  printSummaryTable,
  reportsDir,
  rebuildFromTranscripts,
} from "./lib/report.mjs";
import { selectScenarios } from "./scenarios/index.mjs";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}
function flag(name) {
  return process.argv.includes(name);
}

function preflight() {
  for (const bin of ["tmux", "claude"]) {
    const r = spawnSync("command", ["-v", bin], { shell: true });
    if (r.status !== 0)
      throw new Error(`eval prerequisite missing on PATH: ${bin}`);
  }
}

async function main() {
  if (flag("--rebuild")) {
    const path = join(reportsDir(), "latest.json");
    if (!existsSync(path)) throw new Error(`no prior report at ${path}`);
    const prior = JSON.parse(readFileSync(path, "utf8"));
    const report = rebuildFromTranscripts(prior, extractMetrics, {
      generatedAt: prior.generatedAt,
    });
    writeLatest(report);
    printSummaryTable(report);
    console.log(`\nrebuilt: ${path}`);
    return;
  }

  const model = arg("--model");
  const repeats = Number(arg("--repeats") ?? "1");
  const keep = flag("--keep");
  const selection = {
    canary: flag("--canary"),
    all: flag("--all"),
    filter: arg("--filter"),
  };

  if (!model)
    throw new Error(
      "--model <id> is required (token counts must be comparable)",
    );
  const scenarios = selectScenarios(selection);
  if (scenarios.length === 0) {
    throw new Error(
      "no scenarios selected. Pass --canary, --all, or --filter EV-0XX.",
    );
  }

  preflight();
  const shimPath = shimDir(); // pins this checkout's ix-flow
  const { entry: agentPtyPath } = await findAgentPty();

  console.log(
    `running ${scenarios.length} scenario(s) x${repeats} | model=${model}`,
  );

  const results = [];
  for (const scenario of scenarios) {
    const runs = [];
    for (let i = 0; i < repeats; i++) {
      const label =
        repeats > 1 ? `${scenario.id} (${i + 1}/${repeats})` : scenario.id;
      process.stdout.write(`▶ ${label} ... `);
      const ctx = makeScenarioWorkspace(scenario);
      try {
        scenario.setup?.(ctx);
        ctx.transcriptPath = transcriptPathFor(ctx.cwd, ctx.sessionId);
        const runResult = await runAgent(scenario, ctx, {
          model,
          shimPath,
          log: (m) => keep && console.log(m),
        });
        const metrics = extractMetrics(ctx.transcriptPath);
        const assertion = assertExpectations(ctx, scenario.expect, runResult);
        const ok = assertion.ok;
        runs.push({
          ok,
          runResult,
          metrics,
          assertion,
          workdir: ctx.work,
          sessionId: ctx.sessionId,
          transcriptPath: ctx.transcriptPath,
        });
        console.log(
          `${ok ? "PASS" : "FAIL"} ${(runResult.wallMs / 1000).toFixed(0)}s ` +
            `[${runResult.exitReason}] tokens=${metrics.tokenUsage.total} tools=${metrics.toolCalls}` +
            (ok ? "" : `\n   ${assertion.failures.join("; ")}`),
        );
        if (!ok && runResult.exitReason === "timeout") {
          console.log(`   screen tail:\n${indent(runResult.screenTail)}`);
        }
      } finally {
        if (!keep) ctx.cleanup();
      }
    }
    results.push(buildResult(scenario, runs));
  }

  const report = buildReport(results, {
    generatedAt: new Date().toISOString(),
    model,
    repeats,
    ixFlowBin: ixFlowBin(),
    agentPtyPath,
  });
  const path = writeLatest(report);
  printSummaryTable(report);
  console.log(`\nreport: ${path}`);
  process.exit(report.ok ? 0 : 1);
}

function indent(text, pad = "   ") {
  return (text ?? "")
    .split("\n")
    .map((l) => pad + l)
    .join("\n");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : String(err));
  process.exit(1);
});
