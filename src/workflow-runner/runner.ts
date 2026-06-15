import {
  GENESIS_HASH,
  GateTokenInvalidError,
  InterviewValidationError,
  JsonFileInstanceStore,
  TemplateRenderError,
  WorkflowCoreError,
  advanceInstancePhase,
  collectInterviewFollowUps,
  coreInvariants,
  createEvent,
  isEligibleForPhase,
  loadSkill,
  renderTemplate,
  summarizeInstance,
  validateAnswers,
  verifyChain,
  type Actor,
  type ArtifactRecord,
  type InstanceStore,
  type InvariantEvaluator,
  type JsonValue,
  type RecipeStep,
  type ResolveContext,
  type SkillPathRef,
  type Transition,
  type Workflow,
  type WorkflowGate,
  type WorkflowGateAck,
  type WorkflowEvent,
  type WorkflowInstance,
  type WorkflowPlugin,
} from "../workflow-core/index.js";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import {
  dirname,
  isAbsolute,
  relative as pathRelative,
  resolve,
} from "node:path";
import { WORKFLOW_PLUGIN_ID, type WorkflowPluginConfig } from "./config.js";
import {
  buildWorkflowRegistry,
  getRegisteredWorkflowPlugins,
  type RegisteredWorkflowPlugin,
  type WorkflowRegistry,
} from "./registry.js";
import type { WorkflowResultEnvelope } from "./result.js";

export interface WorkflowRunnerOptions {
  config?: Partial<WorkflowPluginConfig>;
  cwd?: string;
  store?: InstanceStore;
  actor?: Actor;
  now?: () => Date;
  idFactory?: () => string;
  /**
   * Workflow plugins exposed to this runner for name-mode lookups.
   * When omitted, the runner consults the process-scope registry
   * populated by the host (see `registry.ts`). Tests typically pass
   * an explicit array to avoid relying on global state.
   */
  plugins?: readonly (WorkflowPlugin | RegisteredWorkflowPlugin)[];
  /**
   * Caller-provided invariant evaluators merged on top of core
   * invariants and the matched workflow's own invariants. Useful for
   * test overrides; not the primary registration path.
   */
  invariants?: Record<string, InvariantEvaluator>;
}

export interface CreateWorkflowInput {
  id?: string;
  definitionName?: string;
  name?: string;
  targets?: WorkflowInstance["targets"];
  /**
   * Path-mode: load the workflow from this skill directory rather than
   * consulting the registered plugin list. The path is recorded on the
   * created instance so subsequent commands can re-load without the
   * caller re-specifying it. Per FR-011.
   */
  skillPath?: string;
}

export interface AdvanceWorkflowInput {
  id: string;
  to: string;
}

export interface AddItemInput {
  id: string;
  type: string;
  item: JsonValue;
}

export interface UpdateItemInput {
  id: string;
  type: string;
  itemId: string;
  patch: JsonValue;
}

export interface LinkItemsInput {
  id: string;
  link: JsonValue;
}

export interface RecordAnswersInput {
  id: string;
  interviewId: string;
  answers: Record<string, JsonValue>;
  merge?: boolean;
}

export interface RunRecipeInput {
  id: string;
  name: string;
}

export interface AckInput {
  id: string;
  token: string;
  kind?: string;
  reviewer?: string;
  note?: string;
}

interface RecipeStepRun {
  index: number;
  command: string;
  ok: boolean;
  state?: string;
}

export class WorkflowCommandRunner {
  private readonly config: WorkflowPluginConfig;
  private readonly store: InstanceStore;
  private readonly actor: Actor;
  private readonly now: () => Date;
  private readonly idFactory: () => string;
  private readonly registry: WorkflowRegistry;
  private readonly userInvariants: Record<string, InvariantEvaluator>;
  /**
   * Parent of the state directory at runner-construction time. Used as
   * the project-root anchor for path-mode skill bookkeeping
   * (FR-011-AC-6). `undefined` when the caller supplies its own
   * `InstanceStore` (we don't know where it's rooted) — in that case,
   * recorded skill paths use only the absolute form.
   */
  private readonly stateRootParent: string | undefined;

