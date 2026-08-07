import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { WorkflowCommandRunner } from "../src/workflow-runner/runner";
import type { CreateWorkflowInput } from "../src/workflow-runner/runner";

/**
 * The `release` example is `draft --auto--> in_review --hitl--> approved`,
 * which exercises both gate modes without a bespoke fixture.
 */
const SKILL_PATH = "examples/release";

let stateDir: string;

beforeEach(() => {
  stateDir = mkdtempSync(join(tmpdir(), "ixflow-gate-override-"));
});

afterEach(() => {
  rmSync(stateDir, { recursive: true, force: true });
});

function newRunner(): WorkflowCommandRunner {
  return new WorkflowCommandRunner({
    config: {
      stateDir,
      defaultDefinition: "workflow",
      output: "json",
    },
    actor: { kind: "agent", id: "ticket-runner-w1" },
  });
}

async function startRun(
  runner: WorkflowCommandRunner,
  overrides: Pick<CreateWorkflowInput, "gateMode" | "gates"> = {},
): Promise<string> {
  const created = await runner.create({
    definitionName: "release",
    skillPath: SKILL_PATH,
    ...overrides,
  });
  return created.data!.id;
}

describe("run-level gate overrides", () => {
  it("defers the hitl gate when no override is given", async () => {
    const runner = newRunner();
    const id = await startRun(runner);

    await runner.advance({ id, to: "in_review" });
    const result = await runner.advance({ id, to: "approved" });

    expect(result.state).toBe("gate_deferred");
    expect(result.open_gates?.length).toBe(1);
  });

  it("clears the hitl gate under --gate-mode full-auto and records it", async () => {
    const runner = newRunner();
    const id = await startRun(runner, { gateMode: "full-auto" });

    await runner.advance({ id, to: "in_review" });
    const result = await runner.advance({ id, to: "approved" });

    expect(result.state).not.toBe("gate_deferred");
    expect(result.data?.phase).toBe("approved");

    const autoAck = result.events.find((e) => e.kind === "gate.auto_acked");
    expect(autoAck).toBeDefined();
    expect(autoAck?.payload).toMatchObject({
      transitionKey: "in_review->approved",
      from: "in_review",
      to: "approved",
      defaultGate: "hitl",
    });
    // The actor is the worker, never a human reviewer.
    expect(autoAck?.actor).toMatchObject({
      kind: "agent",
      id: "ticket-runner-w1",
    });
    // The event chain stays intact across the extra event.
    const advanced = result.events.find((e) => e.kind === "phase.advanced");
    expect(advanced?.prevHash).toBe(autoAck?.hash);
    expect(await runner.verifyChain(id)).toMatchObject({ ok: true });
  });

  it("does not record an auto-ack for a transition the def already auto-gates", async () => {
    const runner = newRunner();
    const id = await startRun(runner, { gateMode: "full-auto" });

    const result = await runner.advance({ id, to: "in_review" });

    expect(result.events.some((e) => e.kind === "gate.auto_acked")).toBe(false);
  });

  it("makes an auto transition human-gated under --gate-mode hitl", async () => {
    const runner = newRunner();
    const id = await startRun(runner, { gateMode: "hitl" });

    const result = await runner.advance({ id, to: "in_review" });

    expect(result.state).toBe("gate_deferred");
  });

  it("lets a per-transition --gate exempt one step from a blanket mode", async () => {
    const runner = newRunner();
    const id = await startRun(runner, {
      gateMode: "full-auto",
      gates: { "in_review->approved": "hitl" },
    });

    const auto = await runner.advance({ id, to: "in_review" });
    expect(auto.state).not.toBe("gate_deferred");

    const gated = await runner.advance({ id, to: "approved" });
    expect(gated.state).toBe("gate_deferred");
  });

  it("rejects a gate override that matches no transition", async () => {
    const runner = newRunner();

    const result = await runner.create({
      definitionName: "release",
      skillPath: SKILL_PATH,
      gates: { "draft->shipped": "auto" },
    });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("gate_override_unknown_transition");
    expect(result.error?.details).toMatchObject({
      transition: "draft->shipped",
    });
  });

  it("leaves the definition hash untouched when overriding gates", async () => {
    const runner = newRunner();
    const plain = await runner.create({
      definitionName: "release",
      skillPath: SKILL_PATH,
    });
    const overridden = await runner.create({
      definitionName: "release",
      skillPath: SKILL_PATH,
      gateMode: "full-auto",
    });

    expect(overridden.data!.defHash).toBe(plain.data!.defHash);
  });
});
