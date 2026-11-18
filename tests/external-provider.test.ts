import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { trace } from "@agent-ix/ix-trace-ts/vitest";
import { loadSkill } from "../src/workflow-core/plugin";
import { parseWorkflowDef } from "../src/workflow-core/definition.js";
import { WorkflowCommandRunner } from "../src/workflow-runner/runner";

const fixture = fileURLToPath(
  new URL("./fixtures/external-invariant-provider.mjs", import.meta.url),
);
const fixedNow = new Date("2026-09-10T20:00:00.000Z");

interface SkillOptions {
  invariants?: string[];
  systemOwnedItemTypes?: string[];
  providerNames?: string[];
  mode?: string;
  command?: string;
  args?: string[];
  providerYaml?: string;
  esm?: string;
  extraFiles?: Record<string, string>;
}

interface Harness {
  work: string;
  skill: string;
  stateDir: string;
  counterPath: string;
  requestPath: string;
  runner: WorkflowCommandRunner;
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function providerYaml(options: SkillOptions, harness: Harness): string {
  if (options.providerYaml !== undefined) return options.providerYaml;
  const args = options.args ?? [
    fixture,
    options.mode ?? "ok",
    harness.counterPath,
    harness.requestPath,
  ];
  return `  ix-flow-invariant-provider:
    command: ${yamlString(options.command ?? process.execPath)}
    args: ${JSON.stringify(args)}
    request-protocol: test.invariant-request/v1
    result-protocol: test.invariant-result/v1
    invariants: ${JSON.stringify(options.providerNames ?? ["external.pass", "external.fail"])}
`;
}

function createHarness(options: SkillOptions = {}): Harness {
  const work = mkdtempSync(join(tmpdir(), "ix-flow-provider-"));
  const harness = {
    work,
    skill: join(work, "skill"),
    stateDir: join(work, "state"),
    counterPath: join(work, "provider-count"),
    requestPath: join(work, "provider-request.json"),
  } as Harness;
  const metadata = providerYaml(options, harness);
  const transitionInvariants = options.invariants ?? [
    "external.pass:first",
    "external.fail",
    "external.pass:first",
  ];
  const files: Record<string, string> = {
    "SKILL.md": `---
name: external
description: external provider test
metadata:
  ix-flow-workflows: ./workflows
${metadata}---
# External provider test
`,
    "workflows/external/def.yaml": `name: external
version: 1.0.0
initialPhase: open
phases:
  - { name: open }
  - { name: closed, terminal: true }
${options.systemOwnedItemTypes ? `systemOwnedItemTypes: ${JSON.stringify(options.systemOwnedItemTypes)}\nitemSchemas:\n${options.systemOwnedItemTypes.map((type) => `  ${type}: {}\n`).join("")}` : ""}transitions:
  - from: open
    to: closed
    invariants: ${JSON.stringify(transitionInvariants)}
    defaultGate: auto
`,
    ...(options.extraFiles ?? {}),
  };
  if (options.esm !== undefined) files["scripts/invariants.js"] = options.esm;
  for (const [path, content] of Object.entries(files)) {
    const absolute = join(harness.skill, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
  }
  harness.runner = new WorkflowCommandRunner({
    cwd: work,
    config: { stateDir: harness.stateDir },
    now: () => fixedNow,
    idFactory: () => "fixed",
  });
  return harness;
}

async function createRun(harness: Harness): Promise<string> {
  const result = await harness.runner.create({
    definitionName: "external",
    skillPath: harness.skill,
  });
  expect(result.ok).toBe(true);
  expect(result.data?.id).toBeTruthy();
  return result.data!.id;
}

function invocationCount(harness: Harness): number {
  if (!existsSync(harness.counterPath)) return 0;
  return readFileSync(harness.counterPath, "utf8").split("\n").filter(Boolean)
    .length;
}

test.each([
  {
    systemOwnedItemTypes: ["context", "context"],
    itemSchemas: { context: {} },
    message: "system_owned_item_type_duplicate",
  },
  {
    systemOwnedItemTypes: ["context"],
    itemSchemas: {},
    message: "system_owned_item_type_unknown: context",
  },
])(
  "rejects invalid system-owned item declarations ($message)",
  ({ systemOwnedItemTypes, itemSchemas, message }) => {
    trace("FR-014-AC-5");
    expect(() =>
      parseWorkflowDef({
        name: "example",
        version: "1.0.0",
        initialPhase: "open",
        phases: [{ name: "open" }],
        systemOwnedItemTypes,
        itemSchemas,
      }),
    ).toThrow(message);
  },
);

test("keeps the system-owned item declaration absent from legacy definitions", () => {
  const definition = parseWorkflowDef({
    name: "example",
    version: "1.0.0",
    initialPhase: "open",
    phases: [{ name: "open" }],
  });

  expect(definition).not.toHaveProperty("systemOwnedItemTypes");
});

async function expectProviderBoundaryError(
  options: SkillOptions,
  code: string,
): Promise<void> {
  const harness = createHarness({
    invariants: ["external.pass"],
    ...options,
  });
  try {
    const id = await createRun(harness);
    const result = await harness.runner.advance({ id, to: "closed" });
    expect(result).toMatchObject({ ok: false, error: { code } });
  } finally {
    rmSync(harness.work, { recursive: true, force: true });
  }
}

// Trace: FR-022-AC-1, TC-007.
test("batches ordered external invariants into one real provider process", async () => {
  const harness = createHarness({
    extraFiles: { "scripts/invariants.py": "# declared provider asset\n" },
  });
  try {
    const id = await createRun(harness);
    const result = await harness.runner.advance({ id, to: "closed" });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "transition_invariant_failed",
        details: {
          invariant: "external.fail",
          invariantCode: "external_denied",
        },
      },
    });
    expect(invocationCount(harness)).toBe(1);
    expect(JSON.parse(readFileSync(harness.requestPath, "utf8"))).toMatchObject(
      {
        invariants: ["external.pass:first", "external.fail"],
      },
    );
  } finally {
    rmSync(harness.work, { recursive: true, force: true });
  }
});

