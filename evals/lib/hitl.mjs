// Out-of-band HITL gate handler. Some scenarios require a *separate reviewer*
// (not the agent) to acknowledge a deferred human gate. This poller watches the
// flow store for an open gate on the run, then runs `ix-flow ack` directly —
// simulating that out-of-band reviewer. The agent, per its brief, polls
// `ix-flow status` until the gate clears and then re-advances.
//
// `user_reply` scenarios need no poller: the agent acknowledges its own gate
// inline, so those scenarios simply omit a `hitl` config.

import { ixFlow, readInstance, resolveRunId } from "./ixflow.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Start the out-of-band gate poller. Returns a stopper + a promise that settles
 * when polling ends. Acks at most once.
 * @param {{stateDir:string, runId:string, log:(m:string)=>void}} ctx
 */
export function startHitl(cfg, ctx) {
  if (cfg.mode !== "out_of_band") {
    return { stop() {}, done: Promise.resolve() };
  }
  let stopped = false;
  let acked = false;
  const stop = () => {
    stopped = true;
  };

  const done = (async () => {
    while (!stopped && !acked) {
      const runId = resolveRunId(ctx.stateDir, ctx.runId);
      const instance = readInstance(ctx.stateDir, runId);
      const gate = (instance?.openGates ?? [])[0];
      if (gate) {
        const r = ixFlow(
          [
            "ack",
            runId,
            gate.token,
            "--reviewer",
            "eval",
            "--note",
            "approved",
          ],
          { stateDir: ctx.stateDir },
        );
        ctx.log(
          `[hitl] out-of-band ack ${runId} ${gate.token} -> exit ${r.exitCode}`,
        );
        acked = true;
        break;
      }
      await sleep(750);
    }
  })();

  return { stop, done };
}
