// Drives the real `claude` agent through one scenario via agent-pty (tmux), then
// waits for the completion sentinel in the transcript. Captures NO metrics itself
// (see metrics.mjs) — its job is to run the agent and report wall-clock + outcome.

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { findAgentPty, binPaths } from "./resolve.mjs";
import { buildTaskBrief, kickoffLine, TASK_FILENAME } from "./prompt.mjs";
import { findSentinel } from "./metrics.mjs";
import { startHitl } from "./hitl.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Run one scenario to completion.
 * @returns {{ wallMs, exitReason: "complete"|"failed"|"timeout"|"exit", screenTail }}
 */
export async function runAgent(scenario, ctx, opts) {
  const {
    model,
    shimPath,
    timeoutMs = 8 * 60_000,
    pollMs = 2000,
    readyTimeoutMs = 45_000,
    log = () => {},
  } = opts;

  // 1. Drop the task brief into the agent's working dir; the agent reads it.
  writeFileSync(join(ctx.cwd, TASK_FILENAME), buildTaskBrief(scenario, ctx));

  const { mod } = await findAgentPty();
  // Env the agent's shell must see. tmux does NOT propagate the spawn process's
  // env to a pane when a tmux server is already running (the pane inherits the
  // SERVER's env). So we set it INSIDE the pane via `env KEY=VAL ... claude ...`,
  // which is robust regardless of server state. PATH pins this checkout's
  // `ix-flow`; ix-flow's own state lives under the scenario `--state-dir`.
  const overrides = {
    PATH: binPaths(shimPath),
  };
  const claudeArgs = [
    "--session-id",
    ctx.sessionId,
    "--permission-mode",
    "bypassPermissions",
    "--model",
    model,
    "--add-dir",
    ctx.cwd,
  ];
  const envArgs = Object.entries(overrides).map(([k, v]) => `${k}=${v}`);

  const t0 = Date.now();
  const session = await mod.startSession({
    bin: "env",
    args: [...envArgs, "claude", ...claudeArgs],
    cwd: ctx.cwd,
    env: { ...process.env, ...overrides },
    cols: 200,
    rows: 50,
    sessionName: `ixfloweval-${ctx.id.toLowerCase()}-${ctx.sessionId.slice(0, 8)}`,
  });

  // Out-of-band HITL reviewer (no-op unless the scenario declares it).
  const hitl = scenario.hitl
    ? startHitl(scenario.hitl, {
        stateDir: ctx.stateDir,
        runId: ctx.runId,
        log,
      })
    : { stop() {}, done: Promise.resolve() };

  let exitReason = "timeout";
  let screenTail = "";
  try {
    await handleStartup(session, readyTimeoutMs);

    await session.type(kickoffLine());
    await session.enter();

    const deadline = t0 + timeoutMs;
    while (Date.now() < deadline) {
      const sentinel = findSentinel(ctx.transcriptPath);
      if (sentinel === "complete") {
        exitReason = "complete";
        break;
      }
      if (sentinel === "failed") {
        exitReason = "failed";
        break;
      }
      if (!(await alive(session))) {
        exitReason = "exit";
        break;
      }
      await sleep(pollMs);
    }
  } finally {
    hitl.stop();
    await hitl.done.catch(() => {});
    screenTail = await tail(session);
    await session.kill().catch(() => {});
  }

  return { wallMs: Date.now() - t0, exitReason, screenTail };
}

/**
 * Drive the startup menus until the REPL input box is ready:
 *  - "Bypass Permissions mode" warning (default is "No, exit" — must pick "Yes").
 *  - "Do you trust the files in this folder?" (default "Yes, proceed").
 * Returns once "? for shortcuts" (the input affordance) appears, or by timeout.
 */
async function handleStartup(session, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const screen = await session.capture().catch(() => "");
    if (
      /Bypass Permissions mode/i.test(screen) &&
      /Yes, I accept/i.test(screen)
    ) {
      // default highlight is "1. No, exit"; move down to "2. Yes, I accept".
      await session.sendKey("Down");
      await sleep(300);
      await session.enter();
      await sleep(1500);
      continue;
    }
    if (/trust the files|Do you trust/i.test(screen)) {
      await session.enter(); // default "Yes, proceed"
      await sleep(1500);
      continue;
    }
    if (/for shortcuts|Welcome to Claude/i.test(screen)) {
      await sleep(800); // settle so early keystrokes are not dropped
      return;
    }
    await sleep(700);
  }
}

async function alive(session) {
  try {
    await session.capture();
    return true;
  } catch {
    return false;
  }
}

async function tail(session, lines = 60) {
  try {
    const screen = await session.capture();
    return screen.split("\n").slice(-lines).join("\n");
  } catch {
    return "";
  }
}
