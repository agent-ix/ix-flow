import { existsSync, readdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import { parseWorkflowDef, type PinnedWorkflowDef } from "./definition.js";
import { WorkflowCoreError } from "./errors.js";
import type { InvariantEvaluator } from "./transition.js";

export interface Workflow {
  def: PinnedWorkflowDef;
  invariants: Record<string, InvariantEvaluator>;
}

export interface WorkflowPlugin {
  workflows: Workflow[];
}

interface SkillFrontmatter {
  contributes?: { workflows?: string };
}

export async function loadSkill(skillPath: string): Promise<WorkflowPlugin> {
  const root = resolve(skillPath);
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    throw new WorkflowCoreError(
      "skill_not_found",
      `Skill directory not found: ${skillPath}`,
      { path: skillPath },
    );
  }

  const skillMdPath = join(root, "SKILL.md");
  if (!existsSync(skillMdPath)) {
    throw new WorkflowCoreError(
      "skill_format_invalid",
      `Skill is missing SKILL.md at ${skillMdPath}`,
      { path: skillPath },
    );
  }

  const md = await readFile(skillMdPath, "utf8");
  const frontmatter = parseFrontmatter(md, skillMdPath);
  const workflowsRel = frontmatter?.contributes?.workflows;
  if (typeof workflowsRel !== "string" || workflowsRel.length === 0) {
    throw new WorkflowCoreError(
      "skill_format_invalid",
      `SKILL.md frontmatter must declare 'contributes.workflows: <relative-dir>'`,
      { path: skillMdPath },
    );
  }

  const workflowsDir = resolve(root, workflowsRel);
  if (!existsSync(workflowsDir) || !statSync(workflowsDir).isDirectory()) {
    throw new WorkflowCoreError(
      "skill_format_invalid",
      `Workflows directory not found at ${workflowsDir}`,
      { path: workflowsDir },
    );
  }

  const scriptInvariants = await loadSkillInvariants(root);

  // Filter to directories, tolerating dangling symlinks and other entries
  // we can't stat. `statSync` follows symlinks and throws on broken
  // targets; swallow that into the same "not a directory" bucket.
  const subdirs = readdirSync(workflowsDir).filter((entry) => {
    try {
      return statSync(join(workflowsDir, entry)).isDirectory();
    } catch {
      return false;
    }
  });

  const workflows: Workflow[] = [];
  for (const name of subdirs) {
    const defPath = join(workflowsDir, name, "def.yaml");
    if (!existsSync(defPath)) continue;
    const yamlText = await readFile(defPath, "utf8");
    let raw: unknown;
    try {
      raw = parseYaml(yamlText);
    } catch (err) {
      throw new WorkflowCoreError(
        "definition_yaml_parse_failed",
        `Failed to parse YAML at ${defPath}: ${(err as Error).message}`,
        { path: defPath },
      );
    }
    let def: PinnedWorkflowDef;
    try {
      def = parseWorkflowDef(raw);
    } catch (err) {
      throw new WorkflowCoreError(
        "definition_schema_invalid",
        `Workflow definition at ${defPath} did not match WorkflowDef schema: ${(err as Error).message}`,
        { path: defPath },
      );
    }
    workflows.push({ def, invariants: scriptInvariants });
  }

  return { workflows };
}

async function loadSkillInvariants(
  skillRoot: string,
): Promise<Record<string, InvariantEvaluator>> {
  const scriptsDir = join(skillRoot, "scripts");
  if (!existsSync(scriptsDir) || !statSync(scriptsDir).isDirectory()) {
    return {};
  }

  const invariantsFiles = readdirSync(scriptsDir).filter((entry) =>
    /^invariants\.[^.]+$/.test(entry),
  );
  const nonJs = invariantsFiles.filter((entry) => entry !== "invariants.js");
  if (nonJs.length > 0) {
    throw new WorkflowCoreError(
      "skill_script_unsupported",
      `Skill 'scripts/' contains unsupported invariant files: ${nonJs.join(", ")}. Only 'invariants.js' (ESM) is supported.`,
      { files: nonJs, path: scriptsDir },
    );
  }

  const invariantsPath = join(scriptsDir, "invariants.js");
  if (!existsSync(invariantsPath)) return {};

  let mod: unknown;
  try {
    mod = await import(pathToFileURL(invariantsPath).href);
  } catch (err) {
    throw new WorkflowCoreError(
      "skill_script_load_failed",
      `Failed to load ${invariantsPath}: ${(err as Error).message}`,
      { path: invariantsPath },
    );
  }

  const exported = (mod as { invariants?: unknown }).invariants;
  if (
    exported === undefined ||
    exported === null ||
    typeof exported !== "object" ||
    Array.isArray(exported)
  ) {
    throw new WorkflowCoreError(
      "skill_script_invalid_shape",
      `${invariantsPath} must export an 'invariants' object mapping names to InvariantEvaluator functions.`,
      { path: invariantsPath },
    );
  }
  for (const [key, value] of Object.entries(
    exported as Record<string, unknown>,
  )) {
    if (typeof value !== "function") {
      throw new WorkflowCoreError(
        "skill_script_invalid_shape",
        `${invariantsPath}: entry '${key}' is not a function.`,
        { path: invariantsPath, key },
      );
    }
  }
  return exported as Record<string, InvariantEvaluator>;
}

function parseFrontmatter(
  md: string,
  path: string,
): SkillFrontmatter | undefined {
  if (!md.startsWith("---")) return undefined;
  const end = md.indexOf("\n---", 3);
  if (end < 0) return undefined;
  const yamlText = md.slice(3, end).replace(/^\r?\n/, "");
  let parsed: unknown;
  try {
    parsed = parseYaml(yamlText);
  } catch (err) {
    throw new WorkflowCoreError(
      "skill_format_invalid",
      `SKILL.md frontmatter is not valid YAML at ${path}: ${(err as Error).message}`,
      { path },
    );
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return undefined;
  }
  return parsed as SkillFrontmatter;
}
