---
id: TM-001
title: ix-flow Requirements Coverage Matrix
type: TestMatrix
---

# ix-flow Requirements Coverage Matrix

Every functional and non-functional requirement maps to a verification method and to
evidence in the source, tests, or packaging. Test evidence cites files under `tests/`.

| Requirement | Verification | Evidence                                                                                                |
| ----------- | ------------ | ------------------------------------------------------------------------------------------------------- |
| FR-001      | Inspection   | `bin/ix-flow.js`, `.claude-plugin/`, `commands/`, `skills/`, `package.json` files whitelist             |
| FR-002      | Test         | `tests/commands.test.ts`, `tests/scripts.test.ts` (flags, `--version`)                                  |
| FR-003      | Test         | `tests/commands.test.ts`, `tests/gate.test.ts` (`run --path`)                                           |
| FR-004      | Test         | `tests/commands.test.ts` (status/history across processes)                                              |
| FR-005      | Test         | `tests/gate.test.ts`, `tests/commands.test.ts` (advance, invariant block)                               |
| FR-006      | Test         | `tests/gate.test.ts` (gate defer → ack → advance)                                                       |
| FR-007      | Test         | `tests/commands.test.ts` (record-answers, gate, bad JSON), `tests/engine-features.test.ts` (follow-ups) |
| FR-008      | Test         | `tests/commands.test.ts` (recipe steps)                                                                 |
| FR-009      | Test         | `tests/commands.test.ts` (add-item/update-item/link-items)                                              |
| FR-010      | Test         | `tests/engine-features.test.ts` (template renders on phase entry)                                       |
| FR-011      | Test         | `tests/gate.test.ts` (`--json` envelope fields)                                                         |
| FR-012      | Test         | `tests/commands.test.ts` (persist/read), `src/workflow-core/store.ts`                                   |
| FR-013      | Test         | `tests/commands.test.ts` (`verify` → chain intact), `src/workflow-core/event.ts`                        |
| FR-014      | Test         | `examples/*/workflows/*/def.yaml` load, `src/workflow-core/definition.ts`                               |
| FR-015      | Test         | `tests/commands.test.ts` (built-ins), `tests/engine-features.test.ts` (custom + unregistered)           |
| FR-016      | Test         | `examples/release`, `examples/intake` (`--path` load), `src/workflow-core/plugin.ts`                    |
| NFR-001     | Test         | `tests/gate.test.ts` (`--json` envelope), `src/workflow-core/canonical.ts`                              |
| NFR-002     | Inspection   | no network/service calls in local command paths                                                         |
| NFR-003     | Analysis     | `src/workflow-core/event.ts` (`verifyChain`), `tests/commands.test.ts`                                  |
| NFR-004     | Review       | command surface scoped to lifecycle + authoring; `README.md`, this spec                                 |
