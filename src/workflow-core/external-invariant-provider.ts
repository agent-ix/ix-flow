import { spawnSync } from "node:child_process";
import { isAbsolute, resolve, win32 } from "node:path";
import { z } from "zod";

import { WorkflowCoreError } from "./errors.js";
import type {
  InvariantBatchContext,
  InvariantBatchProvider,
  InvariantResult,
} from "./transition.js";

const PROVIDER_TIMEOUT_MS = 5_000;
const PROVIDER_MAX_BUFFER_BYTES = 1024 * 1024;

const declarationSchema = z
  .object({
    command: z.string().min(1),
    args: z.array(z.string()),
    "request-protocol": z.string().min(1),
    "result-protocol": z.string().min(1),
    invariants: z.array(z.string().min(1)).min(1),
  })
  .strict();

const passedOutcomeSchema = z
  .object({
    invariant: z.string().min(1),
    status: z.literal("passed"),
  })
  .strict();

const failedOutcomeSchema = z
  .object({
    invariant: z.string().min(1),
    status: z.literal("failed"),
    code: z.string().min(1),
    details: z.record(z.string(), z.unknown()),
  })
  .strict();

const resultSchema = z
  .object({
    protocol: z.string().min(1),
    outcomes: z.array(
      z.discriminatedUnion("status", [
        passedOutcomeSchema,
        failedOutcomeSchema,
      ]),
    ),
  })
  .strict();

interface ExternalProviderDeclaration {
  command: string;
  args: string[];
  requestProtocol: string;
  resultProtocol: string;
  invariants: string[];
}

/**
 * Read and validate the optional external-provider declaration from SKILL.md
 * metadata. The returned provider owns process transport only; invariant
 * semantics remain in the declared command.
 */
export function readExternalInvariantProvider(
  metadata: unknown,
  skillRoot: string,
  skillMdPath: string,
): InvariantBatchProvider | undefined {
  // Implements: FR-022-AC-4.
  if (
    metadata === null ||
    typeof metadata !== "object" ||
    !Object.prototype.hasOwnProperty.call(
      metadata,
      "ix-flow-invariant-provider",
    )
  ) {
    return undefined;
  }

  const parsed = declarationSchema.safeParse(
    (metadata as Record<string, unknown>)["ix-flow-invariant-provider"],
  );
  if (!parsed.success) {
    throw new WorkflowCoreError(
      "skill_format_invalid",
      "SKILL.md frontmatter declaration 'metadata.ix-flow-invariant-provider' is invalid.",
      {
        path: skillMdPath,
        declaration: "metadata.ix-flow-invariant-provider",
      },
    );
  }

  if (new Set(parsed.data.invariants).size !== parsed.data.invariants.length) {
    throw new WorkflowCoreError(
      "skill_format_invalid",
      "SKILL.md external invariant provider names must be unique.",
      {
        path: skillMdPath,
        declaration: "metadata.ix-flow-invariant-provider.invariants",
      },
    );
  }

  return new ProcessInvariantProvider(skillRoot, {
    command: parsed.data.command,
    args: parsed.data.args,
    requestProtocol: parsed.data["request-protocol"],
    resultProtocol: parsed.data["result-protocol"],
    invariants: parsed.data.invariants,
  });
}

class ProcessInvariantProvider implements InvariantBatchProvider {
  private readonly ownedNames: ReadonlySet<string>;

  constructor(
    private readonly skillRoot: string,
    private readonly declaration: ExternalProviderDeclaration,
  ) {
    this.ownedNames = new Set(declaration.invariants);
  }

  owns(reference: string): boolean {
    const separator = reference.indexOf(":");
    const base = separator < 0 ? reference : reference.slice(0, separator);
    return this.ownedNames.has(reference) || this.ownedNames.has(base);
  }

