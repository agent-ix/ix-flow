---
id: SR-004
title: "Code review — external invariant provider boundary"
type: SpecReview
analysis: code-review
scope: "Issue #22 implementation; FR-022; src/workflow-core external-provider and transition paths; tests/external-provider.test.ts"
review_set: subset
relationships:
  - target: "ix://agent-ix/ix-flow/FR-022"
    type: reviews
  - target: "ix://agent-ix/ix-flow/TM-001"
    type: references
---

# Code review — external invariant provider boundary

## Summary

Reviewed the issue #22 implementation against FR-022, its public authoring
documentation, and the real-process integration suite. The implementation adds
one typed batch-provider seam to transition evaluation and keeps executable
transport in a separate process adapter. It does not copy Engineering Assurance
invariant semantics into ix-flow.

## Verdict

**PASS** — all review findings were corrected and the final implementation
satisfies the specified process, protocol, compatibility, and failure boundaries.

## Findings

| ID      | Severity | Summary                                                            | Refs                                              | Escape Cause                        |
| ------- | -------- | ------------------------------------------------------------------ | ------------------------------------------------- | ----------------------------------- |
| FND-001 | medium   | Eager batch execution could reorder an earlier ordinary invariant  | `src/workflow-core/transition.ts`                 | implementation-bug-despite-evidence |
| FND-002 | medium   | Parameterized Vitest containers did not bind two matrix trace rows | `tests/external-provider.test.ts`, TC-011, TC-012 | correct-requirement-no-evidence     |
| FND-003 | low      | No-shell and one-batch assertions needed proof that they gate      | `tests/external-provider.test.ts`, TC-007, TC-013 | correct-requirement-no-evidence     |

## Dispositions

- **FND-001 resolved**: ix-flow first resolves every reference without running a
  provider, then evaluates ordinary and external results in transition order.
  The external batch starts only when evaluation reaches its first external
  reference and is reused thereafter.
- **FND-002 resolved**: TC-011 and TC-012 now bind to concrete test symbols.
  `quire coverage` reports every FR-022 acceptance criterion backed.
- **FND-003 resolved**: a `shell: true` mutant fails TC-013, and removal of the
  provider-result cache fails TC-007 with two invocations instead of one. Both
  mutants were restored before final validation.

## Review evidence

- The declaration schema is strict, requires command/argv and both protocol
  discriminators, and rejects empty or duplicate invariant populations.
- Command resolution distinguishes PATH, absolute, and skill-relative forms;
  process execution uses the skill root and passes argv with `shell: false`.
- Requests expose only `defName`, `items`, and `gateConfig`, plus the runner's
  explicit evaluation instant. Results require the declared protocol and exact
  ordered correspondence with the requested batch.
- Start failure, signal termination, non-zero exit, timeout, output overflow,
  malformed result, protocol mismatch, and unrequested outcome identity retain
  distinct stable error codes.
- Existing ESM tests remain unchanged and green. A dual ESM/external declaration
  fails before either provider is evaluated.
- A local compatibility smoke invoked the existing Engineering Assurance Rust
  binary and carried its `operator_observation_missing_or_invalid` result through
  ix-flow's existing `transition_invariant_failed` envelope.
- No workflow-specific semantic rule, hosted CI configuration, new package, or
  cross-repository runtime dependency was introduced.

## Validation evidence

- `make lint`: passed.
- `make test`: **8 / 8 files; 61 / 61 tests passed**.
- `make build`: passed with declaration generation.
- Focused external-provider suite: **13 / 13 tests passed**.
- `quire validate`: passed for FR-022, TM-001, SR-003, and this review.
- `quoin validate --strict`: no findings.

## Boundary

This review covers the ix-flow #22 host boundary. Engineering Assurance skill
cutover, release consumption, and removal of the retained JavaScript invariant
implementation remain downstream work in the Engineering Assurance lane.
