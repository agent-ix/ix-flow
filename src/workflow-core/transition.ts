import type { Transition, WorkflowDef } from "./definition.js";
import {
  TransitionInvariantError,
  TransitionInvariantUnregisteredError,
  TransitionNotFoundError,
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

export interface TransitionOptions {
  invariants?: Record<string, InvariantEvaluator>;
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
  const transition = findTransition(definition, instance.phase, to);
  if (!transition) {
    throw new TransitionNotFoundError(instance.id, instance.phase, to);
  }

  for (const invariant of transition.invariants) {
    const colonIdx = invariant.indexOf(":");
    const evaluatorName =
      colonIdx >= 0 ? invariant.slice(0, colonIdx) : invariant;
    const arg = colonIdx >= 0 ? invariant.slice(colonIdx + 1) : "";
    const evaluator =
      options.invariants?.[invariant] ?? options.invariants?.[evaluatorName];
    if (!evaluator) {
      throw new TransitionInvariantUnregisteredError(
        instance.id,
        transition.from,
        transition.to,
        invariant,
      );
    }
    const result = evaluator({
      definition,
      instance,
      transition,
      arg,
      invariants: options.invariants ?? {},
    });
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
