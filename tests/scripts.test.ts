import { execFileSync } from "node:child_process";

import { main, packageVersion } from "../src/cli";

test("build-tools help exits successfully", () => {
  const output = execFileSync("node", ["scripts/build-tools.js", "--help"], {
    encoding: "utf8",
  });
  expect(output).toContain("Build Tools");
});

test("version flag prints package version", async () => {
  const output: string[] = [];
  const spy = vi.spyOn(console, "log").mockImplementation((message) => {
    output.push(String(message));
  });
  try {
    await main(["--version"]);
    await main(["version"]);
  } finally {
    spy.mockRestore();
  }
  expect(output).toEqual([packageVersion(), packageVersion()]);
});
