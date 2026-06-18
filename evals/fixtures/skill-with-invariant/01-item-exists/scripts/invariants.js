// Custom invariants for the `greet` workflow.
//
// `loadSkill` (in @agent-ix/workflow-core) imports this module and reads
// its `invariants` named export — a record mapping invariant names (as
// referenced in def.yaml) to InvariantEvaluator functions.
//
// An evaluator returns `true`/`undefined` to pass or a structured failure:
// `{ ok: false, code, details }`. Agents route on `code`; docs and UIs can
// turn `details` into user-facing guidance.

export const invariants = {
  "greeting.exists": ({ instance }) =>
    (instance.items.greeting ?? []).length > 0 || {
      ok: false,
      code: "greeting_required",
      details: { type: "greeting" },
    },
};
