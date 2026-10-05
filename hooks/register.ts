import type { EngineInterface, On } from "claude-code";

// Read-only workflow HUD. Only progress queries are launched by this mod.
export interface ProgressRun {
  id: string;
  name?: string;
  defName?: string;
  phase: string;
  stateVersion: number;
  phases: Array<{ name: string; terminal?: boolean }>;
  transitions: Array<{ from: string; to: string }>;
  events: Array<{ kind: string; payload: Record<string, unknown> }>;
  openGates?: Array<{ to: string }>;
}
export interface ProgressOptions {
  frame?: number;
  working?: boolean;
  blocked?: boolean;
  width?: number;
}
export interface ProgressSegment {
  text: string;
  kind:
    | "label"
    | "active"
    | "done"
    | "pending"
    | "chaser"
    | "connector"
    | "status";
  completed?: boolean;
}
type RGB = readonly [number, number, number];
type Selection = { id: string; stateDir?: string };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function progressRun(value: unknown): value is ProgressRun {
  return (
    record(value) &&
    typeof value.id === "string" &&
    typeof value.phase === "string" &&
    typeof value.stateVersion === "number" &&
    Number.isSafeInteger(value.stateVersion) &&
    (value.name === undefined || typeof value.name === "string") &&
    (value.defName === undefined || typeof value.defName === "string") &&
    Array.isArray(value.phases) &&
    value.phases.length > 0 &&
    value.phases.every(
      (phase: unknown) =>
        record(phase) &&
        typeof phase.name === "string" &&
        (phase.terminal === undefined || typeof phase.terminal === "boolean"),
    ) &&
    value.phases.some(
      (phase: { name: string }) => phase.name === value.phase,
    ) &&
    Array.isArray(value.transitions) &&
    value.transitions.every(
      (edge: unknown) =>
        record(edge) &&
        typeof edge.from === "string" &&
        typeof edge.to === "string",
    ) &&
    Array.isArray(value.events) &&
    value.events.every(
      (event: unknown) =>
        record(event) &&
        typeof event.kind === "string" &&
        record(event.payload),
    ) &&
    (value.openGates === undefined ||
      (Array.isArray(value.openGates) &&
        value.openGates.every(
          (gate: unknown) => record(gate) && typeof gate.to === "string",
        )))
  );
}

const FRAMES = ["•────", "─•───", "──•──", "───•─", "────•", "─────"];
const DEMO_STAGE_TICKS = 12;

function gradient(progress: number, start: RGB, end: RGB): string {
  const t = Math.max(0, Math.min(1, progress));
  return (
    "#" +
    start
      .map((value, index) =>
        Math.round(value + (end[index] - value) * t)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

export function lineColor(progress: number): string {
  return gradient(progress, [52, 72, 101], [119, 153, 191]);
}

export function ballColor(progress: number, frame: number): string {
  // A shallow rise and fall in intensity during the one-way sweep.
  const pulse = Math.round(
    8 * Math.sin((Math.PI * (frame % FRAMES.length)) / (FRAMES.length - 1)),
  );
  return gradient(
    progress,
    [130 + pulse, 177 + pulse, 235 + pulse],
    [174 + pulse, 222 + pulse, 247 + pulse],
  );
}

export function progressionColor(progress: number): string {
  const t = Math.max(0, Math.min(1, progress));
  const rgb = [96, 140, 220].map((start, index) =>
    Math.round(start + ([100, 190, 215][index] - start) * t),
  );
  return (
    "#" + rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("")
  );
}

const clean = (value: unknown): string =>
  String(value ?? "").replace(/[\x00-\x1f\x7f-\x9f]/g, "");

function commandLocation(command: string): Pick<Selection, "stateDir"> | null {
  const state =
    /--state-dir(?:=|\s+)(?:"([^"$`]+)"|'([^']+)'|([^\s;&|$`]+))/.exec(command);
  const config =
    /--config-root(?:=|\s+)(?:"([^"$`]+)"|'([^']+)'|([^\s;&|$`]+))/.exec(
      command,
    );
  if (/--state-dir\b/.test(command) && !state) return null;
  if (/--config-root\b/.test(command) && !config) return null;
  const stateDir = state?.[1] ?? state?.[2] ?? state?.[3];
  const configRoot = config?.[1] ?? config?.[2] ?? config?.[3];
  return {
    stateDir: stateDir ?? (configRoot ? `${configRoot}/flows` : undefined),
  };
}