  constructor(options: WorkflowRunnerOptions = {}) {
    this.config = {
      stateDir: ".workflow",
      defaultDefinition: "workflow",
      output: "human",
      ...options.config,
    };
    if (options.store) {
      this.store = options.store;
      this.stateRootParent = undefined;
    } else {
      const stateDirAbs = resolve(
        options.cwd ?? process.cwd(),
        this.config.stateDir,
      );
      this.store = new JsonFileInstanceStore(stateDirAbs);
      this.stateRootParent = dirname(stateDirAbs);
    }
    this.actor = options.actor ?? { kind: "agent", id: "ix-cli" };
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? (() => randomUUID());
    const plugins = options.plugins ?? getRegisteredWorkflowPlugins();
    this.registry = buildWorkflowRegistry(plugins);
    this.userInvariants = options.invariants ?? {};
  }

  async create(
    input: CreateWorkflowInput = {},
  ): Promise<WorkflowResultEnvelope<WorkflowInstance>> {
    return this.wrap("create", async () => {
      const { workflow, skillPath } = await this.resolveForCreate(input);
      const skillPathRef = skillPath
        ? this.recordSkillPath(skillPath)
        : undefined;
      const def = workflow.def;
      const instance: WorkflowInstance = {
        id: input.id ?? this.idFactory(),
        defName: def.name,
        defVersion: def.version,
        defHash: def.contentHash,
        writerVersion: "0.1.0",
        name: input.name ?? def.name,
        targets: input.targets ?? [],
        phase: def.initialPhase,
        gateConfig: Object.fromEntries(
          def.transitions.map((transition) => [
            `${transition.from}->${transition.to}`,
            transition.defaultGate,
          ]),
        ),
        openGates: [],
        satisfiedGates: [],
        items: {},
        links: [],
        artifacts: [],
        openQuestions: [],
        events: [
          createEvent(
            {
              id: this.eventId(),
              ts: this.timestamp(),
              actor: this.actor,
              kind: "workflow.created",
              payload: { definitionName: def.name },
            },
            GENESIS_HASH,
          ),
        ],
        stateVersion: 0,
        ...(skillPathRef ? { skillPath: skillPathRef } : {}),
      };
      await this.store.create(instance);
      return {
        data: instance,
        events: instance.events,
        summary: summarizeInstance(instance),
      };
    });
  }

  async status(id: string): Promise<WorkflowResultEnvelope<WorkflowInstance>> {
    return this.wrap("status", async () => {
      const instance = await this.store.get(id);
      return {
        data: instance,
        events: [],
        summary: summarizeInstance(instance),
      };
    });
  }

  async addItem(
    input: AddItemInput,
  ): Promise<WorkflowResultEnvelope<WorkflowInstance>> {
    return this.mutate("add-item", input.id, (current) => {
      const item = assertJsonObject(input.item, "item");
      const itemId = item.id;
      if (typeof itemId !== "string" || itemId.length === 0) {
        throw new WorkflowCoreError(
          "item_id_required",
          "Workflow item must include a non-empty string id.",
          { id: input.id, type: input.type },
        );
      }
      const existing = current.items[input.type] ?? [];
      if (existing.some((candidate) => itemIdOf(candidate) === itemId)) {
        throw new WorkflowCoreError(
          "item_already_exists",
          `Workflow item '${itemId}' already exists in '${input.type}'.`,
          { id: input.id, type: input.type, itemId },
        );
      }
      return {
        state: {
          ...current,
          items: {
            ...current.items,
            [input.type]: [...existing, input.item],
          },
        },
        eventKind: "item.added",
        payload: { type: input.type, itemId },
      };
    });
  }

  async updateItem(
    input: UpdateItemInput,
  ): Promise<WorkflowResultEnvelope<WorkflowInstance>> {
    return this.mutate("update-item", input.id, (current) => {
      const patch = assertJsonObject(input.patch, "patch");
      const existing = current.items[input.type] ?? [];
      const index = existing.findIndex(
        (candidate) => itemIdOf(candidate) === input.itemId,
      );
      if (index < 0) {
        throw new WorkflowCoreError(
          "item_not_found",
          `Workflow item '${input.itemId}' was not found in '${input.type}'.`,
          { id: input.id, type: input.type, itemId: input.itemId },
        );
      }
      const currentItem = assertJsonObject(existing[index], "existing item");
      const nextItems = [...existing];
      nextItems[index] = { ...currentItem, ...patch, id: input.itemId };
      return {
        state: {
          ...current,
          items: {
            ...current.items,
            [input.type]: nextItems,
          },
        },
        eventKind: "item.updated",
        payload: { type: input.type, itemId: input.itemId },
      };
    });
  }

