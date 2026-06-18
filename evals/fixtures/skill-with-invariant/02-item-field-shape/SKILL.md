---
name: item-field-shape-example
description: Custom invariant validates that every report item carries a non-empty `summary` field before the next phase.
contributes:
  workflows: ./workflows
---

# Item field shape (skill-with-invariant)

The `report.summary_filled` invariant walks every recorded `report` item
and refuses to advance until each one has a non-empty `summary` field.
The intended recovery is to `update-item` the offenders rather than
delete them.