// Trace: FR-022-AC-1, TC-007.
test("ordinary core evaluators retain precedence over an external declaration", async () => {
  const harness = createHarness({
    invariants: ["no_open_questions"],
    providerNames: ["no_open_questions"],
  });
  try {
    const id = await createRun(harness);
    const result = await harness.runner.advance({ id, to: "closed" });
    expect(result.ok).toBe(true);
    expect(invocationCount(harness)).toBe(0);
  } finally {
    rmSync(harness.work, { recursive: true, force: true });
  }
});

// Trace: FR-022-AC-2, TC-008.
test("sends the closed instance projection and runner evaluation instant", async () => {
  const harness = createHarness({ invariants: ["external.pass"] });
  try {
    const id = await createRun(harness);
    const result = await harness.runner.advance({ id, to: "closed" });

    expect(result.ok).toBe(true);
    const request = JSON.parse(readFileSync(harness.requestPath, "utf8"));
    expect(request).toEqual({
      protocol: "test.invariant-request/v1",
      invariants: ["external.pass"],
      instance: {
        defName: "external",
        items: {},
        gateConfig: { "open->closed": "auto" },
      },
      run: {
        instance_id: id,
        state_version: 0,
        state: "open",
        transition_key: "open->closed",
      },
      evaluated_at: fixedNow.toISOString(),
    });
  } finally {
    rmSync(harness.work, { recursive: true, force: true });
  }
});