  async linkItems(
    input: LinkItemsInput,
  ): Promise<WorkflowResultEnvelope<WorkflowInstance>> {
    return this.mutate("link-items", input.id, (current) => ({
      state: {
        ...current,
        links: [...current.links, input.link],
      },
      eventKind: "items.linked",
      payload: { link: input.link },
    }));
  }

  async ack(
    input: AckInput,
  ): Promise<WorkflowResultEnvelope<WorkflowInstance>> {
    return this.mutate("ack", input.id, (current) => {
      const gate = (current.openGates ?? []).find(
        (candidate) => candidate.token === input.token,
      );
      if (!gate) {
        throw new GateTokenInvalidError(input.id, input.token);
      }
      const ack: WorkflowGateAck = {
        ...gate,
        approver: input.reviewer ?? this.actor.id,
        ...(input.note ? { note: input.note } : {}),
        acknowledgedAt: this.timestamp(),
      };
      return {
        state: {
          ...current,
          openGates: (current.openGates ?? []).filter(
            (candidate) => candidate.token !== input.token,
          ),
          satisfiedGates: [...(current.satisfiedGates ?? []), ack],
        },
        eventKind: "gate.acknowledged",
        payload: ack as unknown as JsonValue,
      };
    });
  }

  async recordAnswers(
    input: RecordAnswersInput,
  ): Promise<WorkflowResultEnvelope<WorkflowInstance>> {
    return this.wrap("record-answers", async () => {
      const current = await this.store.get(input.id);
      const workflow = await this.resolveForInstance(current);
      const interview = workflow.def.interviews?.[input.interviewId];
      if (!interview) {
        throw new WorkflowCoreError(
          "interview_id_unknown",
          `Interview '${input.interviewId}' is not declared on workflow '${workflow.def.name}'.`,
          { id: input.id, interviewId: input.interviewId },
        );
      }
      try {
        validateAnswers(interview, input.answers);
      } catch (err) {
        if (err instanceof InterviewValidationError) {
          throw new WorkflowCoreError(err.code, err.message, err.details);
        }
        throw err;
      }

      const itemType = interview.itemType;
      const itemId = input.interviewId;
      const existingList = current.items[itemType] ?? [];
      const existingIndex = existingList.findIndex(
        (candidate) => itemIdOf(candidate) === itemId,
      );
      const existing =
        existingIndex >= 0
          ? (existingList[existingIndex] as Record<string, JsonValue>)
          : undefined;

      const answeredAt = this.timestamp();
      const mergedFields =
        input.merge && existing
          ? { ...existing, ...input.answers }
          : { ...input.answers };
      const newItem: Record<string, JsonValue> = {
        ...mergedFields,
        id: itemId,
        interviewId: input.interviewId,
        answeredAt,
      };

      // Idempotence check: if the merged result equals the existing item
      // (ignoring `answeredAt`), short-circuit with no event.
      if (existing && itemsEqualExceptAnsweredAt(existing, newItem)) {
        return {
          data: current,
          events: [],
          summary: summarizeInstance(current),
        };
      }

      const nextList = [...existingList];
      if (existingIndex >= 0) {
        // Preserve the original answeredAt on no-substantive-change merges,
        // but here we've already determined the content differs, so write
        // the new timestamp.
        nextList[existingIndex] = newItem;
      } else {
        nextList.push(newItem);
      }
      const next: WorkflowInstance = {
        ...current,
        items: { ...current.items, [itemType]: nextList },
      };

      const event = createEvent(
        {
          id: this.eventId(),
          ts: answeredAt,
          actor: this.actor,
          kind: "interview.answers_recorded",
          payload: {
            interviewId: input.interviewId,
            itemType,
            itemId,
            merge: Boolean(input.merge),
          },
        },
        current.events.at(-1)?.hash ?? GENESIS_HASH,
      );

      await this.store.appendAndSave(
        current.id,
        [event],
        next,
        current.stateVersion,
      );
      const saved = await this.store.get(current.id);
      return {
        data: saved,
        events: [event],
        summary: summarizeInstance(saved),
      };
    });
  }

