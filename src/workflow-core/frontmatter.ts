import { parse as parseYaml } from "yaml";

export interface ParsedFrontmatter {
  meta: Record<string, unknown> | undefined;
  body: string;
}

const FENCE = "---";

/**
 * Parse YAML frontmatter from a document. The frontmatter must be the
 * very first thing in the file, bracketed by `---` fences on their own
 * lines. Returns `meta: undefined` when no frontmatter is present.
 */
export function parseFrontmatter(text: string): ParsedFrontmatter {
  if (!text.startsWith(FENCE + "\n") && !text.startsWith(FENCE + "\r\n")) {
    return { meta: undefined, body: text };
  }
  const firstNewline = text.indexOf("\n");
  const rest = text.slice(firstNewline + 1);
  const closeIdx = rest.search(/^---\s*$/m);
  if (closeIdx < 0) {
    return { meta: undefined, body: text };
  }
  const yamlText = rest.slice(0, closeIdx);
  const after = rest.slice(closeIdx);
  const afterNewline = after.indexOf("\n");
  const body = afterNewline >= 0 ? after.slice(afterNewline + 1) : "";

  let meta: Record<string, unknown> | undefined;
  try {
    const parsed = parseYaml(yamlText);
    meta =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : undefined;
  } catch {
    meta = undefined;
  }
  return { meta, body };
}