test("keeps run provenance engine-owned and protects system-owned items", async () => {
  trace("FR-019-AC-3", "FR-022-AC-9", "FR-022-AC-11");
  const harness = createHarness({
    invariants: ["external.pass"],
    systemOwnedItemTypes: ["quoin_context"],
  });
  try {
    const id = await createRun(harness);
    expect(
      await harness.runner.addItem({
        id,
        type: "quoin_context",
        item: { id: "attacker-context", config_root: "/attacker/config" },
      }),
    ).toMatchObject({ ok: false, error: { code: "item_system_owned" } });
    expect(
      await harness.runner.seedSystemOwnedItem({
        id,
        type: "quoin_context",
        item: { id: "untrusted-seed", config_root: "/attacker/config" },
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "system_owned_item_host_required" },
    });

    const hostRunner = new WorkflowCommandRunner({
      cwd: harness.work,
      config: { stateDir: harness.stateDir },
      actor: { kind: "service", id: "quoin-host" },
      now: () => fixedNow,
      idFactory: () => "fixed",
    });
    const seeded = await hostRunner.seedSystemOwnedItem({
      id,
      type: "quoin_context",
      item: { id: "context", config_root: "/trusted/config" },
    });
    expect(seeded.ok).toBe(true);

    expect(
      await harness.runner.updateItem({
        id,
        type: "quoin_context",
        itemId: "context",
        patch: { config_root: "/attacker/config" },
      }),
    ).toMatchObject({ ok: false, error: { code: "item_system_owned" } });
    expect(
      await harness.runner.addItem({
        id,
        type: "quoin_context",
        item: { id: "replacement", config_root: "/attacker/config" },
      }),
    ).toMatchObject({ ok: false, error: { code: "item_system_owned" } });

    const ordinary = await harness.runner.addItem({
      id,
      type: "notes",
      item: {
        id: "note",
        run: { instance_id: "forged", state_version: 0 },
        evaluator_results: ["allow"],
      },
    });
    expect(ordinary.ok).toBe(true);
    expect(
      await harness.runner.updateItem({
        id,
        type: "notes",
        itemId: "note",
        patch: {
          run: { instance_id: "forged-again" },
          evaluator_results: ["allow", "allow"],
        },
      }),
    ).toMatchObject({ ok: true });

    const advanced = await harness.runner.advance({ id, to: "closed" });
    expect(advanced.ok).toBe(true);
    expect(invocationCount(harness)).toBe(1);
    const request = JSON.parse(readFileSync(harness.requestPath, "utf8"));
    expect(request.run).toEqual({
      instance_id: id,
      state_version: 3,
      state: "open",
      transition_key: "open->closed",
    });
    expect(request.instance.items.notes[0]).toMatchObject({
      run: { instance_id: "forged-again" },
      evaluator_results: ["allow", "allow"],
    });
    expect(request.instance.items.quoin_context[0].config_root).toBe(
      "/trusted/config",
    );
  } finally {
    rmSync(harness.work, { recursive: true, force: true });
  }
});

// Trace: FR-022-AC-3, TC-009.
test("refuses a skill that declares both ESM and external providers", async () => {
  const harness = createHarness({
    esm: "export const invariants = { 'external.pass': () => true };\n",
  });
  try {
    await expect(loadSkill(harness.skill)).rejects.toMatchObject({
      code: "skill_invariant_provider_conflict",
    });
  } finally {
    rmSync(harness.work, { recursive: true, force: true });
  }
});

// Trace: FR-022-AC-4, TC-010.
test.each([
  "    args: []\n    request-protocol: req/v1\n    result-protocol: result/v1\n    invariants: [external.pass]\n",
  "    command: node\n    args: not-an-array\n    request-protocol: req/v1\n    result-protocol: result/v1\n    invariants: [external.pass]\n",
  "    command: node\n    args: []\n    request-protocol: req/v1\n    result-protocol: result/v1\n    invariants: [external.pass, external.pass]\n",
])("rejects an invalid external provider declaration", async (invalid) => {
  const harness = createHarness({ providerYaml: invalid });
  try {
    await expect(loadSkill(harness.skill)).rejects.toMatchObject({
      code: "skill_format_invalid",
    });
  } finally {
    rmSync(harness.work, { recursive: true, force: true });
  }
});

// Trace: FR-022-AC-4, TC-010.
test("retains the undeclared non-JavaScript invariant-script refusal", async () => {
  const harness = createHarness({
    providerYaml: "",
    extraFiles: { "scripts/invariants.py": "pass\n" },
  });
  try {
    await expect(loadSkill(harness.skill)).rejects.toMatchObject({
      code: "skill_script_unsupported",
    });
  } finally {
    rmSync(harness.work, { recursive: true, force: true });
  }
});

// Trace: FR-022-AC-5, TC-011.
test("distinguishes provider process-boundary failures", async () => {
  await expectProviderBoundaryError(
    { command: "ix-flow-provider-that-does-not-exist" },
    "invariant_provider_spawn_failed",
  );
  await expectProviderBoundaryError(
    { mode: "crash" },
    "invariant_provider_crashed",
  );
  await expectProviderBoundaryError(
    { mode: "nonzero" },
    "invariant_provider_exit_nonzero",
  );
  await expectProviderBoundaryError(
    { mode: "timeout" },
    "invariant_provider_timeout",
  );
  await expectProviderBoundaryError(
    { mode: "oversized" },
    "invariant_provider_output_oversized",
  );
}, 10_000);

