// Thin wrapper for invoking this checkout's `ix-flow` CLI from the harness
// (independent ground truth), plus run-id resolution against the on-disk store.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { ixFlowBin } from "./resolve.mjs";

/**
 * Run `ix-flow <args> --json --state-dir <stateDir>` and parse the envelope.
 * @returns {{ exitCode:number, json:any, stdout:string, stderr:string }}
 */
export function ixFlow(args, { stateDir, cwd = process.cwd() }) {
  const r = spawnSync(
    process.execPath,
    [ixFlowBin(), ...args, "--json", "--state-dir", stateDir],
    { cwd, encoding: "utf8" },
  );
  let json = null;
  try {
    json = JSON.parse(r.stdout || "null");
  } catch {
    // non-JSON output -> json stays null
  }
  return {
    exitCode: r.status ?? null,
    json,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

/**
 * Resolve the run id to assert against. Prefer the pinned id when its instance
 * file exists; otherwise fall back to the single instance recorded in the store
 * (covers an agent that ignored the pinned `--id`).
 */
export function resolveRunId(stateDir, pinned) {
  if (pinned && existsSync(join(stateDir, "instances", `${pinned}.json`))) {
    return pinned;
  }
  try {
    const ids = readdirSync(join(stateDir, "instances"))
      .filter((e) => e.endsWith(".json"))
      .map((e) => e.slice(0, -".json".length));
    if (ids.length === 1) return ids[0];
    if (pinned && ids.includes(pinned)) return pinned;
  } catch {
    // no instances dir yet
  }
  return pinned;
}

/** Read a persisted instance directly from the store, or null. */
export function readInstance(stateDir, runId) {
  const path = join(stateDir, "instances", `${runId}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}