  async runRecipe(
    input: RunRecipeInput,
  ): Promise<WorkflowResultEnvelope<WorkflowInstance>> {
    return this.wrap("recipe run", async () => {
      let current = await this.store.get(input.id);
      const workflow = await this.resolveForInstance(current);
      const recipe = workflow.def.recipes?.[input.name];
      if (!recipe) {
        throw new WorkflowCoreError(
          "recipe_not_found",
          `Workflow recipe '${input.name}' was not found on '${workflow.def.name}'.`,
          {
            id: input.id,
            recipe: input.name,
            available: Object.keys(workflow.def.recipes ?? {}),
          },
        );
      }

      const events: WorkflowEvent[] = [];
      const recipeSteps: RecipeStepRun[] = [];
      let interviewFollowups:
        | WorkflowResultEnvelope<WorkflowInstance>["interview_followups"]
        | undefined;
      for (const [index, step] of recipe.steps.entries()) {
        const preStep = current;
        const result = await this.runRecipeStep(input.id, step);
        events.push(...result.events);
        interviewFollowups = result.interview_followups ?? interviewFollowups;
        recipeSteps.push({
          index,
          command: step.command,
          ok: result.ok,
          state: result.state,
        });

        const next = workflowInstanceValue(result.data);
        if (next) current = next;

        if (!result.ok) {
          const fallback = next ?? preStep;
          return {
            ok: false,
            state: result.state ?? "recipe_blocked",
            data: fallback,
            events,
            summary: summarizeInstance(fallback),
            error: result.error
              ? {
                  ...result.error,
                  details: {
                    ...result.error.details,
                    recipe: input.name,
                    step: index,
                    stepCommand: step.command,
                  },
                }
              : result.error,
            recipe_steps: recipeSteps,
          };
        }
      }

      return {
        data: current,
        events,
        summary: summarizeInstance(current),
        recipe_steps: recipeSteps,
        interview_followups: interviewFollowups,
      };
    });
  }

  async advance(
    input: AdvanceWorkflowInput,
  ): Promise<WorkflowResultEnvelope<WorkflowInstance>> {
    return this.wrap("advance", async () => {
      const current = await this.store.get(input.id);
      const workflow = await this.resolveForInstance(current);
      const invariants = this.composeInvariants(workflow);
      const { instance: advanced, transition } = advanceInstancePhase(
        workflow.def,
        current,
        input.to,
        { invariants },
      );
      const transitionKey = keyForTransition(transition);
      const gateMode =
        current.gateConfig[transitionKey] ?? transition.defaultGate;
      if (gateMode === "hitl") {
        const satisfied = (current.satisfiedGates ?? []).find(
          (gate) => gate.transitionKey === transitionKey,
        );
        if (!satisfied) {
          const existingGate = (current.openGates ?? []).find(
            (gate) => gate.transitionKey === transitionKey,
          );
          const gate = existingGate ?? this.createGate(transition);
          const nextState = existingGate
            ? current
            : {
                ...current,
                openGates: [...(current.openGates ?? []), gate],
              };
          const event = existingGate
            ? undefined
            : createEvent(
                {
                  id: this.eventId(),
                  ts: this.timestamp(),
                  actor: this.actor,
                  kind: "gate.deferred",
                  payload: gate as unknown as JsonValue,
                },
                current.events.at(-1)?.hash ?? GENESIS_HASH,
              );
          if (event) {
            await this.store.appendAndSave(
              current.id,
              [event],
              nextState,
              current.stateVersion,
            );
          }
          const saved = event ? await this.store.get(current.id) : current;
          return {
            ok: false,
            state: "gate_deferred",
            data: saved,
            events: event ? [event] : [],
            summary: summarizeInstance(saved),
          };
        }
      }
      const withGatesCleared: WorkflowInstance = {
        ...advanced,
        openGates: (advanced.openGates ?? []).filter(
          (gate) => gate.transitionKey !== transitionKey,
        ),
        satisfiedGates: (advanced.satisfiedGates ?? []).filter(
          (gate) => gate.transitionKey !== transitionKey,
        ),
      };
      const renderedArtifacts = await this.renderPhaseEntryArtifacts(
        workflow,
        withGatesCleared,
      );
      const next: WorkflowInstance = renderedArtifacts
        ? { ...withGatesCleared, artifacts: renderedArtifacts }
        : withGatesCleared;
      const event = createEvent(
        {
          id: this.eventId(),
          ts: this.timestamp(),
          actor: this.actor,
          kind: "phase.advanced",
          payload: { from: current.phase, to: input.to },
        },
        current.events.at(-1)?.hash ?? GENESIS_HASH,
      );
      await this.store.appendAndSave(
        current.id,
        [event],
        next,
        current.stateVersion,
      );
      const saved = await this.store.get(current.id);
      const followups = collectInterviewFollowUps(
        workflow.def as unknown as Parameters<
          typeof collectInterviewFollowUps
        >[0],
        saved as unknown as Parameters<typeof collectInterviewFollowUps>[1],
      );
      return {
        data: saved,
        events: [event],
        summary: summarizeInstance(saved),
        interview_followups: followups,
      };
    });
  }

