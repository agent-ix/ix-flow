import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
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

const workflowDeclarations = [
  { name: "standard", parent: "metadata", key: "ix-flow-workflows" },
  { name: "legacy", parent: "contributes", key: "workflows" },
];

function workflowFrontmatter(
  declaration: (typeof workflowDeclarations)[number],
  value: string,
): string {
  return `name: example\ndescription: Example workflow.\n${declaration.parent}:\n  ${declaration.key}: ${JSON.stringify(value)}\n`;
}

function writeSkillFrontmatter(root: string, frontmatter: string): void {
  writeFileSync(
    join(root, "SKILL.md"),
    `---\n${frontmatter}---\n\n# Example\n`,
  );
}

function createSkill(frontmatter: string): string {
  const root = mkdtempSync(join(tmpdir(), "ix-flow-skill-"));
  mkdirSync(join(root, "workflows", "example"), { recursive: true });
  writeSkillFrontmatter(root, frontmatter);
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

  test.each([
    {
      name: "null standard",
      declaration: "metadata.ix-flow-workflows",
      frontmatter:
        "metadata:\n  ix-flow-workflows: null\ncontributes:\n  workflows: ./workflows\n",
    },
    {
      name: "null legacy",
      declaration: "contributes.workflows",
      frontmatter:
        "metadata:\n  ix-flow-workflows: ./workflows\ncontributes:\n  workflows: null\n",
    },
    {
      name: "empty standard",
      declaration: "metadata.ix-flow-workflows",
      frontmatter:
        'metadata:\n  ix-flow-workflows: ""\ncontributes:\n  workflows: ./workflows\n',
    },
    {
      name: "empty legacy",
      declaration: "contributes.workflows",
      frontmatter:
        'metadata:\n  ix-flow-workflows: ./workflows\ncontributes:\n  workflows: ""\n',
    },
    {
      name: "non-string standard",
      declaration: "metadata.ix-flow-workflows",
      frontmatter:
        "metadata:\n  ix-flow-workflows: [./workflows]\ncontributes:\n  workflows: ./workflows\n",
    },
    {
      name: "non-string legacy",
      declaration: "contributes.workflows",
      frontmatter:
        "metadata:\n  ix-flow-workflows: ./workflows\ncontributes:\n  workflows: 42\n",
    },
  ])(
    "rejects an explicitly malformed $name declaration even when the other form is valid",
    async ({ declaration, frontmatter }) => {
      const root = createSkill(frontmatter);

      try {
        await expect(loadSkill(root)).rejects.toMatchObject({
          code: "skill_format_invalid",
          message: `SKILL.md frontmatter declaration '${declaration}' must be a non-empty string`,
        });
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  );

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

  test.each(workflowDeclarations)(
    "rejects an absolute path in a $name workflow declaration",
    async (declaration) => {
      const root = createSkill("");
      writeSkillFrontmatter(
        root,
        workflowFrontmatter(declaration, join(root, "workflows")),
      );

      try {
        await expect(loadSkill(root)).rejects.toMatchObject({
          code: "skill_format_invalid",
          message:
            "SKILL.md workflow directory must be a relative path contained within the skill",
        });
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  );

  test.each(workflowDeclarations)(
    "rejects parent traversal in a $name workflow declaration",
    async (declaration) => {
      const root = createSkill(
        workflowFrontmatter(declaration, "workflows/../workflows"),
      );

      try {
        await expect(loadSkill(root)).rejects.toMatchObject({
          code: "skill_format_invalid",
          message:
            "SKILL.md workflow directory must be a relative path contained within the skill",
        });
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  );

  test.each(workflowDeclarations)(
    "rejects a $name workflow directory symlink that resolves outside the skill",
    async (declaration) => {
      const root = createSkill(
        workflowFrontmatter(declaration, "linked-workflows"),
      );
      const external = mkdtempSync(join(tmpdir(), "ix-flow-external-"));
      mkdirSync(join(external, "example"));
      writeFileSync(join(external, "example", "def.yaml"), workflowDefinition);
      symlinkSync(external, join(root, "linked-workflows"), "dir");

      try {
        await expect(loadSkill(root)).rejects.toMatchObject({
          code: "skill_format_invalid",
          message:
            "SKILL.md workflow directory must be a relative path contained within the skill",
        });
      } finally {
        rmSync(root, { recursive: true, force: true });
        rmSync(external, { recursive: true, force: true });
      }
    },
  );
});
