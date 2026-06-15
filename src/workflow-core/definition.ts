import { createHash } from "node:crypto";
import { z } from "zod";
import { canonicalJson, type JsonValue } from "./canonical.js";

export const GateModeSchema = z.enum(["auto", "hitl", "full-auto"]);
export type GateMode = z.infer<typeof GateModeSchema>;

export const PhaseSchema = z
  .object({
    name: z.string().min(1),
    terminal: z.boolean().default(false),
    hint: z.string().optional(),
  })
  .strict();
export type Phase = z.infer<typeof PhaseSchema>;

export const TransitionSchema = z
  .object({
    from: z.string().min(1),
    to: z.string().min(1),
    invariants: z.array(z.string().min(1)).default([]),
    defaultGate: GateModeSchema.default("auto"),
  })
  .strict();
export type Transition = z.infer<typeof TransitionSchema>;

const SAFE_PATH_RE = /^[^/\0][^\0]*$/;
function isSafeRelativePath(value: string): boolean {
  if (!SAFE_PATH_RE.test(value)) return false;
  const segments = value.split("/");
  return !segments.includes("..");
}

export const QuestionTypeSchema = z.enum([
  "text",
  "list<text>",
  "enum",
  "bool",
  "int",
]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const QuestionSchema = z
  .object({
    key: z.string().min(1),
    prompt: z.string().min(1),
    type: QuestionTypeSchema,
    required: z.boolean(),
    options: z.array(z.string().min(1)).optional(),
    minItems: z.number().int().nonnegative().optional(),
    guidance: z.string().optional(),
    followUpIf: z.enum(["nonEmpty", "empty"]).optional(),
  })
  .strict()
  .superRefine((q, ctx) => {
    if (q.type === "enum") {
      if (!q.options || q.options.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["options"],
          message: "interview_enum_options_missing",
        });
      }
    }
  });
export type Question = z.infer<typeof QuestionSchema>;

export const CompletenessRuleSchema = z
  .string()
  .regex(/^(all_required|min_count:\d+|custom_invariant:.+)$/)
  .default("all_required");
export type CompletenessRule = z.infer<typeof CompletenessRuleSchema>;

export const InterviewSchema = z
  .object({
    itemType: z.string().min(1),
    completenessRule: CompletenessRuleSchema,
    questions: z.array(QuestionSchema).min(1),
  })
  .strict()
  .superRefine((iv, ctx) => {
    const seen = new Set<string>();
    for (const [index, q] of iv.questions.entries()) {
      if (seen.has(q.key)) {
        ctx.addIssue({
          code: "custom",
          path: ["questions", index, "key"],
          message: "interview_key_duplicate",
        });
      }
      seen.add(q.key);
    }
  });
export type Interview = z.infer<typeof InterviewSchema>;

