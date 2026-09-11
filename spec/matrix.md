---
id: TM-001
title: ix-flow Requirements Coverage Matrix
type: TestMatrix
---

# ix-flow Requirements Coverage Matrix

Every functional and non-functional requirement maps to a verification method and to
evidence in the source, tests, or packaging. Test evidence cites files under `tests/`.

| Requirement                                                   | Verification | Evidence                                                                                                |
| ------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------- |
| [FR-001](./functional/FR-001-cli-and-plugin-packaging.md)     | Inspection   | `bin/ix-flow.js`, `.claude-plugin/`, `commands/`, `skills/`, `package.json` files whitelist             |
| [FR-002](./functional/FR-002-runtime-context-and-flags.md)    | Test         | `tests/commands.test.ts`, `tests/scripts.test.ts` (flags, `--version`)                                  |
| [FR-003](./functional/FR-003-create-and-resolve-runs.md)      | Test         | `tests/commands.test.ts`, `tests/gate.test.ts` (`run --path`)                                           |
| [FR-004](./functional/FR-004-inspect-runs.md)                 | Test         | `tests/commands.test.ts` (status reports phase)                                                         |
| [FR-005](./functional/FR-005-advance-phases.md)               | Test         | `tests/gate.test.ts`, `tests/commands.test.ts` (advance, invariant block)                               |
| [FR-006](./functional/FR-006-human-gates.md)                  | Test         | `tests/gate.test.ts` (gate defer → ack → advance)                                                       |
| [FR-007](./functional/FR-007-record-interview-answers.md)     | Test         | `tests/commands.test.ts` (record-answers, gate, bad JSON), `tests/engine-features.test.ts` (follow-ups) |
| [FR-008](./functional/FR-008-run-command-recipes.md)          | Test         | `tests/commands.test.ts` (recipe steps)                                                                 |
| [FR-009](./functional/FR-009-workflow-data-items.md)          | Test         | `tests/commands.test.ts` (add-item persists)                                                            |
| [FR-010](./functional/FR-010-artifact-templates.md)           | Test         | `tests/engine-features.test.ts` (template renders on phase entry)                                       |
| [FR-011](./functional/FR-011-result-envelope.md)              | Test         | `tests/gate.test.ts` (`--json` envelope fields)                                                         |
| [FR-012](./functional/FR-012-local-instance-store.md)         | Test         | `tests/commands.test.ts` (persist/read), `src/workflow-core/store.ts`                                   |
| [FR-013](./functional/FR-013-event-log-and-integrity.md)      | Test         | `tests/commands.test.ts` (`verify` → chain intact), `src/workflow-core/event.ts`                        |
| [FR-014](./functional/FR-014-workflow-definition-format.md)   | Test         | `examples/*/workflows/*/def.yaml` load, `src/workflow-core/definition.ts`                               |
| [FR-015](./functional/FR-015-invariants.md)                   | Test         | `tests/commands.test.ts` (built-ins), `tests/engine-features.test.ts` (custom + unregistered)           |
| [FR-016](./functional/FR-016-skill-on-disk-format.md)         | Test         | `tests/plugin.test.ts` (metadata validation and confinement), examples (`--path` load)                  |
| [FR-017](./functional/FR-017-resume-a-run.md)                 | Test         | `tests/commands.test.ts` (resume re-emits status)                                                       |
| [FR-018](./functional/FR-018-query-run-history.md)            | Test         | `tests/commands.test.ts` (history returns events)                                                       |
| [FR-019](./functional/FR-019-update-a-workflow-item.md)       | Test         | `tests/commands.test.ts` (update-item patches by id)                                                    |
| [FR-020](./functional/FR-020-link-workflow-items.md)          | Test         | `tests/commands.test.ts` (link-items records a link)                                                    |
| [FR-021](./functional/FR-021-optimistic-concurrency.md)       | Analysis     | `src/workflow-core/store.ts` (`stateVersion`), `src/workflow-core/errors.ts`                            |
| [FR-022](./functional/FR-022-external-invariant-providers.md) | Test         | `tests/external-provider.test.ts` (declaration, batching, process boundary, failure taxonomy)           |
| [NFR-001](./nonfunctional/NFR-001-agent-readable-output.md)   | Test         | `tests/gate.test.ts` (`--json` envelope), `src/workflow-core/canonical.ts`                              |
| [NFR-002](./nonfunctional/NFR-002-local-first.md)             | Inspection   | no network/service calls in local command paths                                                         |
| [NFR-003](./nonfunctional/NFR-003-tamper-evident-state.md)    | Analysis     | `src/workflow-core/event.ts` (`verifyChain`), `tests/commands.test.ts`                                  |
| [NFR-004](./nonfunctional/NFR-004-runner-positioning.md)      | Review       | command surface scoped to lifecycle + authoring; `README.md`, this spec                                 |

## Functional Requirement Coverage

| Functional Req | Acceptance Criteria                                                                                    | Test Cases                                                     | Coverage Status |
| -------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | --------------- |
| FR-016         | FR-016-AC-1, FR-016-AC-2, FR-016-AC-3, FR-016-AC-4, FR-016-AC-5, FR-016-AC-6                           | TC-001, TC-002, TC-003, TC-004, TC-005, TC-006                 | ✅ Covered      |
| FR-022         | FR-022-AC-1, FR-022-AC-2, FR-022-AC-3, FR-022-AC-4, FR-022-AC-5, FR-022-AC-6, FR-022-AC-7, FR-022-AC-8 | TC-007, TC-008, TC-009, TC-010, TC-011, TC-012, TC-013, TC-014 | ✅ Covered      |

## Test Case Summary

| Test ID | Title                                                                         | Type        | Priority | Traces To   | Status |
| ------- | ----------------------------------------------------------------------------- | ----------- | -------- | ----------- | ------ |
| TC-001  | Load every definition from the declared workflow directory                    | Unit        | P0       | FR-016-AC-1 | ✅     |
| TC-002  | Accept standard and legacy workflow metadata                                  | Unit        | P0       | FR-016-AC-2 | ✅     |
| TC-003  | Accept matching dual declarations and reject conflicts                        | Unit        | P0       | FR-016-AC-3 | ✅     |
| TC-004  | Diagnose missing workflow metadata with both supported forms                  | Unit        | P1       | FR-016-AC-4 | ✅     |
| TC-005  | Reject every explicitly empty, null, or non-string declaration                | Unit        | P0       | FR-016-AC-5 | ✅     |
| TC-006  | Reject absolute, traversing, and symlink-escaping workflow paths              | Unit        | P0       | FR-016-AC-6 | ✅     |
| TC-007  | Invoke one real external process for one ordered invariant batch              | Integration | P0       | FR-022-AC-1 | ✅     |
| TC-008  | Enforce the request projection, evaluation instant, and result correspondence | Integration | P0       | FR-022-AC-2 | ✅     |
| TC-009  | Preserve ESM behavior and refuse dual providers                               | Integration | P0       | FR-022-AC-3 | ✅     |
| TC-010  | Reject malformed declarations and undeclared provider scripts                 | Unit        | P0       | FR-022-AC-4 | ✅     |
| TC-011  | Distinguish process start, crash, exit, timeout, and overflow                 | Integration | P0       | FR-022-AC-5 | ✅     |
| TC-012  | Distinguish malformed, mismatched, and unknown result data                    | Integration | P0       | FR-022-AC-6 | ✅     |
| TC-013  | Pass command arguments literally without a shell                              | Integration | P0       | FR-022-AC-7 | ✅     |
| TC-014  | Reject an unregistered invariant without launching the provider               | Integration | P0       | FR-022-AC-8 | ✅     |