  private async runRecipeStep(
    id: string,
    step: RecipeStep,
  ): Promise<WorkflowResultEnvelope<WorkflowInstance>> {
    switch (step.command) {
      case "advance":
        return this.advance({ id, to: step.to });
      case "add-item":
        return this.addItem({
          id,
          type: step.type,
          item: step.item as JsonValue,
        });
      case "update-item":
        return this.updateItem({
          id,
          type: step.type,
          itemId: step.itemId,
          patch: step.patch as JsonValue,
        });
      case "link-items":
        return this.linkItems({ id, link: step.link as JsonValue });
      case "record-answers":
        return this.recordAnswers({
          id,
          interviewId: step.interviewId,
          answers: step.answers as Record<string, JsonValue>,
          merge: step.merge,
        });
      default:
        throw new WorkflowCoreError(
          "recipe_step_unknown",
          "Workflow recipe step command is not supported.",
          { id },
        );
    }
  }

  async history(id: string): Promise<WorkflowResultEnvelope<WorkflowEvent[]>> {
    return this.wrap("history", async () => {
      const instance = await this.store.get(id);
      return {
        data: instance.events,
        events: [],
        summary: summarizeInstance(instance),
      };
    });
  }

  async verifyChain(id: string): Promise<WorkflowResultEnvelope> {
    return this.wrap("verify-chain", async () => {
      const instance = await this.store.get(id);
      return {
        data: verifyChain(instance.events),
        events: [],
        summary: summarizeInstance(instance),
      };
    });
  }

  private async renderPhaseEntryArtifacts(
    workflow: Workflow,
    advanced: WorkflowInstance,
  ): Promise<JsonValue[] | undefined> {
    const templates = workflow.def.artifactTemplates;
    if (!templates || Object.keys(templates).length === 0) return undefined;
    const eligible = Object.entries(templates).filter(([, tpl]) =>
      isEligibleForPhase(tpl, advanced.phase),
    );
    if (eligible.length === 0) return undefined;

    const skillRoot = advanced.skillPath
      ? this.resolveSkillPathRef(advanced.skillPath)
      : undefined;
    if (!skillRoot) {
      throw new WorkflowCoreError(
        "template_source_missing",
        "Workflows that declare artifactTemplates must be loaded via path-mode (skillPath).",
        { defName: advanced.defName, phase: advanced.phase },
      );
    }
    const projectRoot = this.stateRootParent ?? process.cwd();

    const ctx: ResolveContext = {
      instance: {
        id: advanced.id,
        phase: advanced.phase,
        defName: advanced.defName,
      },
      items: itemsToIndexedMap(advanced.items),
      project: {},
      now: this.timestamp(),
      uuid: this.idFactory(),
    };

    const priorById = new Map<string, ArtifactRecord>();
    for (const value of advanced.artifacts ?? []) {
      const record = asArtifactRecord(value);
      if (record) priorById.set(record.templateId, record);
    }

    const next: ArtifactRecord[] = [];
    for (const [templateId, template] of eligible) {
      let record: ArtifactRecord;
      try {
        record = await renderTemplate({
          templateId,
          template,
          skillRoot,
          projectRoot,
          ctx,
          priorRecord: priorById.get(templateId),
        });
      } catch (err) {
        if (err instanceof TemplateRenderError) {
          throw new WorkflowCoreError(err.code, err.message, {
            ...err.details,
            templateId,
          });
        }
        throw err;
      }
      next.push(record);
      priorById.delete(templateId);
    }
    for (const remaining of priorById.values()) {
      next.push(remaining);
    }

    return next as unknown as JsonValue[];
  }

