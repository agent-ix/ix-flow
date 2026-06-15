/**
 * Process-scope registry of workflow contributions discovered via the
 * `ix` plugin framework. Populated by the host (typically
 * `apps/ix/src/hooks/init.ts`) at startup; read by `host-helpers` when a
 * workflow command is invoked. Tests bypass this registry by passing
 * `plugins` directly to `new WorkflowCommandRunner({ plugins })`.
 */

import {
  WorkflowCoreError,
  type Workflow,
  type WorkflowPlugin,
} from "../workflow-core/index.js";

export interface RegisteredWorkflowPlugin {
  source: string;
  plugin: WorkflowPlugin;
}

const registered: RegisteredWorkflowPlugin[] = [];

export function registerWorkflowPlugin(
  source: string,
  plugin: WorkflowPlugin,
): void {
  if (!plugin || !Array.isArray(plugin.workflows)) {
    throw new WorkflowCoreError(
      "workflow_plugin_invalid",
      `Plugin '${source}' exported 'workflowPlugin' but it does not have a 'workflows' array.`,
      { source },
    );
  }
  for (const workflow of plugin.workflows) {
    if (
      !workflow ||
      typeof workflow !== "object" ||
      !workflow.def ||
      typeof workflow.def.name !== "string"
    ) {
      throw new WorkflowCoreError(
        "workflow_plugin_invalid",
        `Plugin '${source}' contributes a workflow with no def or name.`,
        { source },
      );
    }
  }
  // FR-010 errors: a duplicate `def.name` across plugins is a hard
  // error at registration. The init hook turns this into a warn-and-skip
  // by catching the throw; library consumers can choose to surface it.
  for (const incoming of plugin.workflows) {
    for (const prior of registered) {
      const clash = prior.plugin.workflows.find(
        (w) => w.def.name === incoming.def.name,
      );
      if (clash) {
        throw new WorkflowCoreError(
          "workflow_name_conflict",
          `Workflow '${incoming.def.name}' is already contributed by '${prior.source}'.`,
          {
            name: incoming.def.name,
            sources: [prior.source, source],
          },
        );
      }
    }
  }
  registered.push({ source, plugin });
}

export function getRegisteredWorkflowPlugins(): readonly RegisteredWorkflowPlugin[] {
  return registered;
}

export function clearRegisteredWorkflowPlugins(): void {
  registered.length = 0;
}

export interface WorkflowRegistry {
  resolveByName(name: string): Workflow | undefined;
  list(): string[];
}

/**
 * Accepts either the bare `WorkflowPlugin[]` (used by tests and library
 * callers that don't care about source attribution) or the
 * `RegisteredWorkflowPlugin[]` returned by `getRegisteredWorkflowPlugins`
 * (used by the runner in production, so name-conflict errors can name
 * the real npm packages).
 */
export function buildWorkflowRegistry(
  entries: readonly (WorkflowPlugin | RegisteredWorkflowPlugin)[],
): WorkflowRegistry {
  // Important: do not mutate any registry entry on a conflict path. The
  // previous implementation pushed the conflicting source onto the
  // existing entry before throwing, which left the partially-built
  // registry in a polluted state if a caller chose to recover. Compute
  // the conflict sources as a fresh array and throw before any write.
  const byName = new Map<string, { workflow: Workflow; source: string }>();
  entries.forEach((entry, index) => {
    const { plugin, source } = normalizeEntry(entry, index);
    for (const workflow of plugin.workflows) {
      const existing = byName.get(workflow.def.name);
      if (existing) {
        throw new WorkflowCoreError(
          "workflow_name_conflict",
          `Workflow '${workflow.def.name}' is contributed by multiple plugins.`,
          {
            name: workflow.def.name,
            sources: [existing.source, source],
          },
        );
      }
      byName.set(workflow.def.name, { workflow, source });
    }
  });
  return {
    resolveByName: (name) => byName.get(name)?.workflow,
    list: () => Array.from(byName.keys()),
  };
}

function normalizeEntry(
  entry: WorkflowPlugin | RegisteredWorkflowPlugin,
  index: number,
): RegisteredWorkflowPlugin {
  if ("plugin" in entry && "source" in entry) return entry;
  return { plugin: entry as WorkflowPlugin, source: `plugin#${index}` };
}
