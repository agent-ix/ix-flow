/** Host integration surface. Agent-facing callers use the CLI entry point. */
export { WorkflowCommandRunner } from "./workflow-runner/runner.js";
export type {
  AddItemInput,
  CreateWorkflowInput,
  WorkflowRunnerOptions,
} from "./workflow-runner/runner.js";
export type { Actor } from "./workflow-core/event.js";
export type { WorkflowInstance } from "./workflow-core/instance.js";
export type { WorkflowResultEnvelope } from "./workflow-runner/result.js";
