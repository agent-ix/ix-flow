// `report.summary_filled` — every `report` item must carry a non-empty
// string `summary` field.
//
// The pattern: enumerate items of a type, return `true` if all conform,
// otherwise return a structured code/details payload naming offenders.

export const invariants = {
  "report.summary_filled": ({ instance }) => {
    const reports = instance.items.report ?? [];
    if (reports.length === 0) {
      return {
        ok: false,
        code: "report_required",
        details: { type: "report" },
      };
    }
    const missing = [];
    for (const report of reports) {
      const isObject =
        report !== null && typeof report === "object" && !Array.isArray(report);
      const summary = isObject ? report.summary : undefined;
      if (typeof summary !== "string" || summary.trim().length === 0) {
        missing.push(isObject ? report.id : "<non-object>");
      }
    }
    if (missing.length > 0) {
      return {
        ok: false,
        code: "report_summary_missing",
        details: { item_ids: missing },
      };
    }
    return true;
  },
};