  evaluate(
    context: InvariantBatchContext,
    invariants: readonly string[],
  ): ReadonlyMap<string, InvariantResult> {
    // Implements: FR-022-AC-1, FR-022-AC-2, FR-022-AC-5.
    // Implements: FR-022-AC-6, FR-022-AC-7.
    const command = resolveCommand(this.skillRoot, this.declaration.command);
    const request = JSON.stringify({
      protocol: this.declaration.requestProtocol,
      invariants,
      instance: {
        defName: context.instance.defName,
        items: context.instance.items,
        gateConfig: context.instance.gateConfig,
      },
      evaluated_at: context.evaluatedAt,
    });

    const execution = spawnSync(command, this.declaration.args, {
      cwd: this.skillRoot,
      input: `${request}\n`,
      shell: false,
      timeout: PROVIDER_TIMEOUT_MS,
      maxBuffer: PROVIDER_MAX_BUFFER_BYTES,
      encoding: "utf8",
      windowsHide: true,
    });

    if (execution.error) {
      const code = (execution.error as NodeJS.ErrnoException).code;
      if (code === "ETIMEDOUT") {
        throw providerError(
          "invariant_provider_timeout",
          "External invariant provider exceeded its execution deadline.",
          command,
        );
      }
      if (code === "ENOBUFS") {
        throw providerError(
          "invariant_provider_output_oversized",
          "External invariant provider exceeded an output bound.",
          command,
        );
      }
      throw providerError(
        "invariant_provider_spawn_failed",
        "External invariant provider could not be started.",
        command,
      );
    }

    if (execution.signal !== null) {
      throw new WorkflowCoreError(
        "invariant_provider_crashed",
        "External invariant provider terminated by signal.",
        { command, signal: execution.signal },
      );
    }
    if (execution.status !== 0) {
      throw new WorkflowCoreError(
        "invariant_provider_exit_nonzero",
        "External invariant provider exited unsuccessfully.",
        { command, status: execution.status },
      );
    }

    let raw: unknown;
    try {
      raw = JSON.parse(execution.stdout);
    } catch {
      throw providerError(
        "invariant_provider_output_malformed",
        "External invariant provider stdout is not one JSON result.",
        command,
      );
    }

    if (
      raw !== null &&
      typeof raw === "object" &&
      typeof (raw as Record<string, unknown>).protocol === "string" &&
      (raw as Record<string, unknown>).protocol !==
        this.declaration.resultProtocol
    ) {
      throw new WorkflowCoreError(
        "invariant_provider_protocol_mismatch",
        "External invariant provider returned an unsupported result protocol.",
        {
          command,
          expected: this.declaration.resultProtocol,
          observed: (raw as Record<string, unknown>).protocol,
        },
      );
    }

    const parsed = resultSchema.safeParse(raw);
    if (!parsed.success) {
      throw providerError(
        "invariant_provider_output_malformed",
        "External invariant provider returned an invalid result document.",
        command,
      );
    }

    const requested = new Set(invariants);
    const unknown = parsed.data.outcomes.find(
      (outcome) => !requested.has(outcome.invariant),
    );
    if (unknown) {
      throw new WorkflowCoreError(
        "invariant_provider_unknown_invariant",
        "External invariant provider returned an unrequested invariant.",
        { command, invariant: unknown.invariant },
      );
    }

    if (
      parsed.data.outcomes.length !== invariants.length ||
      parsed.data.outcomes.some(
        (outcome, index) => outcome.invariant !== invariants[index],
      )
    ) {
      throw providerError(
        "invariant_provider_output_malformed",
        "External invariant provider outcomes do not correspond to the request.",
        command,
      );
    }

    return new Map(
      parsed.data.outcomes.map((outcome) => [
        outcome.invariant,
        outcome.status === "passed"
          ? true
          : {
              ok: false as const,
              code: outcome.code,
              details: outcome.details,
            },
      ]),
    );
  }
}

function resolveCommand(skillRoot: string, command: string): string {
  if (isAbsolute(command) || win32.isAbsolute(command)) return command;
  if (command.includes("/") || command.includes("\\")) {
    return resolve(skillRoot, command);
  }
  return command;
}

function providerError(
  code: string,
  message: string,
  command: string,
): WorkflowCoreError {
  return new WorkflowCoreError(code, message, { command });
}