/** A stable, complete stage strip; only markers, colors, and connectors change. */
export function progressSegments(
  run: ProgressRun,
  {
    frame = 0,
    working = false,
    blocked = false,
    width = 120,
  }: ProgressOptions = {},
) {
  const terminal = run.phases.some(
    (phase) => phase.name === run?.phase && phase.terminal,
  );
  const waiting = (run.openGates?.length ?? 0) > 0;
  const moving = working && !blocked && !waiting && !terminal;
  const completed = new Set(
    (run.events ?? [])
      .filter((event) => event.kind === "phase.advanced")
      .map((event) => event.payload.from),
  );
  const prefix = `[${clean(run.name || run.defName)}]  `;
  // Label sizes depend on the complete definition, never the current stage.
  const labelBudget = Math.max(
    1,
    Math.floor(
      (width -
        prefix.length -
        12 -
        (run.phases.length - 1) * 7 -
        run.phases.length * 2) /
        run.phases.length,
    ),
  );
  const segments: ProgressSegment[] = [{ text: prefix, kind: "label" }];
  run.phases.forEach((phase, index) => {
    const active = phase.name === run?.phase;
    const done = active ? terminal : completed.has(phase.name);
    const marker = active
      ? blocked
        ? "⊗"
        : waiting
          ? "◇"
          : terminal
            ? "✓"
            : "⊙"
      : done
        ? "✓"
        : "○";
    const name = clean(phase.name);
    const label =
      name.length > labelBudget
        ? name.slice(0, Math.max(0, labelBudget - 1)) + "…"
        : name;
    segments.push({
      text: `${marker} ${label}`,
      kind: active && !terminal ? "active" : done ? "done" : "pending",
    });
    if (index < run.phases.length - 1) {
      const adjacent = run.transitions.some(
        (edge) =>
          edge.from === phase.name && edge.to === run.phases[index + 1].name,
      );
      const track = adjacent
        ? active && moving
          ? FRAMES[frame % FRAMES.length]
          : done
            ? "━━━━━"
            : "─────"
        : "  |  ";
      segments.push({
        text: ` ${track} `,
        kind: active && moving && adjacent ? "chaser" : "connector",
        completed: done,
      });
    }
  });
  const status = blocked
    ? " · blocked"
    : waiting
      ? " · approval"
      : terminal
        ? " · done"
        : "";
  segments.push({ text: status.padEnd(12), kind: "status" });
  return segments;
}

export function progressLine(
  run: ProgressRun,
  options: ProgressOptions = {},
): string {
  return progressSegments(run, options)
    .map((segment) => segment.text)
    .join("");
}

let selected: Selection | null = null;
let run: ProgressRun | null = null;
let error = "";
let reading = false;
let working = false;
let blockedVersion: number | null = null;
let frame = 0;
let executable = "ix-flow";
let selectionVersion = 0;
let demo = false;
let demoTicks = 0;

async function refresh($: EngineInterface): Promise<void> {
  if (!selected || demo || reading) return;
  reading = true;
  const version = selectionVersion;
  try {
    const argv = [executable, "progress", selected.id, "--json"];
    if (selected.stateDir) argv.push("--state-dir", selected.stateDir);
    const result = await $.process.run(argv, { timeoutMs: 3000 });
    if (version !== selectionVersion) return;
    const envelope: unknown = JSON.parse(result.stdout);
    if (!record(envelope)) throw Error("invalid progress response");
    if (result.exitCode !== 0 || !envelope.ok)
      throw Error(
        record(envelope.error) && typeof envelope.error.message === "string"
          ? envelope.error.message
          : "progress query failed",
      );
    const data = envelope.data;
    if (!progressRun(data) || data.id !== selected.id)
      throw Error("invalid progress response");
    run = data;
    error = "";
    if (blockedVersion !== run.stateVersion) blockedVersion = null;
  } catch (err) {
    if (version === selectionVersion) {
      run = null;
      error = clean(err instanceof Error ? err.message : err).slice(0, 160);
    }
  } finally {
    reading = false;
    $.ui.invalidate("ui.render");
  }
}

