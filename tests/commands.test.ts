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

async function runIntake(stateDir: string, cap: { lines: string[] }) {
  await main([
    "run",
    "intake",
    "--path",
    "examples/intake",
    "--state-dir",
    stateDir,
  ]);
  const runLine = cap.lines.find((line) => line.startsWith("run: "));
  return runLine?.slice("run: ".length) as string;
}

test("status, resume, and history report a run", async () => {
  const stateDir = mkdtempSync(join(tmpdir(), "ixflow-inspect-"));
  const priorExitCode = process.exitCode;
  const cap = captureLog();
  try {
    const id = await runIntake(stateDir, cap);

    cap.lines.length = 0;
    await main(["status", id, "--state-dir", stateDir]);
    expect(cap.lines.join("\n")).toContain("phase: collecting");

    cap.lines.length = 0;
    await main(["resume", id, "--state-dir", stateDir]);
    const resumeOut = cap.lines.join("\n");
    expect(resumeOut).toContain("phase: collecting");
    expect(resumeOut).toContain("Resume this run");

    cap.lines.length = 0;
    await main(["history", id, "--state-dir", stateDir, "--json"]);
    const envelope = JSON.parse(cap.lines.join("\n"));
    expect(Array.isArray(envelope.data)).toBe(true);
    expect(envelope.data.length).toBeGreaterThan(0);
  } finally {
    cap.restore();
    process.exitCode = priorExitCode;
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("record-answers lets an interview-gated transition pass, then a recipe finishes", async () => {
  const stateDir = mkdtempSync(join(tmpdir(), "ixflow-cmd-"));
  const priorExitCode = process.exitCode;
  const cap = captureLog();
  try {
    const id = await runIntake(stateDir, cap);
    expect(id).toBeTruthy();

    // The interview gate blocks the transition until answers are recorded.
    await main(["advance", id, "drafting", "--state-dir", stateDir]);
    expect(cap.lines.join("\n")).toContain("invariant");
    process.exitCode = priorExitCode;

    cap.lines.length = 0;
    await main([
      "record-answers",
      id,
      "request",
      "--answers",
      '{"title":"New widget","summary":"Add a widget"}',
      "--state-dir",
      stateDir,
    ]);
    expect(cap.lines.join("\n")).toContain("record-answers: ok");

    cap.lines.length = 0;
    await main(["advance", id, "drafting", "--state-dir", stateDir]);
    expect(cap.lines.join("\n")).toContain("phase: drafting");

    cap.lines.length = 0;
    await main(["recipe", id, "finish", "--state-dir", stateDir]);
    const recipeOut = cap.lines.join("\n");
    expect(recipeOut).toContain("phase: done");
    expect(recipeOut).toContain("step 0: advance -> ok");

    cap.lines.length = 0;
    await main(["verify", id, "--state-dir", stateDir]);
    expect(cap.lines.join("\n")).toContain("chain: intact");
  } finally {
    cap.restore();
    process.exitCode = priorExitCode;
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("add-item, update-item, and link-items mutate a run", async () => {
  const stateDir = mkdtempSync(join(tmpdir(), "ixflow-items-"));
  const priorExitCode = process.exitCode;
  const cap = captureLog();
  try {
    const id = await runIntake(stateDir, cap);

    cap.lines.length = 0;
    await main([
      "add-item",
      id,
      "note",
      "--item",
      '{"id":"n1","text":"hello"}',
      "--state-dir",
      stateDir,
    ]);
    expect(cap.lines.join("\n")).toContain("add-item: ok");

    cap.lines.length = 0;
    await main([
      "update-item",
      id,
      "note",
      "n1",
      "--patch",
      '{"text":"updated"}',
      "--state-dir",
      stateDir,
    ]);
    expect(cap.lines.join("\n")).toContain("update-item: ok");

    cap.lines.length = 0;
    await main([
      "link-items",
      id,
      "--link",
      '{"from":"n1","to":"request"}',
      "--state-dir",
      stateDir,
    ]);
    expect(cap.lines.join("\n")).toContain("link-items: ok");
  } finally {
    cap.restore();
    process.exitCode = priorExitCode;
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("malformed --item JSON raises a usage error", async () => {
  const stateDir = mkdtempSync(join(tmpdir(), "ixflow-badjson-"));
  const cap = captureLog();
  try {
    const id = await runIntake(stateDir, cap);
    await expect(
      main([
        "add-item",
        id,
        "note",
        "--item",
        "not-json",
        "--state-dir",
        stateDir,
      ]),
    ).rejects.toThrow(/not valid JSON/);
  } finally {
    cap.restore();
    rmSync(stateDir, { recursive: true, force: true });
  }
});
