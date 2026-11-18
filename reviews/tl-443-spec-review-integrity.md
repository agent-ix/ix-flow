---
id: SR-007
title: "Integrity review — TL-443 immutable provider provenance"
type: SpecReview
analysis: integrity
scope: "TL-443; spec/functional/FR-022-external-invariant-providers.md; spec/functional/FR-019-update-a-workflow-item.md; spec/functional/FR-009-workflow-data-items.md; spec/functional/FR-014-workflow-definition-format.md"
review_set: subset
relationships:
  - target: "ix://agent-ix/ix-flow/FR-022"
    type: reviews
  - target: "ix://agent-ix/ix-flow/FR-019"
    type: reviews
  - target: "ix://agent-ix/ix-flow/FR-009"
    type: reviews
  - target: "ix://agent-ix/ix-flow/FR-014"
    type: reviews
---

## Summary

Reviewed FR-022 for completeness, consistency, atomicity, and testability. The new run fields are individually defined, but the new test criterion does not require a test to prove the provider counts only evaluator results retained for that run.

## Verdict

**PASS WITH FINDINGS** — extend the new test criterion to cover the run-scoped retained-result count explicitly.

## Scope

- **Examined — FR-022:** “A provider that retains evaluator history SHALL key that history by `run.instance_id`. The provider SHALL count only evaluator results it recorded for that same run; proposer-mutable `instance.items` SHALL NOT be treated as run identity or prior evaluator results.”
- **Context only — FR-022-AC-1:** “A valid declaration invokes a real external process once for the selected transition's ordered external-invariant batch and maps pass/fail outcomes.”
- **Context only — FR-022-AC-2:** “The request carries the declared protocol, closed instance projection, and runner evaluation instant; the result protocol and one-to-one ordered outcomes are required.”
- **Context only — FR-022-AC-3:** “Existing ESM behavior is unchanged, while declaring ESM and an external provider together fails with `skill_invariant_provider_conflict`.”
- **Context only — FR-022-AC-4:** “Invalid declarations and undeclared non-JavaScript `invariants.*` files fail closed with typed format or unsupported-script errors.”
- **Context only — FR-022-AC-5:** “Spawn failure, signal crash, non-zero exit, timeout, and output overflow produce their distinct stable provider-boundary codes.”
- **Context only — FR-022-AC-6:** “Malformed/incomplete output, result-protocol mismatch, and unrequested outcome names produce their distinct stable provider-boundary codes.”
- **Context only — FR-022-AC-7:** “The provider command receives literal arguments, including through Windows npm launchers.”
- **Context only — FR-022-AC-8:** “An unregistered transition invariant retains `transition_invariant_unregistered` and does not launch the external provider.”
- **Examined — FR-022-AC-9:** “Each external provider request contains engine-derived run fields outside `instance.items`; patching ordinary items with forged run fields or evaluator history cannot override the run projection.”
- **Examined — FR-022-AC-10:** “The caller documentation describes the provider request fields and states that proposer-mutable items do not establish run provenance or evaluator history.”
- **Examined — FR-019 Outputs:** “The patched item on the run, or an `item_not_found` error.”
- **Examined — FR-019-AC-3:** “For a type declared in `systemOwnedItemTypes`, the first `add-item` succeeds only while the type is empty; later adds fail with `item_system_owned`.”
- **Examined — FR-019-AC-4:** “`update-item` to a seeded type declared in `systemOwnedItemTypes` fails with `item_system_owned` and leaves the seeded item unchanged.”
- **Examined — FR-009 Outputs:** “A persisted item on the run, or an `item_already_exists` error.”
- **Examined — FR-009-AC-2:** “Adding a duplicate id fails with `item_already_exists`.”
- **Examined — FR-014:** “A workflow definition (`def.yaml`) SHALL conform to the `WorkflowDef` shape with the fields `name`, `version`, optional `description`, `initialPhase`, `phases` (`name`, optional `terminal`, optional `hint`), `transitions` (`from`, `to`, `invariants`, `defaultGate` ∈ {`auto`, `hitl`, `full-auto`}), `itemSchemas`, `linkSchemas`, optional `interviews`, optional `artifactTemplates`, and optional `recipes`.”

## Findings

| ID      | Severity | Summary                                                                                           | Refs        |
| ------- | -------- | ----------------------------------------------------------------------------------------------- | ----------- |
| FND-001 | medium   | AC-9 does not require a test to prove that only this run's recorded evaluator results are counted | FR-022-AC-9 |

### FND-001 after_excerpt

```text
A provider counts only evaluator results recorded with the current `run.instance_id`; forged ordinary-item history and evaluator results recorded for a different run do not advance the current run's retry count
```

## Findings Detail

### FND-001 — AC-9 omits the run-scoped result-count oracle

The behavior text requires a provider to count only evaluator results it recorded for the same run, but AC-9 only requires a test to prove that patched ordinary items cannot override the request projection. Such a test could pass while a provider still counts forged item history or mixes results from another run. Extend AC-9 to require that a provider's retained history is isolated by `run.instance_id` and that only results recorded for that run contribute to its count.

## Dispositions

| FND     | Outcome | Reason |
| ------- | ------- | ------ |
| FND-001 | fixed   | FR-022-AC-12 now requires a same-run result-count test covering forged item history and another run's evaluator results. |

### Round 1 evidence

The fixed criterion states:

> A provider counts only evaluator results recorded with the current `run.instance_id`; forged ordinary-item history and evaluator results recorded for a different run do not advance the current run's retry count.

## New findings (disposition pass 1)

| ID      | Severity | Summary                                                                                                                | Refs                                                   |
| ------- | -------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| FND-002 | high     | FR-014's WorkflowDef field list omits `systemOwnedItemTypes`, so the new protected item type cannot be declared       | FR-014:14-18; FR-019; FR-022                            |
| FND-003 | medium   | `item_system_owned` is missing from the Outputs contract, and the add-item owner FR-009 remains unchanged             | FR-019:30-32; FR-019-AC-3; FR-019-AC-4; FR-009:25-27 |

### FND-002 — WorkflowDef cannot declare system-owned item types

FR-019 and FR-022 rely on workflow definitions declaring `systemOwnedItemTypes`, but FR-014 enumerates the complete `WorkflowDef` fields without that property and says the parser validates this shape. Under the current normative contract, a definition declaring the required protection is invalid. Add the property and its shape/validation behavior to FR-014, with an acceptance criterion.

### FND-003 — System-owned write errors are absent from the operation contracts

FR-019 now requires `update-item` and later `add-item` to fail with `item_system_owned`, but its Outputs section still lists only the patched item or `item_not_found`. In addition, `add-item` is owned by FR-009, whose Outputs section still lists only a persisted item or `item_already_exists`. Add the new rejection outcome to the owner requirements, including FR-009's `add-item` contract, so callers and tests have one complete error contract.
