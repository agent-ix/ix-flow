import { main } from "../src";

test("exports the ix-flow CLI entrypoint", () => {
  expect(typeof main).toBe("function");
});

test("ix-flow does not import split workflow runtime packages", async () => {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const url = await import("node:url");
  const repoRoot = path.dirname(
    path.dirname(url.fileURLToPath(import.meta.url)),
  );
  const cli = await fs.readFile(path.join(repoRoot, "src", "cli.ts"), "utf8");
  expect(cli).not.toContain("@agent-ix/workflow-cli-plugin");
  expect(cli).not.toContain("@agent-ix/workflow-core");
});
