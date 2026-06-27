import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  configureRuntimeContext,
  maybeOfferUpdate,
} from "@agent-ix/ix-cli-core";
import type { JsonValue } from "./workflow-core/index.js";
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
  ix-flow record-answers <run-id> <interview-id> (--answers <json> | --answers-file <path>) [--merge]
  ix-flow recipe <run-id> <recipe-name>
  ix-flow add-item <run-id> <type> (--item <json> | --item-file <path>)
  ix-flow update-item <run-id> <type> <item-id> (--patch <json> | --patch-file <path>)
  ix-flow link-items <run-id> (--link <json> | --link-file <path>)
  ix-flow verify <run-id>
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

  // Offer a newer published ix-flow (throttled, interactive-only, silent under
  // --json / CI / non-TTY). Never blocks or throws.
  if (parsed.flags.json !== true) {
    await maybeOfferUpdate({
      packageName: "@agent-ix/ix-flow",
      currentVersion: packageVersion(),
    });
  }

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
    case "record-answers": {
      const [id, interviewId] = parsed.positionals;
      if (!id || !interviewId)
        throw usageError("record-answers requires <run-id> <interview-id>");
      const answers = jsonFlag(parsed, "answers", "record-answers --answers");
      if (answers === undefined)
        throw usageError("record-answers requires --answers or --answers-file");
      if (
        typeof answers !== "object" ||
        answers === null ||
        Array.isArray(answers)
      )
        throw usageError("record-answers --answers must be a JSON object");
      await emit(
        await runner.recordAnswers({
          id,
          interviewId,
          answers: answers as Record<string, JsonValue>,
          merge: parsed.flags.merge === true,
        }),
        parsed,
      );
      return;
    }
    case "recipe": {
      const [id, name] = parsed.positionals;
      if (!id || !name)
        throw usageError("recipe requires <run-id> <recipe-name>");
      await emit(await runner.runRecipe({ id, name }), parsed);
      return;
    }
    case "add-item": {
      const [id, type] = parsed.positionals;
      if (!id || !type) throw usageError("add-item requires <run-id> <type>");
      const item = jsonFlag(parsed, "item", "add-item --item");
      if (item === undefined)
        throw usageError("add-item requires --item or --item-file");
      await emit(await runner.addItem({ id, type, item }), parsed);
      return;
    }
    case "update-item": {
      const [id, type, itemId] = parsed.positionals;
      if (!id || !type || !itemId)
        throw usageError("update-item requires <run-id> <type> <item-id>");
      const patch = jsonFlag(parsed, "patch", "update-item --patch");
      if (patch === undefined)
        throw usageError("update-item requires --patch or --patch-file");
      await emit(await runner.updateItem({ id, type, itemId, patch }), parsed);
      return;
    }
    case "link-items": {
      const [id] = parsed.positionals;
      if (!id) throw usageError("link-items requires <run-id>");
      const link = jsonFlag(parsed, "link", "link-items --link");
      if (link === undefined)
        throw usageError("link-items requires --link or --link-file");
      await emit(await runner.linkItems({ id, link }), parsed);
      return;
    }
    case "verify": {
      const [id] = parsed.positionals;
      if (!id) throw usageError("verify requires <run-id>");
      await emit(await runner.verifyChain(id), parsed);
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
    emitChainVerification(result);
    emitRecipeSteps(result);
    emitInterviewFollowups(result);
    for (const action of result.nextActions ?? [])
      console.log(`next: ${action}`);
  } else if (result.state === "gate_deferred") {
    // A deferred human gate is an expected outcome, not an error: surface the
    // gate token and next actions so the run can be acknowledged and retried.
    console.log(`${result.command}: ${result.state}`);
    if (result.instance_id) console.log(`run: ${result.instance_id}`);
    if (result.current_phase) console.log(`phase: ${result.current_phase}`);
    for (const gate of result.open_gates ?? [])
      console.log(`gate: ${gate.token} (to ${gate.to})`);
    emitRecipeSteps(result);
    for (const action of result.nextActions ?? [])
      console.log(`next: ${action}`);
  } else {
    console.error(
      `${result.error?.code ?? "workflow_error"}: ${result.error?.message ?? "workflow command failed"}`,
    );
    process.exitCode = 1;
  }
}

function emitChainVerification(result: WorkflowResultEnvelope): void {
  if (result.command !== "verify-chain") return;
  const v = result.data as
    | { ok?: boolean; firstBreakIndex?: number }
    | undefined;
  if (v?.ok) {
    console.log("chain: intact");
  } else {
    console.log(`chain: BROKEN at event ${v?.firstBreakIndex ?? "?"}`);
  }
}

function emitRecipeSteps(result: WorkflowResultEnvelope): void {
  for (const step of result.recipe_steps ?? []) {
    const outcome = step.ok ? (step.state ?? "ok") : "failed";
    console.log(`step ${step.index}: ${step.command} -> ${outcome}`);
  }
}

function emitInterviewFollowups(result: WorkflowResultEnvelope): void {
  for (const followup of result.interview_followups ?? []) {
    console.log(
      `follow-up (${followup.interviewId}.${followup.questionKey}): ${followup.prompt}`,
    );
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

/**
 * Read a JSON value from `--<key> <json>` (inline) or `--<key>-file <path>`.
 * Returns undefined when neither flag is present. Throws a usage error on
 * malformed JSON or an unreadable file so the caller surfaces guidance.
 */
function jsonFlag(
  parsed: ParsedArgs,
  key: string,
  label: string,
): JsonValue | undefined {
  const inline = stringFlag(parsed, key);
  const filePath = stringFlag(parsed, `${key}-file`);
  let text: string;
  if (inline !== undefined) {
    text = inline;
  } else if (filePath !== undefined) {
    try {
      text = readFileSync(filePath, "utf8");
    } catch (err) {
      throw usageError(
        `${label}-file could not be read: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  } else {
    return undefined;
  }
  try {
    return JSON.parse(text) as JsonValue;
  } catch (err) {
    throw usageError(
      `${label} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

function usageError(message: string): Error {
  return new Error(`${message}\n\n${USAGE}`);
}
