---
type: log
title: "Update Log"
description: "Chronological log of structural changes to this bundle."
---

# Update Log

## History

- **2026-06-17** — Atomicity pass from spec-review: split the multi-capability FRs into
  one-capability-per-FR. FR-004 now covers `status` only, with FR-017 (`resume`) and FR-018
  (`history`) split out; FR-009 covers `add-item` only, with FR-019 (`update-item`) and
  FR-020 (`link-items`) split out; FR-012 covers the local store only, with FR-021
  (optimistic concurrency) split out. Tightly-coupled mechanisms (FR-006 gate defer+ack,
  FR-013 event log+verify) were kept as single FRs.
- **2026-06-17** — Full ISO overhaul: added StR-001..005, US-001..009, FR-001..016, and
  NFR-001..004; rewrote the master spec to cover the vendored engine (correcting the prior
  claim that the engine was delegated to `@agent-ix/ix-cli-core`); rebuilt the coverage
  matrix and index.
- **2026-06-15** — Adopted OKF-compatible bundle structure with directory indexes.
