---
id: SR-006
title: "EARS review — TL-443 immutable provider provenance"
type: SpecReview
analysis: ears-conformance
scope: "TL-443; spec/functional/FR-022-external-invariant-providers.md"
review_set: subset
relationships:
  - target: "ix://agent-ix/ix-flow/FR-022"
    type: reviews
---

## Summary

Reviewed the new FR-022 provider-run statements for EARS grammar and semantic fit. The targeted validation reports zero grammar findings for FR-022; the new clauses name ix-flow or the provider and state verifiable responses.

## Verdict

**PASS** — no new EARS defects found in the changed requirement text.

## Scope

- **Examined — FR-022:** “ix-flow SHALL derive the `run` values from the current engine instance and selected transition, not from workflow items or provider output. The runner SHALL set `instance_id` to the stable engine instance ID; `state_version` to the current persisted engine version; `state` to the current phase before the transition; and `transition_key` to the canonical `<from>-><to>` key used by the runner.”
- **Examined — FR-022:** “A provider that retains evaluator history SHALL key that history by `run.instance_id`. The provider SHALL count only evaluator results it recorded for that same run; proposer-mutable `instance.items` SHALL NOT be treated as run identity or prior evaluator results.”

## Findings

| ID      | Severity | Summary                   | Refs |
| ------- | -------- | ------------------------- | ---- |
| FND-001 | low      | No findings (placeholder) | -    |

## Validation

`quire validate --scope . spec/functional/FR-022-external-invariant-providers.md --summary` exited 0 and reported 1/1 document grammar-clean with 0 grammar findings.
