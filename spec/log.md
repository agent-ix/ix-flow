---
type: log
title: "Update Log"
description: "Chronological log of structural changes to this bundle."
---

# Update Log

## History

- **2026-06-17** — Atomicity pass from spec-review: split the multi-capability FRs into
  one-capability-per-FR. [FR-004](./functional/FR-004-inspect-runs.md) now covers `status` only, with [FR-017](./functional/FR-017-resume-a-run.md) (`resume`) and [FR-018](./functional/FR-018-query-run-history.md)
  (`history`) split out; [FR-009](./functional/FR-009-workflow-data-items.md) covers `add-item` only, with [FR-019](./functional/FR-019-update-a-workflow-item.md) (`update-item`) and
  [FR-020](./functional/FR-020-link-workflow-items.md) (`link-items`) split out; [FR-012](./functional/FR-012-local-instance-store.md) covers the local store only, with [FR-021](./functional/FR-021-optimistic-concurrency.md)
  (optimistic concurrency) split out. Tightly-coupled mechanisms ([FR-006](./functional/FR-006-human-gates.md) gate defer+ack,
  [FR-013](./functional/FR-013-event-log-and-integrity.md) event log+verify) were kept as single FRs.
- **2026-06-17** — Full ISO overhaul: added [StR-001](./stakeholder/StR-001-reusable-workflow-runner.md)..005, [US-001](./usecase/US-001-run-a-workflow.md)..009, [FR-001](./functional/FR-001-cli-and-plugin-packaging.md)..016, and
  [NFR-001](./nonfunctional/NFR-001-agent-readable-output.md)..004; rewrote the master spec to cover the vendored engine (correcting the prior
  claim that the engine was delegated to `@agent-ix/ix-cli-core`); rebuilt the coverage
  matrix and index.
- **2026-06-15** — Adopted OKF-compatible bundle structure with directory indexes.
