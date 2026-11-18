---
id: SR-007
title: "Integrity review — TL-443 immutable provider provenance"
type: SpecReview
analysis: integrity
scope: "TL-443; spec/functional/FR-022-external-invariant-providers.md"
review_set: subset
relationships:
  - target: "ix://agent-ix/ix-flow/FR-022"
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

## Findings

| ID      | Severity | Summary                                                                                           | Refs        |
| ------- | -------- | ----------------------------------------------------------------------------------------------- | ----------- |
| FND-001 | medium   | AC-9 does not require a test to prove that only this run's recorded evaluator results are counted | FR-022-AC-9 |

## Findings Detail

### FND-001 — AC-9 omits the run-scoped result-count oracle

The behavior text requires a provider to count only evaluator results it recorded for the same run, but AC-9 only requires a test to prove that patched ordinary items cannot override the request projection. Such a test could pass while a provider still counts forged item history or mixes results from another run. Extend AC-9 to require that a provider's retained history is isolated by `run.instance_id` and that only results recorded for that run contribute to its count.
