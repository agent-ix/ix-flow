import type { JsonValue } from "./canonical.js";
import {
  evaluateCompleteness,
  collectFollowUps,
} from "./interview-validator.js";
import type { InvariantEvaluator } from "./transition.js";

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export const noOpenQuestions: InvariantEvaluator = ({ instance }) =>
  instance.openQuestions.length === 0 || {
    ok: false,
    code: "open_questions_remain",
    details: { count: instance.openQuestions.length },
  };

// Iterative DFS so deep / pathological graphs cannot blow the JS call
// stack. Tracks both `inProgress` (nodes on the current DFS path; revisit
// = cycle) and `done` (fully explored). The stack holds frames of
// `{ node, childIndex }` instead of relying on the JS call stack.
export const acyclic: InvariantEvaluator = ({ instance }) => {
  const adjacency = new Map<string, string[]>();
  for (const link of instance.links) {
    if (!isObject(link)) continue;
    const from = link.from ?? link.source;
    const to = link.to ?? link.target;
    if (typeof from !== "string" || typeof to !== "string") continue;
    const list = adjacency.get(from) ?? [];
    list.push(to);
    adjacency.set(from, list);
  }

  const done = new Set<string>();
  const inProgress = new Set<string>();

  for (const root of adjacency.keys()) {
    if (done.has(root)) continue;
    const frames: { node: string; childIndex: number }[] = [
      { node: root, childIndex: 0 },
    ];
    inProgress.add(root);

    while (frames.length > 0) {
      const frame = frames[frames.length - 1];
      const children = adjacency.get(frame.node) ?? [];

      if (frame.childIndex >= children.length) {
        inProgress.delete(frame.node);
        done.add(frame.node);
        frames.pop();
        continue;
      }

      const next = children[frame.childIndex];
      frame.childIndex += 1;

      if (inProgress.has(next)) {
        return {
          ok: false,
          code: "dependency_cycle",
          details: { from: frame.node, to: next },
        };
      }
      if (done.has(next)) continue;
      inProgress.add(next);
      frames.push({ node: next, childIndex: 0 });
    }
  }

  return true;
};

function extractAnswers(
  item: Record<string, JsonValue>,
): Record<string, JsonValue> {
  const out: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(item)) {
    if (key === "id" || key === "interviewId" || key === "answeredAt") continue;
    out[key] = value;
  }
  return out;
}

export const interviewComplete: InvariantEvaluator = ({
  definition,
  instance,
  arg,
  invariants,
}) => {
  if (!arg) {
    return {
      ok: false,
      code: "invariant_interview_unknown",
      details: {
        reason: "argument required: interview.complete:<interviewId>",
      },
    };
  }
  const interview = definition.interviews?.[arg];
  if (!interview) {
    return {
      ok: false,
      code: "invariant_interview_unknown",
      details: { interviewId: arg },
    };
  }
  const itemList = instance.items[interview.itemType] ?? [];
  let answerItem: Record<string, JsonValue> | undefined;
  for (const value of itemList) {
    if (isObject(value) && value.interviewId === arg) {
      answerItem = value as Record<string, JsonValue>;
      break;
    }
  }
  if (!answerItem) {
    return {
      ok: false,
      code: "invariant_interview_no_answers",
      details: { interviewId: arg, itemType: interview.itemType },
    };
  }

  const answers = extractAnswers(answerItem);

  if (interview.completenessRule.startsWith("custom_invariant:")) {
    const customName = interview.completenessRule.slice(
      "custom_invariant:".length,
    );
    const customEvaluator = invariants[customName];
    if (!customEvaluator) {
      return {
        ok: false,
        code: "invariant_custom_unknown",
        details: { interviewId: arg, customInvariant: customName },
      };
    }
    return customEvaluator({
      definition,
      instance,
      transition: { from: "", to: "", invariants: [], defaultGate: "auto" },
      arg,
      invariants,
    });
  }

  const outcome = evaluateCompleteness(interview, answers);
  if (!outcome.ok) {
    return {
      ok: false,
      code: "invariant_interview_incomplete",
      details: {
        interviewId: arg,
        rule: outcome.rule,
        missing: outcome.missing,
        observed: outcome.observedCount,
        required: outcome.requiredCount,
      },
    };
  }
  return true;
};

/**
 * Collect followUp advisories for any interview referenced by a
 * transition that gates on `interview.complete`, looking at transitions
 * from the instance's current phase. Returns an empty array when none
 * apply. The runner surfaces this on the transition response per
 * FR-024-AC-8.
 */
export function collectInterviewFollowUps(
  definition: {
    interviews?: Record<string, { questions: unknown[]; itemType: string }>;
    transitions: ReadonlyArray<{
      from: string;
      to: string;
      invariants: string[];
    }>;
  },
  instance: { phase: string; items: Record<string, JsonValue[]> },
): Array<{ interviewId: string; questionKey: string; prompt: string }> {
  const interviews = definition.interviews;
  if (!interviews) return [];
  const followups: Array<{
    interviewId: string;
    questionKey: string;
    prompt: string;
  }> = [];
  const seen = new Set<string>();
  for (const transition of definition.transitions) {
    if (transition.from !== instance.phase) continue;
    for (const inv of transition.invariants) {
      const colon = inv.indexOf(":");
      if (colon < 0) continue;
      if (inv.slice(0, colon) !== "interview.complete") continue;
      const interviewId = inv.slice(colon + 1);
      if (seen.has(interviewId)) continue;
      seen.add(interviewId);
      const interview = interviews[interviewId];
      if (!interview) continue;
      const itemList = instance.items[interview.itemType] ?? [];
      let answerItem: Record<string, JsonValue> | undefined;
      for (const value of itemList) {
        if (isObject(value) && value.interviewId === interviewId) {
          answerItem = value as Record<string, JsonValue>;
          break;
        }
      }
      if (!answerItem) continue;
      const answers = extractAnswers(answerItem);
      const items = collectFollowUps(
        interviewId,
        interview as unknown as import("./definition.js").Interview,
        answers,
      );
      followups.push(...items);
    }
  }
  return followups;
}

export const coreInvariants: Record<string, InvariantEvaluator> = {
  acyclic,
  no_open_questions: noOpenQuestions,
  "interview.complete": interviewComplete,
};
