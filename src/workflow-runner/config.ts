import { z } from "zod";

export const WORKFLOW_PLUGIN_ID = "workflow";

/**
 * Package name used by host CLIs when registering this plugin's
 * `ixSchema` via `@agent-ix/ix-cli-core`.
 *
 * Plugin install/load identity is the npm package name (FR-025 revised).
 * The short `WORKFLOW_PLUGIN_ID` is the config/secrets namespace exposed
 * through `ixSchema.id`.
 */
export const WORKFLOW_PACKAGE_NAME = "@agent-ix/ix-flow";

export const WorkflowPluginConfigSchema = z
  .object({
    stateDir: z.string().min(1).default(".workflow"),
    defaultDefinition: z.string().min(1).default("workflow"),
    output: z.enum(["human", "json"]).default("human"),
  })
  .strict();

export type WorkflowPluginConfig = z.infer<typeof WorkflowPluginConfigSchema>;

export const WorkflowPluginEnvBindings: Record<string, string> = {
  stateDir: "IX_WORKFLOW_STATE_DIR",
  defaultDefinition: "IX_WORKFLOW_DEFAULT_DEFINITION",
  output: "IX_WORKFLOW_OUTPUT",
};

export const WorkflowPluginSecretsSchema: [] = [];

/**
 * Named-export convention for the host's `init` hook to walk.
 * See FR-025 (revised) and `@agent-ix/ix-cli-core` → `IxPluginSchema`.
 */
export const ixSchema = {
  id: WORKFLOW_PLUGIN_ID,
  config: WorkflowPluginConfigSchema,
  secrets: WorkflowPluginSecretsSchema,
  env: WorkflowPluginEnvBindings,
};
