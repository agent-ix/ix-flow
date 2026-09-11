---
id: SR-003
title: "Base specification review — external invariant providers"
type: SpecReview
analysis: base
scope: "Issue #22; FR-015; FR-016; FR-022; TM-001"
review_set: subset
relationships:
  - target: "ix://agent-ix/ix-flow/FR-022"
    type: reviews
  - target: "ix://agent-ix/ix-flow/TM-001"
    type: references
---

# Base specification review — external invariant providers

## Summary

Reviewed the issue #22 external-provider contract as a focused addition to the
existing skill and invariant requirements. The reviewed design adds one
language-independent, versioned process boundary without moving
provider-specific semantics into ix-flow or changing the existing ESM provider.

## Verdict

**PASS** — the specification is implementable, bounded, testable, and preserves
the existing responsibility split after the findings below were resolved.

## Findings

| ID      | Severity | Summary                                                               | Refs         |
| ------- | -------- | --------------------------------------------------------------------- | ------------ |
| FND-001 | medium   | Command resolution and process cwd were underspecified                | FR-022:20-23 |
| FND-002 | medium   | Per-invariant callbacks could violate batch execution                 | FR-022:33-40 |
| FND-003 | low      | `name:arg` ownership at the provider boundary was ambiguous           | FR-022:34-40 |
| FND-004 | low      | Process failures could be confused with legitimate invariant refusals | FR-022:58-66 |

## Dispositions

- **FND-001 resolved**: PATH, absolute, and skill-relative resolution plus the
  skill-root working directory are explicit.
- **FND-002 resolved**: ordinary evaluators resolve first, then one external
  batch owns all remaining provider references.
- **FND-003 resolved**: a declared base name owns its argument-bearing
  references and the full reference crosses the wire.
- **FND-004 resolved**: every provider-boundary failure family has a distinct
  stable code and cannot become an invariant result.

## Quality review

- **Need and scope**: issue #22 identifies a concrete host limitation and a
  merged Engineering Assurance Rust provider waiting on this boundary. The
  requirement adds transport only; it does not encode Engineering Assurance
  invariant semantics.
- **Provider model**: `scripts/invariants.js` and an external provider are
  mutually exclusive. Existing built-in, ESM, and caller-supplied precedence is
  retained, and unregistered invariants retain their existing refusal.
- **Wire contract**: request and result discriminators are declared by the
  skill; input projection, explicit evaluation time, ordered batching, and
  one-to-one outcomes are specified.
- **Safety**: execution has no shell, a fixed deadline, bounded output streams,
  and typed fail-closed handling for start, crash, exit, timeout, overflow,
  parsing, protocol, and outcome-identity failures.
- **Testability**: TM-001 assigns eight acceptance criteria to eight focused
  unit/integration cases, including a real child process and a literal-argument
  probe.
- **Compatibility**: the external path is additive. The ESM path and existing
  `InvariantResult` refusal semantics remain unchanged.

## Boundary

This base review covers the issue #22 contract and its direct amendments to
FR-015, FR-016, and TM-001. It does not review unrelated ix-flow behavior,
Engineering Assurance invariant semantics, or the later consumer cutover.
