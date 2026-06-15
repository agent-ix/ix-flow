import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { configureRuntimeContext } from "@agent-ix/ix-cli-core";
import { WorkflowCommandRunner } from "./workflow-runner/runner.js";
import {
  jsonEnvelope,
  type WorkflowResultEnvelope,
} from "./workflow-runner/result.js";

interface ParsedArgs {
  command?: string;
  positionals: string[];
  flags: Record<string, string | boolean | string[]>;
}

const USAGE = `ix-flow

Agent workflow runner for Agent IX harnesses.

Usage:
  ix-flow run <flow> [--path <skill-dir>] [--id <id>] [--name <name>] [--target <ref>...]
  ix-flow status <run-id>
  ix-flow resume <run-id>
  ix-flow advance <run-id> <phase>
  ix-flow ack <run-id> <token> [--reviewer <id>] [--kind <kind>] [--note <text>]
  ix-flow history <run-id>

Global flags:
  --json
  --state-dir <dir>       Defaults to ~/.ix/flows
  --config-root <dir>     Defaults to ~/.ix
`;

export async function main(argv: string[]): Promise<void> {
  const parsed = parseArgs(argv);
  if (parsed.flags.version || parsed.flags.v || parsed.command === "version") {
    console.log(packageVersion());
    return;
  }
  if (!parsed.command || parsed.flags.help || parsed.flags.h) {
    console.log(USAGE);
    return;
  }

  const configRoot =
    stringFlag(parsed, "config-root") ?? join(homedir(), ".ix");
  configureRuntimeContext({
    configRoot,
    configNamespace: "ix",
    projectConfigRoot: resolve(process.cwd(), ".ix"),
    projectConfigEnabled: parsed.flags["no-project-config"] !== true,
  });

  const runner = new WorkflowCommandRunner({
    config: {
      stateDir: stringFlag(parsed, "state-dir") ?? join(configRoot, "flows"),
      defaultDefinition: "workflow",
      output: parsed.flags.json ? "json" : "human",
    },
    actor: { kind: "agent", id: "ix-flow" },
  });

  switch (parsed.command) {
    case "run": {
      const [flow] = parsed.positionals;
      if (!flow && !stringFlag(parsed, "path"))
        throw usageError("run requires <flow> or --path");
      await emit(
        await runner.create({
          definitionName: flow,
          skillPath: stringFlag(parsed, "path"),
          id: stringFlag(parsed, "id"),
          name: stringFlag(parsed, "name") ?? flow,
          targets: arrayFlag(parsed, "target").map((ref) => ({
            kind: "file",
            ref,
          })),
        }),
        parsed,
      );
      return;
    }
    case "status":
    case "resume": {
      const [id] = parsed.positionals;
      if (!id) throw usageError(`${parsed.command} requires <run-id>`);
      await emit(await runner.status(id), parsed);
      if (parsed.command === "resume" && !parsed.flags.json) {
        console.log(
          `\nResume this run with the current agent harness, then use ix-flow advance/ack as instructed by the workflow.`,
        );
      }
      return;
    }
    case "advance": {
      const [id, phase] = parsed.positionals;
      if (!id || !phase) throw usageError("advance requires <run-id> <phase>");
      await emit(await runner.advance({ id, to: phase }), parsed);
      return;
    }
    case "ack": {
      const [id, token] = parsed.positionals;
      if (!id || !token) throw usageError("ack requires <run-id> <token>");
      await emit(
        await runner.ack({
          id,
          token,
          reviewer: stringFlag(parsed, "reviewer"),
          kind: stringFlag(parsed, "kind"),
          note: stringFlag(parsed, "note"),
        }),
        parsed,
      );
      return;
    }
    case "history": {
      const [id] = parsed.positionals;
      if (!id) throw usageError("history requires <run-id>");
      await emit(await runner.history(id), parsed);
      return;
    }
    default:
      throw usageError(`unknown command ${parsed.command}`);
  }
}

export function packageVersion(): string {
  const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
  const packageJson = JSON.parse(
    readFileSync(join(packageRoot, "package.json"), "utf8"),
  ) as { version?: unknown };
  if (typeof packageJson.version !== "string") {
    throw new Error("package.json version is missing");
  }
  return packageJson.version;
}

function parseArgs(argv: string[]): ParsedArgs {
  const flags: ParsedArgs["flags"] = {};
  const positionals: string[] = [];
  let command: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      const key = arg.slice(2, eq === -1 ? undefined : eq);
      const value =
        eq !== -1
          ? arg.slice(eq + 1)
          : argv[i + 1] && !argv[i + 1].startsWith("-")
            ? argv[++i]
            : true;
      if (key === "target") {
        flags[key] = [
          ...arrayFlag({ flags } as ParsedArgs, key),
          String(value),
        ];
      } else {
        flags[key] = value;
      }
    } else if (arg.startsWith("-") && arg.length > 1) {
      flags[arg.slice(1)] = true;
    } else if (!command) {
      command = arg;
    } else {
      positionals.push(arg);
    }
  }
  return { command, positionals, flags };
}

async function emit(
  result: WorkflowResultEnvelope,
  parsed: ParsedArgs,
): Promise<void> {
  if (parsed.flags.json) {
    console.log(jsonEnvelope(result));
  } else if (result.ok) {
    console.log(`${result.command}: ${result.state ?? "ok"}`);
    if (result.instance_id) console.log(`run: ${result.instance_id}`);
    if (result.current_phase) console.log(`phase: ${result.current_phase}`);
    if (result.transitions_available?.length) {
      console.log(`next phases: ${result.transitions_available.join(", ")}`);
    }
    if (result.open_gates?.length) {
      console.log(`open gates: ${result.open_gates.length}`);
    }
    for (const action of result.nextActions ?? [])
      console.log(`next: ${action}`);
  } else {
    console.error(
      `${result.error?.code ?? "workflow_error"}: ${result.error?.message ?? "workflow command failed"}`,
    );
    process.exitCode = 1;
  }
}

function stringFlag(parsed: ParsedArgs, key: string): string | undefined {
  const value = parsed.flags[key];
  return typeof value === "string" ? value : undefined;
}

function arrayFlag(parsed: ParsedArgs, key: string): string[] {
  const value = parsed.flags[key];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return [value];
  return [];
}

function usageError(message: string): Error {
  return new Error(`${message}\n\n${USAGE}`);
}
