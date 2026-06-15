import * as path from "node:path";
import type { JsonValue } from "./canonical.js";

export interface ResolveContext {
  item?: Record<string, JsonValue>;
  items?: Record<string, Record<string, Record<string, JsonValue>>>;
  instance?: Record<string, JsonValue>;
  project?: Record<string, JsonValue>;
  now: string;
  uuid: string;
}

export class TemplateVariableUnresolvedError extends Error {
  code = "template_variable_unresolved" as const;
  constructor(public reference: string) {
    super(`template_variable_unresolved: ${reference}`);
  }
}

export class TemplateVariableScopeViolationError extends Error {
  code = "template_variable_scope_violation" as const;
  constructor(public reference: string) {
    super(`template_variable_scope_violation: ${reference}`);
  }
}

const ALLOWED_ROOTS = new Set([
  "item",
  "items",
  "instance",
  "project",
  "now",
  "uuid",
]);

const VAR_RE = /\$\{([A-Za-z_][A-Za-z0-9_.]*)\}/g;

function lookup(scope: unknown, segments: string[], original: string): string {
  let cursor: unknown = scope;
  for (const seg of segments) {
    if (cursor && typeof cursor === "object" && seg in (cursor as object)) {
      cursor = (cursor as Record<string, unknown>)[seg];
    } else {
      throw new TemplateVariableUnresolvedError(original);
    }
  }
  if (cursor === null || cursor === undefined || typeof cursor === "object") {
    throw new TemplateVariableUnresolvedError(original);
  }
  return String(cursor);
}

export function resolveVariables(text: string, ctx: ResolveContext): string {
  return text.replace(VAR_RE, (_match, ref: string) => {
    const segments = ref.split(".");
    const root = segments[0];

    if (!ALLOWED_ROOTS.has(root)) {
      throw new TemplateVariableScopeViolationError(ref);
    }

    if (root === "now") {
      if (segments.length !== 1) {
        throw new TemplateVariableUnresolvedError(ref);
      }
      return ctx.now;
    }
    if (root === "uuid") {
      if (segments.length !== 1) {
        throw new TemplateVariableUnresolvedError(ref);
      }
      return ctx.uuid;
    }

    if (segments.length < 2) {
      throw new TemplateVariableUnresolvedError(ref);
    }

    const rest = segments.slice(1);
    let scope: unknown;
    if (root === "item") scope = ctx.item;
    else if (root === "items") scope = ctx.items;
    else if (root === "instance") scope = ctx.instance;
    else if (root === "project") scope = ctx.project;

    if (scope === undefined) {
      throw new TemplateVariableUnresolvedError(ref);
    }

    return lookup(scope, rest, ref);
  });
}

const MD_LINK_RE = /(\!?\[[^\]]*\]\()(\.\.?\/[^)\s]+)(\))/g;

export function rewriteAssetPaths(
  body: string,
  sourceDir: string,
  targetDir: string,
): string {
  if (sourceDir === targetDir) return body;
  return body.replace(MD_LINK_RE, (_match, open, ref, close) => {
    const resolved = path.resolve(sourceDir, ref);
    const rewritten = path.relative(targetDir, resolved);
    const normalized =
      rewritten.startsWith(".") || rewritten.startsWith("/")
        ? rewritten
        : `./${rewritten}`;
    return `${open}${normalized}${close}`;
  });
}
