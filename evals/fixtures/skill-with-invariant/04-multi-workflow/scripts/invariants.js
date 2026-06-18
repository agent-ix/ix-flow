// Invariants for BOTH workflows shipped by this skill.
// `loadSkill` reads a single `scripts/invariants.js`; the names below
// are looked up by any workflow under `workflows/` that references
// them. Namespace the names per-workflow (`report.…`, `publish.…`) to
// avoid collisions.

export const invariants = {
  "report.has_findings": ({ instance }) =>
    (instance.items.finding ?? []).length > 0 || {
      ok: false,
      code: "finding_required",
      details: { type: "finding" },
    },

  "publish.has_target": ({ instance }) =>
    (instance.items.target ?? []).length > 0 || {
      ok: false,
      code: "target_required",
      details: { type: "target" },
    },
};