// Trace: FR-022-AC-6, TC-012.
test("distinguishes invalid provider result families", async () => {
  for (const [mode, code] of [
    ["malformed", "invariant_provider_output_malformed"],
    ["missing-outcome", "invariant_provider_output_malformed"],
    ["wrong-protocol", "invariant_provider_protocol_mismatch"],
    ["unknown-invariant", "invariant_provider_unknown_invariant"],
  ] as const) {
    await expectProviderBoundaryError({ mode }, code);
  }
});

// Trace: FR-022-AC-7, TC-013.
test("passes provider arguments literally without shell interpretation", async () => {
  const work = mkdtempSync(join(tmpdir(), "ix-flow-provider-marker-"));
  const marker = join(work, "must-not-exist");
  const literal = `$(touch ${marker})`;
  const requestPath = join(work, "literal-request.json");
  const harness = createHarness({
    invariants: ["external.pass"],
    args: [fixture, "ok", "-", requestPath, literal],
  });
  try {
    const id = await createRun(harness);
    const result = await harness.runner.advance({ id, to: "closed" });
    expect(result.ok).toBe(true);
    expect(JSON.parse(readFileSync(`${requestPath}.args`, "utf8"))).toEqual([
      literal,
    ]);
    expect(existsSync(marker)).toBe(false);
  } finally {
    rmSync(harness.work, { recursive: true, force: true });
    rmSync(work, { recursive: true, force: true });
  }
});

// Trace: FR-022-AC-8, TC-014.
test("does not launch the provider for an unregistered invariant", async () => {
  const harness = createHarness({ invariants: ["not.registered"] });
  try {
    const id = await createRun(harness);
    const result = await harness.runner.advance({ id, to: "closed" });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "transition_invariant_unregistered" },
    });
    expect(invocationCount(harness)).toBe(0);
  } finally {
    rmSync(harness.work, { recursive: true, force: true });
  }
});

test("resolves a relative provider command from the skill root", async () => {
  const harness = createHarness({
    invariants: ["external.pass"],
    command: "./scripts/provider",
    args: ["ok", "-", "-"],
    extraFiles: {
      "scripts/provider": `#!/usr/bin/env node\n${readFileSync(resolve(fixture), "utf8")}`,
    },
  });
  try {
    chmodSync(join(harness.skill, "scripts/provider"), 0o755);
    const id = await createRun(harness);
    const result = await harness.runner.advance({ id, to: "closed" });
    expect(result.ok).toBe(true);
  } finally {
    rmSync(harness.work, { recursive: true, force: true });
  }
});

// Trace: FR-022-AC-1, FR-022-AC-4, TC-007.
test.each(["\n", "\r\n"])(
  "loads and executes every block-list provider name with line ending %j",
  async (lineEnding) => {
    const harness = createHarness({
      invariants: ["external.pass:first", "external.last"],
      providerNames: ["external.pass", "external.last"],
    });
    try {
      const skillPath = join(harness.skill, "SKILL.md");
      const source = readFileSync(skillPath, "utf8")
        .replace(
          '    invariants: ["external.pass","external.last"]',
          "    invariants:\n      - external.pass\n      - external.last",
        )
        .replaceAll("\n", lineEnding);
      writeFileSync(skillPath, source);
      const plugin = await loadSkill(harness.skill);
      expect(plugin.workflows[0].invariantProvider?.owns("external.last")).toBe(
        true,
      );
      expect(
        plugin.workflows[0].invariantProvider?.owns("external.last\r"),
      ).toBe(false);
      const id = await createRun(harness);
      const result = await harness.runner.advance({ id, to: "closed" });
      expect(result).toMatchObject({ ok: true, current_phase: "closed" });
      expect(invocationCount(harness)).toBe(1);
      expect(
        JSON.parse(readFileSync(harness.requestPath, "utf8")),
      ).toMatchObject({
        invariants: ["external.pass:first", "external.last"],
      });
    } finally {
      rmSync(harness.work, { recursive: true, force: true });
    }
  },
);
