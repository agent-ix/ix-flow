import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadSkill } from "../src/workflow-core/plugin";

const workflowDefinition = `name: example
version: 0.1.0
initialPhase: start
phases:
  - { name: start, terminal: true }
transitions: []
`;

function createSkill(frontmatter: string): string {
  const root = mkdtempSync(join(tmpdir(), "ix-flow-skill-"));
  mkdirSync(join(root, "workflows", "example"), { recursive: true });
  writeFileSync(
    join(root, "SKILL.md"),
    `---\n${frontmatter}---\n\n# Example\n`,
  );
  writeFileSync(
    join(root, "workflows", "example", "def.yaml"),
    workflowDefinition,
  );
  return root;
}

describe("loadSkill workflow metadata", () => {
  test("loads standard Agent/Codex metadata", async () => {
    const root = createSkill(
      "name: example\ndescription: Example workflow.\nmetadata:\n  ix-flow-workflows: ./workflows\n",
    );

    try {
      const plugin = await loadSkill(root);

      expect(plugin.workflows.map(({ def }) => def.name)).toEqual(["example"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("continues to load legacy contributes.workflows metadata", async () => {
    const root = createSkill(
      "name: example\ndescription: Example workflow.\ncontributes:\n  workflows: ./workflows\n",
    );

    try {
      const plugin = await loadSkill(root);

      expect(plugin.workflows.map(({ def }) => def.name)).toEqual(["example"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("accepts matching standard and legacy workflow declarations", async () => {
    const root = createSkill(
      "name: example\ndescription: Example workflow.\nmetadata:\n  ix-flow-workflows: ./workflows\ncontributes:\n  workflows: ./workflows\n",
    );

    try {
      const plugin = await loadSkill(root);

      expect(plugin.workflows.map(({ def }) => def.name)).toEqual(["example"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("rejects conflicting standard and legacy workflow declarations", async () => {
    const root = createSkill(
      "name: example\ndescription: Example workflow.\nmetadata:\n  ix-flow-workflows: ./workflows\ncontributes:\n  workflows: ./other-workflows\n",
    );

    try {
      await expect(loadSkill(root)).rejects.toMatchObject({
        code: "skill_format_invalid",
        message:
          "SKILL.md frontmatter declarations 'metadata.ix-flow-workflows' and legacy 'contributes.workflows' must match",
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("reports both supported declarations when workflow metadata is missing", async () => {
    const root = createSkill("name: example\ndescription: Example workflow.\n");

    try {
      await expect(loadSkill(root)).rejects.toMatchObject({
        code: "skill_format_invalid",
        message:
          "SKILL.md frontmatter must declare 'metadata.ix-flow-workflows: <relative-dir>' or legacy 'contributes.workflows: <relative-dir>'",
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