  private async resolveForCreate(
    input: CreateWorkflowInput,
  ): Promise<{ workflow: Workflow; skillPath?: string }> {
    if (input.skillPath) {
      const skillRoot = resolve(input.skillPath);
      const plugin = await loadSkill(skillRoot);
      if (plugin.workflows.length === 0) {
        throw new WorkflowCoreError(
          "skill_format_invalid",
          `Skill at ${skillRoot} contains no workflows.`,
          { path: skillRoot },
        );
      }
      let workflow: Workflow | undefined;
      if (input.definitionName) {
        workflow = plugin.workflows.find(
          (candidate) => candidate.def.name === input.definitionName,
        );
        if (!workflow) {
          throw new WorkflowCoreError(
            "definition_not_found",
            `Workflow '${input.definitionName}' was not found in skill at ${skillRoot}.`,
            { definitionName: input.definitionName, path: skillRoot },
          );
        }
      } else if (plugin.workflows.length === 1) {
        workflow = plugin.workflows[0];
      } else {
        throw new WorkflowCoreError(
          "workflow_ambiguous",
          `Skill at ${skillRoot} contains multiple workflows; specify one by name.`,
          {
            path: skillRoot,
            available: plugin.workflows.map((candidate) => candidate.def.name),
          },
        );
      }
      return { workflow, skillPath: skillRoot };
    }

    const definitionName =
      input.definitionName ?? this.config.defaultDefinition;
    const workflow = this.registry.resolveByName(definitionName);
    if (!workflow) {
      throw new WorkflowCoreError(
        "definition_not_found",
        `Workflow definition '${definitionName}' was not found.`,
        { definitionName },
      );
    }
    return { workflow };
  }

  private async resolveForInstance(
    instance: WorkflowInstance,
  ): Promise<Workflow> {
    let workflow: Workflow | undefined;
    if (instance.skillPath) {
      const resolved = this.resolveSkillPathRef(instance.skillPath);
      const plugin = await loadSkill(resolved);
      workflow = plugin.workflows.find(
        (candidate) => candidate.def.name === instance.defName,
      );
    } else {
      workflow = this.registry.resolveByName(instance.defName);
    }
    if (!workflow || workflow.def.contentHash !== instance.defHash) {
      throw new WorkflowCoreError(
        "definition_hash_mismatch",
        `Workflow definition '${instance.defName}' does not match instance hash.`,
        { id: instance.id, defName: instance.defName },
      );
    }
    return workflow;
  }

  /**
   * Record an absolute skill path in the two-form shape (FR-011-AC-6):
   * always carry `absolute`, and additionally carry `relative` when the
   * skill is inside the state-dir parent (project root by convention).
   * When the runner was constructed with an externally-provided store,
   * we don't know the state-dir parent and store only the absolute form.
   */
  private recordSkillPath(absoluteSkillPath: string): SkillPathRef {
    if (this.stateRootParent) {
      const rel = pathRelative(this.stateRootParent, absoluteSkillPath);
      if (rel && !rel.startsWith("..") && !isAbsolute(rel)) {
        return { relative: rel, absolute: absoluteSkillPath };
      }
    }
    return { absolute: absoluteSkillPath };
  }

  /**
   * Resolve a recorded skill path back to an on-disk location, preferring
   * `relative` (resolved against the CURRENT state-dir parent) so that a
   * project move is transparent. Falls back to the absolute form only
   * when the relative resolution does not exist on disk.
   */
  private resolveSkillPathRef(ref: SkillPathRef): string {
    if (this.stateRootParent && ref.relative) {
      const candidate = resolve(this.stateRootParent, ref.relative);
      if (existsSync(candidate)) return candidate;
    }
    return ref.absolute;
  }