export const ArtifactTemplateSchema = z
  .object({
    source: z.string().min(1),
    target: z.string().min(1),
    variant: z.string().min(1).optional(),
    frontmatterSchema: z.string().min(1).optional(),
    phase: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((tpl, ctx) => {
    if (!isSafeRelativePath(tpl.source)) {
      ctx.addIssue({
        code: "custom",
        path: ["source"],
        message: "template_path_invalid",
      });
    }
    if (!isSafeRelativePath(tpl.target)) {
      ctx.addIssue({
        code: "custom",
        path: ["target"],
        message: "template_path_invalid",
      });
    }
  });
export type ArtifactTemplate = z.infer<typeof ArtifactTemplateSchema>;

export const RecipeStepSchema = z.discriminatedUnion("command", [
  z
    .object({
      command: z.literal("advance"),
      to: z.string().min(1),
    })
    .strict(),
  z
    .object({
      command: z.literal("add-item"),
      type: z.string().min(1),
      item: z.unknown(),
    })
    .strict(),
  z
    .object({
      command: z.literal("update-item"),
      type: z.string().min(1),
      itemId: z.string().min(1),
      patch: z.unknown(),
    })
    .strict(),
  z
    .object({
      command: z.literal("link-items"),
      link: z.unknown(),
    })
    .strict(),
  z
    .object({
      command: z.literal("record-answers"),
      interviewId: z.string().min(1),
      answers: z.record(z.string(), z.unknown()),
      merge: z.boolean().optional(),
    })
    .strict(),
]);
export type RecipeStep = z.infer<typeof RecipeStepSchema>;

export const RecipeSchema = z
  .object({
    description: z.string().optional(),
    steps: z.array(RecipeStepSchema).min(1),
  })
  .strict();
export type Recipe = z.infer<typeof RecipeSchema>;

export const WorkflowDefSchema = z
  .object({
    name: z.string().min(1),
    version: z.string().min(1),
    description: z.string().optional(),
    initialPhase: z.string().min(1),
    phases: z.array(PhaseSchema).min(1),
    transitions: z.array(TransitionSchema).default([]),
    itemSchemas: z.record(z.string(), z.unknown()).default({}),
    linkSchemas: z.record(z.string(), z.unknown()).default({}),
    artifactTemplates: z.record(z.string(), ArtifactTemplateSchema).optional(),
    interviews: z.record(z.string(), InterviewSchema).optional(),
    recipes: z.record(z.string().min(1), RecipeSchema).optional(),
  })
  .strict()
  .superRefine((def, ctx) => {
    const phaseNames = new Set(def.phases.map((phase) => phase.name));
    if (!phaseNames.has(def.initialPhase)) {
      ctx.addIssue({
        code: "custom",
        path: ["initialPhase"],
        message: "initialPhase must reference a declared phase",
      });
    }
    for (const [index, transition] of def.transitions.entries()) {
      if (!phaseNames.has(transition.from)) {
        ctx.addIssue({
          code: "custom",
          path: ["transitions", index, "from"],
          message: "transition.from must reference a declared phase",
        });
      }
      if (!phaseNames.has(transition.to)) {
        ctx.addIssue({
          code: "custom",
          path: ["transitions", index, "to"],
          message: "transition.to must reference a declared phase",
        });
      }
    }
    if (def.interviews) {
      for (const [id, iv] of Object.entries(def.interviews)) {
        if (!(iv.itemType in def.itemSchemas)) {
          ctx.addIssue({
            code: "custom",
            path: ["interviews", id, "itemType"],
            message: `interview_item_type_unknown: ${iv.itemType}`,
          });
        }
      }
    }
    if (def.artifactTemplates) {
      const literalTargets = new Map<string, string>();
      for (const [id, tpl] of Object.entries(def.artifactTemplates)) {
        if (tpl.phase && !phaseNames.has(tpl.phase)) {
          ctx.addIssue({
            code: "custom",
            path: ["artifactTemplates", id, "phase"],
            message: "artifactTemplates.phase must reference a declared phase",
          });
        }
        if (!tpl.target.includes("${")) {
          const prior = literalTargets.get(tpl.target);
          if (prior) {
            ctx.addIssue({
              code: "custom",
              path: ["artifactTemplates", id, "target"],
              message: `template_target_duplicate: shares target with ${prior}`,
            });
          } else {
            literalTargets.set(tpl.target, id);
          }
        }
      }
    }
  });
export type WorkflowDef = z.infer<typeof WorkflowDefSchema>;

export interface PinnedWorkflowDef extends WorkflowDef {
  contentHash: string;
}

export function parseWorkflowDef(input: unknown): PinnedWorkflowDef {
  const def = WorkflowDefSchema.parse(input);
  return { ...def, contentHash: hashWorkflowDef(def) };
}

export function hashWorkflowDef(def: WorkflowDef | PinnedWorkflowDef): string {
  const hashableDef: Partial<PinnedWorkflowDef> = { ...def };
  delete hashableDef.contentHash;
  const canonical = canonicalJson(hashableDef as JsonValue);
  return createHash("sha256").update(canonical).digest("hex");
}