export function register(on: On): void {
  on("session.start", async ($, e, next) => {
    executable = (await $.env.get("IX_FLOW_MOD_CLI")) || "ix-flow";
    await $.command.register({
      name: "flow-status",
      description: "Watch a run, preview with demo, or hide with off",
      argumentHint: "RUN_ID [ABSOLUTE_STATE_DIR] | demo | off",
    });
    $.clock.every(2000, () => refresh($));
    $.clock.every(450, () => {
      if (
        run &&
        (working || demo) &&
        !run.openGates?.length &&
        blockedVersion === null &&
        !run.phases.some((phase) => phase.name === run?.phase && phase.terminal)
      ) {
        frame++;
        if (demo) {
          demoTicks++;
          if (demoTicks % DEMO_STAGE_TICKS === 0) {
            const index = run.phases.findIndex(
              (phase) => phase.name === run?.phase,
            );
            const to = run.phases[index + 1]?.name;
            if (to) {
              run.events.push({
                kind: "phase.advanced",
                payload: { from: run.phase, to },
              });
              run.phase = to;
              run.stateVersion++;
              frame = 0;
            }
          }
        }
        $.ui.invalidate("ui.render");
      }
    });
    return next(e);
  });

  on("command.run", { command: "flow-status" }, async ($, e) => {
    const args = e.args.trim();
    if (args === "off") {
      demo = false;
      selectionVersion++;
      selected = null;
      run = null;
      error = "";
      $.ui.invalidate("ui.render");
      return {};
    }
    if (args === "demo") {
      selectionVersion++;
      demo = true;
      selected = { id: "demo" };
      frame = 0;
      demoTicks = 0;
      blockedVersion = null;
      error = "";
      run = {
        id: "demo",
        name: "preview",
        phase: "plan",
        stateVersion: 0,
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
        events: [],
        openGates: [],
      };
      $.ui.invalidate("ui.render");
      return {};
    }
    const match = /^(\S+)(?:\s+(\/.*))?$/.exec(args);
    if (!match || !/^[a-zA-Z0-9_-]+$/.test(match[1]))
      return {
        text: "Usage: /flow-status RUN_ID [ABSOLUTE_STATE_DIR] | demo | off",
      };
    demo = false;
    selectionVersion++;
    selected = { id: match[1], stateDir: match[2] };
    run = null;
    blockedVersion = null;
    error = "";
    await refresh($);
    return error ? { text: `ix-flow: ${error}` } : {};
  });

  on("turn.start", async ($, e, next) => {
    working = true;
    $.ui.invalidate("ui.render");
    return next(e);
  });
  on("turn.complete", async ($, e, next) => {
    working = false;
    await refresh($);
    $.ui.invalidate("ui.render");
    return next(e);
  });

  on("tool.call", { tool: "Bash" }, async ($, e, next) => {
    const result = await next(e);
    // Observe completed CLI output and display its run without changing the tool.
    const command = typeof e.command === "string" ? e.command : "";
    if (!/\bix-flow\b/.test(command)) return result;
    try {
      const output: unknown = result.result;
      const stdout =
        record(output) && typeof output.stdout === "string"
          ? output.stdout
          : "";
      let envelope: unknown;
      try {
        envelope = JSON.parse(stdout);
      } catch {
        const match = /^run: ([a-zA-Z0-9_-]+)\s*$/m.exec(stdout);
        if (!match) return result;
        envelope = { instance_id: match[1], ok: !result.isError };
      }
      if (!record(envelope)) return result;
      const failedCommand =
        /\bix-flow\s+(?:advance|recipe)\s+([a-zA-Z0-9_-]+)(?:\s|$)/.exec(
          command,
        );
      const id =
        envelope.instance_id ??
        (envelope.ok === false ? failedCommand?.[1] : undefined);
      if (typeof id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(id)) return result;
      const location = commandLocation(command);
      if (location === null) return result;
      if (
        demo ||
        selected?.id !== id ||
        selected?.stateDir !== location.stateDir
      ) {
        selectionVersion++;
        demo = false;
        selected = { id, ...location };
        run = null;
        error = "";
      }
      if (selected?.id === id) {
        if (envelope.state === "invariant_failed" || envelope.ok === false)
          blockedVersion =
            typeof envelope.state_version === "number"
              ? envelope.state_version
              : (run?.stateVersion ?? null);
        else blockedVersion = null;
        await refresh($);
      }
    } catch {
      /* Unrecognized output leaves the selected run unchanged. */
    }
    return result;
  });

  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    if (!selected) return next(e);
    const { Box, Text } = $.ui.resolve(e);
    const blocked = blockedVersion !== null;
    const progression = demo
      ? demoTicks / (DEMO_STAGE_TICKS * 3)
      : Math.max(
          0,
          run?.phases.findIndex((phase) => phase.name === run?.phase) ?? 0,
        ) / Math.max(1, (run?.phases.length ?? 1) - 1);
    const segments: ProgressSegment[] = run
      ? progressSegments(run, {
          frame,
          working: working || demo,
          blocked,
          width: e.viewport?.columns ?? 120,
        })
      : [
          {
            text: `[${selected.id}]  ⊗ ${error || "loading"}`,
            kind: "status",
          },
        ];
    const children = segments.map((segment) => {
      if (segment.kind === "active") {
        return Text({
          color: "#c8ced8",
          bold: true,
          children: [
            Text({
              color: blocked
                ? "red"
                : run?.openGates?.length
                  ? "yellow"
                  : "#80d9a0",
              children: [segment.text.slice(0, 1)],
            }),
            segment.text.slice(1),
          ],
        });
      }
      if (segment.kind === "chaser") {
        const position = segment.text.indexOf("•");
        return Text({
          color: lineColor(progression),
          children:
            position < 0
              ? [segment.text]
              : [
                  segment.text.slice(0, position),
                  Text({
                    color: ballColor(progression, frame),
                    bold: true,
                    children: ["•"],
                  }),
                  segment.text.slice(position + 1),
                ],
        });
      }
      return Text({
        color:
          segment.kind === "done" ||
          (segment.kind === "connector" && segment.completed)
            ? lineColor(progression)
            : segment.kind === "status" && (error || blocked)
              ? "red"
              : "#596474",
        children: [segment.text],
      });
    });
    return Box({
      flexDirection: "column",
      children: [
        await next(e),
        Text({
          color: "gray",
          wrap: "truncate-end",
          children,
        }),
      ],
    });
  });
}