  private composeInvariants(
    workflow: Workflow,
  ): Record<string, InvariantEvaluator> {
    // FR-014-AC-1: resolution order is core lib → plugin/skill → (test-only
    // host override). Object-spread order is LAST-wins, so we spread the
    // workflow first, then core (so core overrides the workflow's same-name
    // entry), then the user override (which is internal/test-only and is
    // not specified by FR-014). A workflow cannot shadow a core-library
    // predicate name.
    return {
      ...workflow.invariants,
      ...coreInvariants,
      ...this.userInvariants,
    };
  }

  private createGate(transition: Transition): WorkflowGate {
    const transitionKey = keyForTransition(transition);
    return {
      token: `ack_${this.idFactory()}`,
      transitionKey,
      from: transition.from,
      to: transition.to,
      kind: transitionKey,
      issuedAt: this.timestamp(),
    };
  }

  private async mutate(
    command: string,
    id: string,
    apply: (current: WorkflowInstance) => {
      state: WorkflowInstance;
      eventKind: string;
      payload: JsonValue;
    },
  ): Promise<WorkflowResultEnvelope<WorkflowInstance>> {
    return this.wrap(command, async () => {
      const current = await this.store.get(id);
      const mutation = apply(current);
      const event = createEvent(
        {
          id: this.eventId(),
          ts: this.timestamp(),
          actor: this.actor,
          kind: mutation.eventKind,
          payload: mutation.payload,
        },
        current.events.at(-1)?.hash ?? GENESIS_HASH,
      );
      await this.store.appendAndSave(
        current.id,
        [event],
        mutation.state,
        current.stateVersion,
      );
      const saved = await this.store.get(current.id);
      return {
        data: saved,
        events: [event],
        summary: summarizeInstance(saved),
      };
    });
  }

  private async wrap<T>(
    command: string,
    fn: () => Promise<{
      ok?: boolean;
      state?: string;
      data?: T;
      events: WorkflowEvent[];
      summary?: WorkflowResultEnvelope<T>["summary"];
      interview_followups?: WorkflowResultEnvelope<T>["interview_followups"];
      error?: WorkflowResultEnvelope<T>["error"];
      recipe_steps?: WorkflowResultEnvelope<T>["recipe_steps"];
    }>,
  ): Promise<WorkflowResultEnvelope<T>> {
    try {
      const result = await fn();
      const instance = workflowInstanceValue(result.data);
      const nextActions = instance
        ? nextActionsForInstance(command, instance)
        : result.summary
          ? [`ix-flow status ${result.summary.id}`]
          : [];
      return {
        ok: result.ok ?? true,
        command,
        instance_id: instance?.id ?? result.summary?.id,
        state: result.state ?? (result.ok === false ? "blocked" : "ok"),
        ...result,
        current_phase: instance?.phase ?? result.summary?.phase,
        transitions_available: instance
          ? transitionsAvailableForInstance()
          : undefined,
        open_gates: instance?.openGates ?? [],
        state_version: instance?.stateVersion ?? result.summary?.stateVersion,
        def_hash: instance?.defHash,
        cli_version: "0.1.0",
        next_actions: structuredNextActions(nextActions, instance),
        nextActions,
      };
    } catch (err) {
      const code =
        err instanceof WorkflowCoreError ? err.code : "workflow_command_failed";
      const details =
        err instanceof WorkflowCoreError
          ? err.details
          : { pluginId: WORKFLOW_PLUGIN_ID };
      return {
        ok: false,
        command,
        state: errorState(code),
        error: {
          code,
          message: err instanceof Error ? err.message : String(err),
          details,
        },
        events: [],
        next_actions: [],
        nextActions: [],
      };
    }
  }

  private timestamp(): string {
    return this.now().toISOString();
  }

  private eventId(): string {
    return `evt_${this.idFactory()}`;
  }
}

function itemIdOf(value: JsonValue): string | undefined {
  const item = objectValue(value);
  return typeof item?.id === "string" ? item.id : undefined;
}

