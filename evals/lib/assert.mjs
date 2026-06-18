// Ground-truth success assertion. The harness independently re-reads workflow
// state via this checkout's `ix-flow` CLI (and the on-disk store) — the agent's
// own runs inside the transcript can lie or be skipped.

import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

import { ixFlow, readInstance, resolveRunId } from "./ixflow.mjs";
import { findCommand } from "./metrics.mjs";

/**
 * Assert a scenario's expectations against the final flow state.
 * @param expect {
 *   phase?: string,
 *   items?: Record<string, string[]>,         // type -> required item ids
 *   verifyChain?: boolean,                     // default true when a run exists
 *   historyContains?: string[],               // event kinds the log must include
 *   artifactRendered?: boolean,               // >=1 artifact + its file on disk
 *   cliRejects?: { args: string[], code?: string },
 *   agentRan?: Array<{ pattern: string, desc: string }>,
 *   sentinel?: "complete"|"failed",
 * }
 * @returns { ok, failures, checks }
 */
export function assertExpectations(ctx, expect, runResult) {
  const failures = [];
  const checks = {};
  const runId = resolveRunId(ctx.stateDir, ctx.runId);
  const instance = readInstance(ctx.stateDir, runId);

  if (expect.phase !== undefined) {
    const actual = instance?.phase ?? null;
    const ok = actual === expect.phase;
    checks.phase = { ok, expected: expect.phase, actual };
    if (!ok)
      failures.push(`phase: expected "${expect.phase}", got "${actual}"`);
  }

  for (const [type, ids] of Object.entries(expect.items ?? {})) {
    const present = (instance?.items?.[type] ?? [])
      .map((it) => (it && typeof it === "object" ? it.id : undefined))
      .filter((id) => typeof id === "string");
    const missing = ids.filter((id) => !present.includes(id));
    checks[`items:${type}`] = { ok: missing.length === 0, present, missing };
    if (missing.length > 0)
      failures.push(`items.${type}: missing ${missing.join(", ")}`);
  }

  const wantChain = expect.verifyChain ?? Boolean(instance);
  if (wantChain) {
    const r = ixFlow(["verify", runId], { stateDir: ctx.stateDir });
    const ok = r.json?.data?.ok === true;
    checks.verifyChain = { ok, exitCode: r.exitCode };
    if (!ok) failures.push(`verify: event chain not intact for ${runId}`);
  }

  if (expect.historyContains?.length) {
    const r = ixFlow(["history", runId], { stateDir: ctx.stateDir });
    const kinds = new Set(
      (r.json?.data ?? []).map((e) => e?.kind).filter(Boolean),
    );
    const missing = expect.historyContains.filter((k) => !kinds.has(k));
    checks.historyContains = { ok: missing.length === 0, missing };
    if (missing.length > 0)
      failures.push(`history: missing event(s) ${missing.join(", ")}`);
  }

  if (expect.artifactRendered) {
    const artifacts = instance?.artifacts ?? [];
    const first = artifacts[0];
    const path = first?.path
      ? isAbsolute(first.path)
        ? first.path
        : resolve(ctx.cwd, first.path)
      : null;
    const ok = artifacts.length > 0 && path !== null && existsSync(path);
    checks.artifactRendered = { ok, count: artifacts.length, path };
    if (!ok) failures.push(`artifact: expected a rendered file, got ${path}`);
  }

  if (expect.cliRejects) {
    const { args, code } = expect.cliRejects;
    const resolvedArgs = typeof args === "function" ? args(ctx) : args;
    const r = ixFlow(resolvedArgs, { stateDir: ctx.stateDir, cwd: ctx.cwd });
    const rejected = r.json?.ok === false;
    const codeOk = !code || r.json?.error?.code === code;
    checks.cliRejects = {
      ok: rejected && codeOk,
      actualCode: r.json?.error?.code ?? null,
    };
    if (!rejected || !codeOk)
      failures.push(
        `cliRejects: expected rejection${code ? ` (${code})` : ""}, got code ${r.json?.error?.code ?? "none"}`,
      );
  }

  for (const { pattern, desc } of expect.agentRan ?? []) {
    const { ran, succeeded } = findCommand(ctx.transcriptPath, pattern);
    checks[`agentRan:${desc}`] = { ran, succeeded };
    if (!ran || !succeeded)
      failures.push(`agent did not successfully run: ${desc}`);
  }

  const wantSentinel = expect.sentinel ?? "complete";
  if (runResult.exitReason !== wantSentinel) {
    failures.push(
      `sentinel: expected "${wantSentinel}" but run ended "${runResult.exitReason}"`,
    );
  }

  return { ok: failures.length === 0, failures, checks, runId };
}
