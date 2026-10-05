import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { On } from "claude-code";
import { main } from "../src/cli";
import {
  ballColor,
  lineColor,
  progressLine,
  progressSegments,
  progressionColor,
  register,
} from "../hooks/register";

function renderedText(tree: unknown): string {
  if (typeof tree === "string") return tree;
  if (!tree || typeof tree !== "object") return "";
  const children = (tree as { children?: unknown[] }).children;
  return children ? children.map(renderedText).join("") : "";
}

test("each sweep has a blank frame and the ball stays brighter than the growing line", () => {
  expect(progressLine(run, { working: true, frame: 5 })).toContain(
    "⊙ build ───── ○ review",
  );
  expect(progressLine(run, { working: true, frame: 6 })).toContain(
    "⊙ build •──── ○ review",
  );
  const intensity = (color: string) =>
    [1, 3, 5].reduce(
      (sum, offset) => sum + parseInt(color.slice(offset, offset + 2), 16),
      0,
    );
  for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
    expect(intensity(ballColor(progress, 0))).toBeGreaterThan(
      intensity(lineColor(progress)),
    );
    expect(intensity(ballColor(progress, 2))).toBeGreaterThan(
      intensity(ballColor(progress, 0)),
    );
  }
  expect(intensity(lineColor(1))).toBeGreaterThan(intensity(lineColor(0)));
});

test("the progression gradient is continuous, subdued, and clamped", () => {
  expect(progressionColor(0)).toBe("#608cdc");
  expect(progressionColor(1)).toBe("#64bed7");
  expect(progressionColor(-1)).toBe(progressionColor(0));
  expect(progressionColor(2)).toBe(progressionColor(1));
  expect(progressionColor(0.5)).toBe("#62a5da");
});

test("progress exposes the pinned phase graph without modifying the run", async () => {
  const stateDir = mkdtempSync(join(tmpdir(), "ixflow-progress-"));
  const lines: string[] = [];
  const spy = vi
    .spyOn(console, "log")
    .mockImplementation((value) => lines.push(String(value)));
  try {
    await main([
      "run",
      "intake",
      "--path",
      "examples/intake",
      "--id",
      "hud-test",
      "--state-dir",
      stateDir,
      "--json",
    ]);
    const path = join(stateDir, "instances", "hud-test.json");
    const before = readFileSync(path, "utf8");
    lines.length = 0;
    await main(["progress", "hud-test", "--state-dir", stateDir, "--json"]);
    const response = JSON.parse(lines[0]);
    expect(response.ok).toBe(true);
    expect(
      response.data.phases.map((phase: { name: string }) => phase.name),
    ).toEqual(["collecting", "drafting", "done"]);
    expect(response.data.phases[2].terminal).toBe(true);
    expect(response.data.transitions).toEqual([
      { from: "collecting", to: "drafting" },
      { from: "drafting", to: "done" },
    ]);
    expect(readFileSync(path, "utf8")).toBe(before);
  } finally {
    spy.mockRestore();
    rmSync(stateDir, { recursive: true, force: true });
  }
});

const run = {
  id: "test",
  name: "release",
  phase: "build",
  stateVersion: 1,
  phases: [
    { name: "plan" },
    { name: "build" },
    { name: "review" },
    { name: "ship", terminal: true },
  ],
  transitions: [
    { from: "plan", to: "build" },
    { from: "build", to: "review" },
    { from: "review", to: "ship" },
  ],
  events: [{ kind: "phase.advanced", payload: { from: "plan", to: "build" } }],
  openGates: [],
};

test("the dot travels left to right and changes shape, pausing for gates and completion", () => {
  expect(progressLine(run, { working: true, frame: 0 })).toContain(
    "⊙ build •──── ○ review",
  );
  expect(progressLine(run, { working: true, frame: 2 })).toContain(
    "⊙ build ──•── ○ review",
  );
  const waiting = progressLine(
    { ...run, openGates: [{ to: "review" }] },
    { working: true },
  );
  expect(waiting).toContain("◇ build");
  expect(waiting).toContain("approval");
  expect(waiting).toContain("◇ build ───── ○ review");
  expect(progressLine(run, { working: true, frame: 4 })).toContain(
    "⊙ build ────• ○ review",
  );
  expect(progressLine(run, { working: true, blocked: true })).toContain(
    "⊗ build",
  );
  expect(progressLine({ ...run, phase: "ship" }, { working: true })).toContain(
    "✓ ship · done",
  );
  const narrow = progressLine(run, { working: true, width: 35 });
  expect(narrow.match(/[✓⊙○]/g)).toHaveLength(4);
});

test("the full stage strip stays fixed across the complete flow", () => {
  let events = [] as typeof run.events;
  const lines = run.phases.map((phase, index) => {
    if (index > 0)
      events = [
        ...events,
        {
          kind: "phase.advanced",
          payload: { from: run.phases[index - 1].name, to: phase.name },
        },
      ];
    const state = { ...run, phase: phase.name, events };
    const line = progressLine(state, { working: true });
    for (const item of run.phases) expect(line).toContain(item.name);
    expect(line.match(/[✓⊙○]/g)).toHaveLength(4);
    if (!phase.terminal)
      expect(
        progressSegments(state).find(
          (segment: { kind: string }) => segment.kind === "active",
        )?.text,
      ).toBe(`⊙ ${phase.name}`);
    return line;
  });
  expect(new Set(lines.map((line: string) => line.length)).size).toBe(1);
  expect(lines[3]).toContain(
    "✓ plan ━━━━━ ✓ build ━━━━━ ✓ review ━━━━━ ✓ ship · done",
  );
});

