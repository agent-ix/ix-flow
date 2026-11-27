import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { trace } from "@agent-ix/ix-trace-ts/vitest";
import { describe, expect, test } from "vitest";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const readJson = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(resolve(root, path), "utf8")) as Record<
    string,
    unknown
  >;

describe("plugin hook configs", () => {
  test("keeps Claude mod modules and gives Codex its supported hooks config", () => {
    trace("FR-001-AC-2");

    // Claude loads its mod module from hooks.json; Codex requires its own
    // hooks-only file because it does not implement Claude Code mods.
    const claudeHooks = readJson("hooks/hooks.json");
    expect(claudeHooks.modules).toEqual(["./register.ts"]);
    expect(existsSync(resolve(root, "hooks/register.ts"))).toBe(true);

    const codexPlugin = readJson(".codex-plugin/plugin.json");
    expect(codexPlugin.hooks).toBe("./hooks/codex-hooks.json");

    const codexHooks = readJson("hooks/codex-hooks.json");
    expect(
      Object.keys(codexHooks).every((key) =>
        ["description", "hooks"].includes(key),
      ),
    ).toBe(true);
    expect(codexHooks.hooks).toEqual({});
  });
});
