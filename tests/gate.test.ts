import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { main } from "../src/cli";

function captureLog(): { lines: string[]; restore: () => void } {
  const lines: string[] = [];
  const log = vi.spyOn(console, "log").mockImplementation((message) => {
    lines.push(String(message));
  });
  const err = vi.spyOn(console, "error").mockImplementation((message) => {
    lines.push(String(message));
  });
  return {
    lines,
    restore: () => {
      log.mockRestore();
      err.mockRestore();
    },
  };
}

test("a deferred human gate prints the gate token in human mode and exits 0", async () => {
  const stateDir = mkdtempSync(join(tmpdir(), "ixflow-gate-"));
  const priorExitCode = process.exitCode;
  const cap = captureLog();
  try {
    await main([
      "run",
      "release",
      "--path",
      "examples/release",
      "--state-dir",
      stateDir,
    ]);
    const runLine = cap.lines.find((line) => line.startsWith("run: "));
    const id = runLine?.slice("run: ".length);
    expect(id).toBeTruthy();

    await main(["advance", id!, "in_review", "--state-dir", stateDir]);

    cap.lines.length = 0;
    await main(["advance", id!, "approved", "--state-dir", stateDir]);

    const output = cap.lines.join("\n");
    expect(output).toContain("advance: gate_deferred");
    expect(output).toMatch(/gate: ack_[\w-]+ \(to approved\)/);
    // A deferred gate is expected, not an error.
    expect(output).not.toContain("workflow command failed");
    expect(process.exitCode ?? 0).toBe(0);
  } finally {
    cap.restore();
    process.exitCode = priorExitCode;
    rmSync(stateDir, { recursive: true, force: true });
  }
});
