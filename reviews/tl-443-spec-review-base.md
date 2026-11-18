---
id: SR-005
title: "Base specification review — TL-443 immutable provider provenance"
type: SpecReview
analysis: base
scope: "TL-443; spec/functional/FR-022-external-invariant-providers.md"
review_set: subset
relationships:
  - target: "ix://agent-ix/ix-flow/FR-022"
    type: reviews
---

## Summary

Reviewed FR-022 against the base requirement checklist and TL-443. The request projection is concrete and bounded; the full repository has one unrelated structural validation error in unchanged `spec/log.md`, while the changed FR validates cleanly.

## Verdict

**PASS WITH FINDINGS** — the spec is close to implementable, but the provider-history authority and reset path need a stronger contract before implementation.

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

New ACs are not yet in the computed Test Matrix because this spec PR precedes the implementation PR; that is expected at this stage and must be checked after implementation.

## Findings

| ID      | Severity | Summary                                                                                                    | Refs          |
| ------- | -------- | ---------------------------------------------------------------------------------------------------------- | ------------- |
| FND-001 | high     | Mutable provider context can still redirect the retained history store and reset the per-run denial count | FR-022:61-67  |

## Validation

- `quoin write . --types SpecReview`: exit 0; fetched the installed SpecReview schema and skeleton.
- `quire validate --scope . spec/functional/FR-022-external-invariant-providers.md --summary`: exit 0; 1/1 document grammar-clean.
- `quire validate --scope . 'spec/**/*.md' --summary`: exit 3 due the unchanged `spec/log.md` document's unregistered `log` type; remaining warnings are outside this PR.
- `quire matrix --scope . --format tsv`: FR-022-AC-9 is untagged and AC-10 is method-without-symbol until the follow-up code PR adds the test and caller documentation.

## Findings Detail

### FND-001 — Mutable provider context can still redirect the retained history store

Quoin currently builds the design-gate history path from `quoin_context.config_root` and the run ID. An agent can patch that ordinary item to a new config root, so the next provider invocation opens an empty state file even though `run.instance_id` is unchanged. The contract must protect the state-store location as well as the run key: require the relevant context to be host-owned outside mutable items, or require a declared protected item type whose updates are rejected. AC-9 should verify that changing the mutable config root cannot reset the recorded evaluator history.
