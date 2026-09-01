---
id: SR-001
title: "Code review — standard skill workflow metadata"
type: SpecReview
analysis: code-review
scope: "PR #16; FR-016; src/workflow-core/plugin.ts; tests/plugin.test.ts; public examples and authoring guidance"
review_set: subset
relationships:
  - target: "ix://agent-ix/ix-flow/FR-016"
    type: reviews
  - target: "ix://agent-ix/ix-flow/TM-001"
    type: references
---

# Code review — standard skill workflow metadata

## Summary

Reviewed PR #16's standard metadata discovery, legacy compatibility, malformed/conflicting
declaration handling, and filesystem confinement against FR-016 and its executable tests.
No unresolved correctness, security, compatibility, test-quality, or scope finding remains.

## Verdict

**PASS** — implementation, specification, documentation, and tests agree on the supported
metadata forms and fail-closed path boundary.

## Findings

| ID      | Severity | Summary       | Refs |
| ------- | -------- | ------------- | ---- |
| FND-001 | low      | No gaps found | -    |

## Review evidence

- `metadata.ix-flow-workflows` is preferred while legacy `contributes.workflows` remains
  supported; matching dual declarations pass and conflicting declarations fail closed.
- Null, empty, non-string, missing, POSIX-absolute, Windows drive-absolute, UNC, and parent
  traversal inputs produce the specified `skill_format_invalid` boundary.
- The declared workflow directory, child workflow directories, and `def.yaml` files are
  canonicalized and checked against their owning roots before content is read.
- Tests exercise real temporary filesystem boundaries without mocking project logic and
  assert exact workflow names, error codes, and diagnostics.
- No changed source stub, test stub, skip, warning suppression, weakened threshold, hidden
  coverage pragma, placeholder return, or unowned public behavior was found.
- The TypeScript/Vitest repository conventions were applied in place of the Python-only
  class/docstring and `pytest` portions of the generic review checklist.

## Validation evidence

- Independent review: PASS with no PR-scoped correctness, security, compatibility, or
  test-quality finding.
- `make lint`: passed.
- `make test`: **7 / 7 files; 48 / 48 tests passed**.
- Focused plugin suite: **28 / 28 tests passed**.
- `make build` and `git diff --check`: passed.

## Boundary

The review covers PR #16 and FR-016. Repository-wide legacy specification modernization
outside the changed skill-loading contract is not reclassified by this review.