test("unvisited branches are not marked complete or drawn as adjacent transitions", () => {
  const branched = {
    ...run,
    phases: [
      ...run.phases.slice(0, 2),
      { name: "cancel" },
      ...run.phases.slice(2),
    ],
    phase: "review",
    events: [
      ...run.events,
      { kind: "phase.advanced", payload: { from: "build", to: "review" } },
    ],
  };
  const line = progressLine(branched);
  expect(line).toContain("○ cancel");
  expect(line).not.toContain("✓ cancel");
  expect(line).toContain("  |  ");
});

test("the mod watches an explicit run, preserves other bands, and hides on off", async () => {
  type Handler = (...args: unknown[]) => Promise<unknown>;
  const hooks = new Map<string, Handler>();
  register(((event: string, matcher: unknown, handler?: Handler) => {
    hooks.set(event, handler ?? (matcher as Handler));
  }) as unknown as On);
  const processRun = vi.fn(async () => ({
    exitCode: 0,
    stdout: JSON.stringify({ ok: true, data: run }),
  }));
  const api = {
    env: { get: async () => "/test/ix-flow" },
    command: { register: vi.fn() },
    clock: { every: vi.fn() },
    process: { run: processRun },
    ui: {
      invalidate: vi.fn(),
      resolve: () => ({
        Box: (props: unknown) => props,
        Text: (props: unknown) => props,
      }),
    },
  };
  await hooks.get("session.start")!(api, {}, async (event: unknown) => event);
  await hooks.get("command.run")!(api, { args: "test /tmp/flows with spaces" });
  expect(processRun).toHaveBeenCalledWith(
    [
      "/test/ix-flow",
      "progress",
      "test",
      "--json",
      "--state-dir",
      "/tmp/flows with spaces",
    ],
    { timeoutMs: 3000 },
  );
  const next = vi.fn(async () => ({ other: "band" }));
  const tree = await hooks.get("ui.render")!(
    api,
    { viewport: { columns: 120 } },
    next,
  );
  expect(tree).toMatchObject({
    children: [
      { other: "band" },
      {
        children: expect.arrayContaining([
          expect.objectContaining({
            bold: true,
            color: "#c8ced8",
            children: [
              expect.objectContaining({ color: "#80d9a0", children: ["⊙"] }),
              " build",
            ],
          }),
        ]),
      },
    ],
  });
  await hooks.get("command.run")!(api, { args: "off" });
  expect(await hooks.get("ui.render")!(api, {}, next)).toEqual({
    other: "band",
  });
  processRun.mockClear();
  await hooks.get("command.run")!(api, { args: "demo" });
  const preview = await hooks.get("ui.render")!(api, {}, next);
  expect(renderedText(preview)).toContain("•────");
  const animate = api.clock.every.mock.calls.find(
    (args: unknown[]) => args[0] === 450,
  );
  await (animate?.[1] as () => void)();
  expect(renderedText(await hooks.get("ui.render")!(api, {}, next))).toContain(
    "─•───",
  );
  expect(processRun).not.toHaveBeenCalled();
  for (const [ticks, phase] of [
    [11, "build"],
    [12, "review"],
    [12, "ship"],
  ] as const) {
    for (let tick = 0; tick < ticks; tick++)
      await (animate?.[1] as () => void)();
    expect(
      renderedText(await hooks.get("ui.render")!(api, {}, next)),
    ).toContain(phase === "ship" ? "✓ ship" : `⊙ ${phase}`);
  }
  const finished = renderedText(await hooks.get("ui.render")!(api, {}, next));
  expect(finished).toContain("✓ plan");
  expect(finished).toContain("✓ build");
  expect(finished).toContain("✓ review");
  await (animate?.[1] as () => void)();
  expect(renderedText(await hooks.get("ui.render")!(api, {}, next))).toBe(
    finished,
  );
  expect(processRun).not.toHaveBeenCalled();
  await hooks.get("command.run")!(api, { args: "demo" });
  expect(renderedText(await hooks.get("ui.render")!(api, {}, next))).toContain(
    "⊙ plan",
  );
  await hooks.get("tool.call")!(
    api,
    {
      command: 'ix-flow run release --state-dir "/tmp/automatic flows" --json',
    },
    async () => ({
      result: { stdout: JSON.stringify({ ok: true, instance_id: "test" }) },
    }),
  );
  expect(processRun).toHaveBeenLastCalledWith(
    [
      "/test/ix-flow",
      "progress",
      "test",
      "--json",
      "--state-dir",
      "/tmp/automatic flows",
    ],
    { timeoutMs: 3000 },
  );
  expect(renderedText(await hooks.get("ui.render")!(api, {}, next))).toContain(
    "⊙ build",
  );
  await hooks.get("tool.call")!(
    api,
    { command: "ix-flow resume test" },
    async () => ({ result: { stdout: "run: test\nphase: build\n" } }),
  );
  expect(processRun).toHaveBeenLastCalledWith(
    ["/test/ix-flow", "progress", "test", "--json"],
    { timeoutMs: 3000 },
  );
  processRun.mockResolvedValueOnce({
    exitCode: 0,
    stdout: JSON.stringify({ ok: true, data: { ...run, phases: [null] } }),
  });
  const poll = api.clock.every.mock.calls.find(
    (args: unknown[]) => args[0] === 2000,
  );
  await (poll?.[1] as () => Promise<void>)();
  expect(renderedText(await hooks.get("ui.render")!(api, {}, next))).toContain(
    "⊗ invalid progress response",
  );
  await hooks.get("command.run")!(api, { args: "off" });
});
