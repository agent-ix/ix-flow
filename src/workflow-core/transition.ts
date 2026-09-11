import type { Transition, WorkflowDef } from "./definition.js";
import {
  TransitionInvariantError,
  TransitionInvariantUnregisteredError,
  TransitionNotFoundError,
  WorkflowCoreError,
} from "./errors.js";
import type { WorkflowInstance } from "./instance.js";

export interface InvariantContext {
  definition: WorkflowDef;
  instance: WorkflowInstance;
  transition: Transition;
  /**
   * Argument extracted from an invariant reference of the form
   * `<name>:<arg>` in `Transition.invariants`. Empty string when no
   * argument was supplied.
   */
  arg: string;
  /**
   * Sibling invariants registered for this evaluation pass. Allows
   * composite evaluators (e.g. `interview.complete` with a
   * `custom_invariant:<name>` completenessRule) to delegate to another
   * registered invariant without depending on a separate registry.
   */
  invariants: Record<string, InvariantEvaluator>;
}

export type InvariantResult =
  | boolean
  | string
  | void
  | { ok: true }
  | { ok: false; code: string; details?: Record<string, unknown> };
export type InvariantEvaluator = (context: InvariantContext) => InvariantResult;

export interface InvariantBatchContext {
  definition: WorkflowDef;
  instance: WorkflowInstance;
  transition: Transition;
  invariants: Record<string, InvariantEvaluator>;
  evaluatedAt: string;
}

export interface InvariantBatchProvider {
  owns(reference: string): boolean;
  evaluate(
    context: InvariantBatchContext,
    invariants: readonly string[],
  ): ReadonlyMap<string, InvariantResult>;
}

export interface TransitionOptions {
  invariants?: Record<string, InvariantEvaluator>;
  invariantProviders?: readonly InvariantBatchProvider[];
  evaluatedAt?: string;
}

export interface TransitionResult {
  instance: WorkflowInstance;
  transition: Transition;
}

export function findTransition(
  definition: WorkflowDef,
  from: string,
  to: string,
): Transition | undefined {
  return definition.transitions.find(
    (transition) => transition.from === from && transition.to === to,
  );
}

export function assertTransitionAllowed(
  definition: WorkflowDef,
  instance: WorkflowInstance,
  to: string,
  options: TransitionOptions = {},
): Transition {
  // Implements: FR-022-AC-1, FR-022-AC-8.
  const transition = findTransition(definition, instance.phase, to);
  if (!transition) {
    throw new TransitionNotFoundError(instance.id, instance.phase, to);
  }

  const providersByReference = new Map<string, InvariantBatchProvider>();
  const batches = new Map<InvariantBatchProvider, string[]>();
  for (const invariant of transition.invariants) {
    if (resolveEvaluator(options.invariants, invariant)) continue;
    const owners = (options.invariantProviders ?? []).filter((provider) =>
      provider.owns(invariant),
    );
    if (owners.length === 0) {
      throw new TransitionInvariantUnregisteredError(
        instance.id,
        transition.from,
        transition.to,
        invariant,
      );
    }
    if (owners.length > 1) {
      throw new WorkflowCoreError(
        "invariant_provider_conflict",
        `Invariant '${invariant}' is owned by multiple external providers.`,
        { invariant },
      );
    }
    const provider = owners[0];
    providersByReference.set(invariant, provider);
    const batch = batches.get(provider) ?? [];
    if (!batch.includes(invariant)) batch.push(invariant);
    batches.set(provider, batch);
  }

  const providerResults = new Map<
    InvariantBatchProvider,
    ReadonlyMap<string, InvariantResult>
  >();

  for (const invariant of transition.invariants) {
    const colonIdx = invariant.indexOf(":");
    const arg = colonIdx >= 0 ? invariant.slice(colonIdx + 1) : "";
    const evaluator = resolveEvaluator(options.invariants, invariant);
    let result: InvariantResult;
    if (evaluator) {
      result = evaluator({
        definition,
        instance,
        transition,
        arg,
        invariants: options.invariants ?? {},
      });
    } else {
      const provider = providersByReference.get(invariant)!;
      let results = providerResults.get(provider);
      if (!results) {
        if (options.evaluatedAt === undefined) {
          throw new WorkflowCoreError(
            "invariant_provider_evaluation_instant_missing",
            "External invariant evaluation requires an explicit evaluation instant.",
          );
        }
        results = provider.evaluate(
          {
            definition,
            instance,
            transition,
            invariants: options.invariants ?? {},
            evaluatedAt: options.evaluatedAt,
          },
          batches.get(provider)!,
        );
        providerResults.set(provider, results);
      }
      result = results.get(invariant);
      if (result === undefined) {
        throw new WorkflowCoreError(
          "invariant_provider_output_malformed",
          `External invariant provider omitted '${invariant}'.`,
          { invariant },
        );
      }
    }
    const failure = invariantFailure(result);
    if (failure) {
      throw new TransitionInvariantError(
        instance.id,
        transition.from,
        transition.to,
        invariant,
        failure.message,
        failure.code,
        failure.details,
      );
    }
  }

  return transition;
}

function resolveEvaluator(
  invariants: Record<string, InvariantEvaluator> | undefined,
  reference: string,
): InvariantEvaluator | undefined {
  const colonIdx = reference.indexOf(":");
  const evaluatorName =
    colonIdx >= 0 ? reference.slice(0, colonIdx) : reference;
  return invariants?.[reference] ?? invariants?.[evaluatorName];
}

export function advanceInstancePhase(
  definition: WorkflowDef,
  instance: WorkflowInstance,
  to: string,
  options: TransitionOptions = {},
): TransitionResult {
  const transition = assertTransitionAllowed(definition, instance, to, options);
  return {
    transition,
    instance: {
      ...instance,
      phase: to,
    },
  };
}

function invariantFailure(
  result: InvariantResult,
):
  | { code: string; message: string; details: Record<string, unknown> }
  | undefined {
  if (result === false) {
    return {
      code: "invariant_failed",
      message: "Invariant failed.",
      details: {},
    };
  }
  if (typeof result === "string") {
    return {
      code: "invariant_failed",
      message: result,
      details: { message: result },
    };
  }
  if (
    result &&
    typeof result === "object" &&
    "ok" in result &&
    result.ok === false
  ) {
    return {
      code: result.code,
      message: result.code,
      details: result.details ?? {},
    };
  }
  return undefined;
}
