---
id: FR-022
title: "External invariant providers"
type: FR
relationships:
  - target: "ix://agent-ix/ix-flow/US-005"
    type: "implements"
---

# FR-022: External invariant providers

## Description

A path-mode skill MAY declare one language-independent external invariant
provider in `SKILL.md` under `metadata.ix-flow-invariant-provider`. The
declaration SHALL contain a non-empty `command`, an `args` array of strings, a
non-empty `request-protocol`, a non-empty `result-protocol`, and a non-empty,
duplicate-free `invariants` array of non-empty names. ix-flow SHALL pass the
command and argument vector directly to the operating-system process API with
shell interpretation disabled. ix-flow SHALL resolve a command containing no
path separator through `PATH`, use an absolute command as declared, and resolve
a relative command containing a path separator from the skill root. ix-flow SHALL
set the provider process working directory to the skill root.

The external provider and `scripts/invariants.js` are alternative provider
forms. A skill that supplies both SHALL fail with
`skill_invariant_provider_conflict`. An undeclared `invariants.*` file other
than `invariants.js` SHALL continue to fail with `skill_script_unsupported`;
when an external provider is declared, a non-JavaScript provider file MAY be
present under `scripts/` and is invoked only through the declared command and
arguments. Existing ESM loading and evaluation SHALL remain unchanged.

For each transition evaluation, ix-flow SHALL resolve ordinary built-in, ESM,
and caller-supplied evaluators first. A declared invariant name SHALL own both
its exact transition reference and references of the form `name:arg`. ix-flow SHALL
collect the remaining transition invariant references owned by the
declared external provider, remove duplicate references while preserving
transition order, and invoke the provider exactly once for that batch. ix-flow SHALL
preserve each full `name:arg` reference in the request. ix-flow SHALL write one
JSON request to standard input with:

- `protocol`: the declared request protocol;
- `invariants`: the ordered external invariant references;
- `instance`: exactly the current `defName`, `items`, and `gateConfig` values;
- `evaluated_at`: the runner's current RFC 3339 evaluation instant.

The provider SHALL return one JSON result on standard output whose `protocol`
equals the declared result protocol and whose `outcomes` preserve the request
order. Each outcome SHALL name the corresponding invariant and be either
`{"status":"passed"}` or
`{"status":"failed","code":<non-empty string>,"details":<object>}`.
ix-flow SHALL map those outcomes to the existing `InvariantResult` semantics,
so a legitimate provider refusal continues to surface as
`transition_invariant_failed` with the provider's code and details. A transition
reference not owned by any ordinary or external provider SHALL continue to fail
with `transition_invariant_unregistered` without invoking the external
provider.

ix-flow SHALL bound provider execution to 5 seconds and standard output and
standard error to 1 MiB each. It SHALL fail closed with distinct stable codes
for process-start failure (`invariant_provider_spawn_failed`), signal
termination (`invariant_provider_crashed`), non-zero exit
(`invariant_provider_exit_nonzero`), timeout (`invariant_provider_timeout`),
output overflow (`invariant_provider_output_oversized`), malformed or
incomplete result (`invariant_provider_output_malformed`), result-protocol
mismatch (`invariant_provider_protocol_mismatch`), and an outcome naming an
unrequested invariant (`invariant_provider_unknown_invariant`). ix-flow SHALL
NOT convert any provider-boundary failure into a passing or ordinary
invariant-refusal result.

## Acceptance Criteria

| ID          | Criteria                                                                                                                                                               | Verification                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| FR-022-AC-1 | A valid declaration invokes a real external process once for the selected transition's ordered external-invariant batch and maps pass/fail outcomes                    | Test (tests/external-provider.test.ts) |
| FR-022-AC-2 | The request carries the declared protocol, closed instance projection, and runner evaluation instant; the result protocol and one-to-one ordered outcomes are required | Test (tests/external-provider.test.ts) |
| FR-022-AC-3 | Existing ESM behavior is unchanged, while declaring ESM and an external provider together fails with `skill_invariant_provider_conflict`                               | Test (tests/external-provider.test.ts) |
| FR-022-AC-4 | Invalid declarations and undeclared non-JavaScript `invariants.*` files fail closed with typed format or unsupported-script errors                                     | Test (tests/external-provider.test.ts) |
| FR-022-AC-5 | Spawn failure, signal crash, non-zero exit, timeout, and output overflow produce their distinct stable provider-boundary codes                                         | Test (tests/external-provider.test.ts) |
| FR-022-AC-6 | Malformed/incomplete output, result-protocol mismatch, and unrequested outcome names produce their distinct stable provider-boundary codes                             | Test (tests/external-provider.test.ts) |
| FR-022-AC-7 | The provider command receives literal arguments without shell interpretation                                                                                           | Test (tests/external-provider.test.ts) |
| FR-022-AC-8 | An unregistered transition invariant retains `transition_invariant_unregistered` and does not launch the external provider                                             | Test (tests/external-provider.test.ts) |

## Dependencies

- **Upstream**: [FR-015](./FR-015-invariants.md) invariant evaluation, [FR-016](./FR-016-skill-on-disk-format.md) skill declarations
- **Downstream**: Engineering Assurance workflow-invariant provider cutover (agent-ix/engineering-assurance#35)
