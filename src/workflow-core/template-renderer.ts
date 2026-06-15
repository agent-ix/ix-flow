import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import type { ArtifactTemplate } from "./definition.js";
import {
  type ResolveContext,
  resolveVariables,
  rewriteAssetPaths,
} from "./template-resolver.js";

export interface RenderInput {
  templateId: string;
  template: ArtifactTemplate;
  skillRoot: string;
  projectRoot: string;
  ctx: ResolveContext;
  /**
   * Prior record for this templateId, if the template has already been
   * rendered on this instance. Enables idempotent re-entry (FR-018-AC-4):
   * if the newly rendered content has the same hash as the prior record,
   * the file is not rewritten and the prior record is returned unchanged.
   */
  priorRecord?: ArtifactRecord;
}

export interface ArtifactRecord {
  templateId: string;
  path: string;
  renderedAt: string;
  contentHash: string;
}

export class TemplateRenderError extends Error {
  constructor(
    public code:
      | "template_source_missing"
      | "template_write_failed"
      | "template_render_failed"
      | "template_path_invalid",
    message: string,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

function assertWithin(rootAbs: string, candidateAbs: string): void {
  const root = rootAbs.endsWith(sep) ? rootAbs : rootAbs + sep;
  if (candidateAbs !== rootAbs && !candidateAbs.startsWith(root)) {
    throw new TemplateRenderError(
      "template_path_invalid",
      `template_path_invalid: resolved path escapes project root (${candidateAbs})`,
      { root: rootAbs, path: candidateAbs },
    );
  }
}

export async function renderTemplate(
  input: RenderInput,
): Promise<ArtifactRecord> {
  const { template, skillRoot, projectRoot, ctx, templateId } = input;

  let resolvedSourceRel: string;
  let resolvedTargetRel: string;
  try {
    const variantSource = template.variant
      ? resolveVariables(template.variant, ctx)
      : null;
    resolvedSourceRel = variantSource
      ? join(variantSource, template.source.split("/").pop()!)
      : resolveVariables(template.source, ctx);
    resolvedTargetRel = resolveVariables(template.target, ctx);
  } catch (err) {
    throw new TemplateRenderError(
      "template_render_failed",
      `template_render_failed: ${(err as Error).message}`,
      { templateId, cause: (err as Error).message },
    );
  }

  if (isAbsolute(resolvedSourceRel) || resolvedSourceRel.includes("..")) {
    throw new TemplateRenderError(
      "template_path_invalid",
      `template_path_invalid: source must be relative without traversal`,
      { templateId, source: resolvedSourceRel },
    );
  }
  if (isAbsolute(resolvedTargetRel) || resolvedTargetRel.includes("..")) {
    throw new TemplateRenderError(
      "template_path_invalid",
      `template_path_invalid: target must be relative without traversal`,
      { templateId, target: resolvedTargetRel },
    );
  }

  const sourceAbs = resolve(skillRoot, resolvedSourceRel);
  const targetAbs = resolve(projectRoot, resolvedTargetRel);
  assertWithin(skillRoot, sourceAbs);
  assertWithin(projectRoot, targetAbs);

  let raw: string;
  try {
    raw = await readFile(sourceAbs, "utf8");
  } catch (err) {
    throw new TemplateRenderError(
      "template_source_missing",
      `template_source_missing: ${sourceAbs}`,
      { templateId, source: sourceAbs, cause: (err as Error).message },
    );
  }

  let body: string;
  try {
    body = resolveVariables(raw, ctx);
    body = rewriteAssetPaths(body, dirname(sourceAbs), dirname(targetAbs));
  } catch (err) {
    throw new TemplateRenderError(
      "template_render_failed",
      `template_render_failed: ${(err as Error).message}`,
      { templateId, cause: (err as Error).message },
    );
  }

  const contentHash = createHash("sha256").update(body).digest("hex");

  if (
    input.priorRecord &&
    input.priorRecord.path === targetAbs &&
    input.priorRecord.contentHash === contentHash
  ) {
    return input.priorRecord;
  }

  try {
    await mkdir(dirname(targetAbs), { recursive: true });
    await writeFile(targetAbs, body, "utf8");
  } catch (err) {
    throw new TemplateRenderError(
      "template_write_failed",
      `template_write_failed: ${targetAbs}`,
      { templateId, target: targetAbs, cause: (err as Error).message },
    );
  }

  return {
    templateId,
    path: targetAbs,
    renderedAt: ctx.now,
    contentHash,
  };
}

export function isEligibleForPhase(
  template: ArtifactTemplate,
  phase: string,
): boolean {
  return template.phase === undefined || template.phase === phase;
}
