import spawn from "cross-spawn";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WorkflowCommandRunner } from "../src/workflow-runner/runner";

const fixture = fileURLToPath(
  new URL("./fixtures/external-invariant-provider.mjs", import.meta.url),
);

// Trace: FR-022-AC-1, FR-022-AC-5, TC-007.
test.each([
  ["local", "absolute"],
  ["local", "path"],
  ["global", "absolute"],
  ["global", "path"],
])(
  "executes a %s npm-installed provider through a %s command",
  async (scope, kind) => {
    const work = mkdtempSync(join(tmpdir(), "ix-flow-npm-provider-"));
    const previousPath = process.env.PATH;
    try {
      const source = join(work, "source package");
      const prefix = join(work, "installed cli");
      const skill = join(work, "skill");
      const counter = join(work, "counter");
      const request = join(work, "request.json");
      mkdirSync(source);
      writeFileSync(
        join(source, "package.json"),
        JSON.stringify({
          name: "ix-flow-provider-test",
          version: "1.0.0",
          type: "module",
          bin: { "ix-flow-provider-test": "provider.mjs" },
        }),
      );
      writeFileSync(
        join(source, "provider.mjs"),
        "#!/usr/bin/env node\n" + readFileSync(fixture, "utf8"),
      );
      const npmrc = join(work, "public.npmrc");
      writeFileSync(npmrc, "registry=https://registry.npmjs.org/\n");
      const installed = spawn.sync(
        "npm",
        [
          "install",
          ...(scope === "global" ? ["--global"] : []),
          "--prefix",
          prefix,
          "--ignore-scripts",
          "--no-audit",
          "--no-fund",
          "--no-package-lock",
          source,
        ],
        {
          encoding: "utf8",
          env: {
            ...process.env,
            NPM_CONFIG_USERCONFIG: npmrc,
            NPM_CONFIG_CACHE: join(work, "npm-cache"),
            NPM_CONFIG_UPDATE_NOTIFIER: "false",
          },
        },
      );
      expect(installed.status, installed.stderr).toBe(0);
      const bin =
        scope === "global"
          ? process.platform === "win32"
            ? prefix
            : join(prefix, "bin")
          : join(prefix, "node_modules", ".bin");
      process.env.PATH = [bin, previousPath].filter(Boolean).join(delimiter);
      const command =
        kind === "path"
          ? "ix-flow-provider-test"
          : join(
              bin,
              "ix-flow-provider-test" +
                (process.platform === "win32" ? ".cmd" : ""),
            );
      mkdirSync(join(skill, "workflows", "npm"), { recursive: true });
      writeFileSync(
        join(skill, "SKILL.md"),
        `---\nname: npm-provider\nmetadata:\n  ix-flow-workflows: ./workflows\n  ix-flow-invariant-provider:\n    command: ${JSON.stringify(command)}\n    args: ${JSON.stringify(["ok", counter, request, "two words", "literal&value"])}\n    request-protocol: test.invariant-request/v1\n    result-protocol: test.invariant-result/v1\n    invariants: [external.pass]\n---\n# Npm provider\n`,
      );
      writeFileSync(
        join(skill, "workflows", "npm", "def.yaml"),
        "name: npm\nversion: 1.0.0\ninitialPhase: open\nphases:\n  - {name: open}\n  - {name: closed, terminal: true}\ntransitions:\n  - {from: open, to: closed, invariants: [external.pass], defaultGate: auto}\n",
      );
      const runner = new WorkflowCommandRunner({
        cwd: work,
        config: { stateDir: join(work, "state") },
      });
      const created = await runner.create({
        definitionName: "npm",
        skillPath: skill,
      });
      expect(created.ok).toBe(true);
      const result = await runner.advance({
        id: created.instance_id!,
        to: "closed",
      });
      expect(result, JSON.stringify(result)).toMatchObject({
        ok: true,
        current_phase: "closed",
      });
      expect(readFileSync(counter, "utf8")).toBe("invoked\n");
      expect(JSON.parse(readFileSync(`${request}.args`, "utf8"))).toEqual([
        "two words",
        "literal&value",
      ]);
      expect(JSON.parse(readFileSync(request, "utf8"))).toMatchObject({
        invariants: ["external.pass"],
      });
    } finally {
      if (previousPath === undefined) delete process.env.PATH;
      else process.env.PATH = previousPath;
      rmSync(work, { recursive: true, force: true });
    }
  },
  20_000,
);
