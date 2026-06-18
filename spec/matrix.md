---
id: TM-001
title: ix-flow Requirements Coverage Matrix
type: TestMatrix
---

# ix-flow Requirements Coverage Matrix

Every functional and non-functional requirement maps to a verification method and to
evidence in the source, tests, or packaging. Test evidence cites files under `tests/`.

| Requirement                                                 | Verification | Evidence                                                                                                |
| ----------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------- |
| [FR-001](./functional/FR-001-cli-and-plugin-packaging.md)   | Inspection   | `bin/ix-flow.js`, `.claude-plugin/`, `commands/`, `skills/`, `package.json` files whitelist             |
| [FR-002](./functional/FR-002-runtime-context-and-flags.md)  | Test         | `tests/commands.test.ts`, `tests/scripts.test.ts` (flags, `--version`)                                  |
| [FR-003](./functional/FR-003-create-and-resolve-runs.md)    | Test         | `tests/commands.test.ts`, `tests/gate.test.ts` (`run --path`)                                           |
| [FR-004](./functional/FR-004-inspect-runs.md)               | Test         | `tests/commands.test.ts` (status reports phase)                                                         |
| [FR-005](./functional/FR-005-advance-phases.md)             | Test         | `tests/gate.test.ts`, `tests/commands.test.ts` (advance, invariant block)                               |
| [FR-006](./functional/FR-006-human-gates.md)                | Test         | `tests/gate.test.ts` (gate defer → ack → advance)                                                       |
| [FR-007](./functional/FR-007-record-interview-answers.md)   | Test         | `tests/commands.test.ts` (record-answers, gate, bad JSON), `tests/engine-features.test.ts` (follow-ups) |
| [FR-008](./functional/FR-008-run-command-recipes.md)        | Test         | `tests/commands.test.ts` (recipe steps)                                                                 |
| [FR-009](./functional/FR-009-workflow-data-items.md)        | Test         | `tests/commands.test.ts` (add-item persists)                                                            |
| [FR-010](./functional/FR-010-artifact-templates.md)         | Test         | `tests/engine-features.test.ts` (template renders on phase entry)                                       |
| [FR-011](./functional/FR-011-result-envelope.md)            | Test         | `tests/gate.test.ts` (`--json` envelope fields)                                                         |
| [FR-012](./functional/FR-012-local-instance-store.md)       | Test         | `tests/commands.test.ts` (persist/read), `src/workflow-core/store.ts`                                   |
| [FR-013](./functional/FR-013-event-log-and-integrity.md)    | Test         | `tests/commands.test.ts` (`verify` → chain intact), `src/workflow-core/event.ts`                        |
| [FR-014](./functional/FR-014-workflow-definition-format.md) | Test         | `examples/*/workflows/*/def.yaml` load, `src/workflow-core/definition.ts`                               |
| [FR-015](./functional/FR-015-invariants.md)                 | Test         | `tests/commands.test.ts` (built-ins), `tests/engine-features.test.ts` (custom + unregistered)           |
| [FR-016](./functional/FR-016-skill-on-disk-format.md)       | Test         | `examples/release`, `examples/intake` (`--path` load), `src/workflow-core/plugin.ts`                    |
| [FR-017](./functional/FR-017-resume-a-run.md)               | Test         | `tests/commands.test.ts` (resume re-emits status)                                                       |
| [FR-018](./functional/FR-018-query-run-history.md)          | Test         | `tests/commands.test.ts` (history returns events)                                                       |
| [FR-019](./functional/FR-019-update-a-workflow-item.md)     | Test         | `tests/commands.test.ts` (update-item patches by id)                                                    |
| [FR-020](./functional/FR-020-link-workflow-items.md)        | Test         | `tests/commands.test.ts` (link-items records a link)                                                    |
| [FR-021](./functional/FR-021-optimistic-concurrency.md)     | Analysis     | `src/workflow-core/store.ts` (`stateVersion`), `src/workflow-core/errors.ts`                            |
| [NFR-001](./nonfunctional/NFR-001-agent-readable-output.md) | Test         | `tests/gate.test.ts` (`--json` envelope), `src/workflow-core/canonical.ts`                              |
| [NFR-002](./nonfunctional/NFR-002-local-first.md)           | Inspection   | no network/service calls in local command paths                                                         |
| [NFR-003](./nonfunctional/NFR-003-tamper-evident-state.md)  | Analysis     | `src/workflow-core/event.ts` (`verifyChain`), `tests/commands.test.ts`                                  |
| [NFR-004](./nonfunctional/NFR-004-runner-positioning.md)    | Review       | command surface scoped to lifecycle + authoring; `README.md`, this spec                                 |