function itemsToIndexedMap(
  items: Record<string, JsonValue[]>,
): Record<string, Record<string, Record<string, JsonValue>>> {
  const out: Record<string, Record<string, Record<string, JsonValue>>> = {};
  for (const [type, list] of Object.entries(items)) {
    const byId: Record<string, Record<string, JsonValue>> = {};
    for (const value of list) {
      const obj = objectValue(value);
      if (obj && typeof obj.id === "string") {
        byId[obj.id] = obj;
      }
    }
    out[type] = byId;
  }
  return out;
}

function itemsEqualExceptAnsweredAt(
  a: Record<string, JsonValue>,
  b: Record<string, JsonValue>,
): boolean {
  const keysA = Object.keys(a).filter((k) => k !== "answeredAt");
  const keysB = Object.keys(b).filter((k) => k !== "answeredAt");
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) return false;
  }
  return true;
}

function asArtifactRecord(value: JsonValue): ArtifactRecord | undefined {
  const obj = objectValue(value);
  if (
    obj &&
    typeof obj.templateId === "string" &&
    typeof obj.path === "string" &&
    typeof obj.renderedAt === "string" &&
    typeof obj.contentHash === "string"
  ) {
    return {
      templateId: obj.templateId,
      path: obj.path,
      renderedAt: obj.renderedAt,
      contentHash: obj.contentHash,
    };
  }
  return undefined;
}

function assertJsonObject(
  value: JsonValue,
  label: string,
): Record<string, JsonValue> {
  const obj = objectValue(value);
  if (!obj) {
    throw new WorkflowCoreError(
      "json_object_required",
      `Workflow ${label} must be a JSON object.`,
      { label },
    );
  }
  return obj;
}

function objectValue(
  value: JsonValue | undefined,
): Record<string, JsonValue> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  return value;
}

function keyForTransition(transition: Pick<Transition, "from" | "to">): string {
  return `${transition.from}->${transition.to}`;
}

function workflowInstanceValue(value: unknown): WorkflowInstance | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const candidate = value as Partial<WorkflowInstance>;
  return typeof candidate.id === "string" && typeof candidate.phase === "string"
    ? (candidate as WorkflowInstance)
    : undefined;
}

function nextActionsForInstance(
  command: string,
  instance: WorkflowInstance,
): string[] {
  const openGate = (instance.openGates ?? [])[0];
  if (openGate) {
    return [
      `ix-flow ack ${instance.id} ${openGate.token} --reviewer <user>`,
      `ix-flow advance ${instance.id} ${openGate.to}`,
    ];
  }
  if (command === "ack") {
    const satisfiedGate = (instance.satisfiedGates ?? [])[0];
    if (satisfiedGate) {
      return [`ix-flow advance ${instance.id} ${satisfiedGate.to}`];
    }
  }
  return [`ix-flow status ${instance.id}`];
}

function structuredNextActions(
  commands: string[],
  instance: WorkflowInstance | undefined,
): WorkflowResultEnvelope["next_actions"] {
  return commands.map((command) => {
    if (
      command.includes(" ix-flow ack ") ||
      command.startsWith("ix-flow ack ")
    ) {
      return {
        command,
        description:
          "Record human approval to complete the deferred transition.",
        required_for: instance?.openGates?.[0]
          ? `advance to ${instance.openGates[0].to}`
          : undefined,
      };
    }
    if (
      command.includes(" ix-flow advance ") ||
      command.startsWith("ix-flow advance ")
    ) {
      return {
        command,
        description: "Retry the deferred transition after acknowledgement.",
      };
    }
    return {
      command,
      description: "Inspect current workflow state.",
    };
  });
}

function transitionsAvailableForInstance(): string[] {
  // The runner computes this accurately when the workflow definition is loaded
  // for command execution; the envelope reserves the field for callers even
  // when a read path only has persisted instance state.
  return [];
}

function errorState(code: string): string {
  switch (code) {
    case "transition_invariant_failed":
      return "invariant_failed";
    case "state_version_mismatch":
      return "concurrency_conflict";
    case "definition_hash_mismatch":
      return "definition_mismatch";
    default:
      return "error";
  }
}
