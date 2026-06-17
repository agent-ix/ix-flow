import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

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

/** Write a skill directory from a {relativePath: content} map. */
function writeSkill(root: string, files: Record<string, string>): void {
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
}

function runIdFrom(lines: string[]): string {
  const line = lines.find((l) => l.startsWith("run: "));
  return line?.slice("run: ".length) as string;
}

test("FR-010: an artifact template renders on phase entry", async () => {
  const work = mkdtempSync(join(tmpdir(), "ixflow-tpl-"));
  const skill = join(work, "skill");
  const stateDir = join(work, "flows"); // projectRoot becomes `work`
  writeSkill(skill, {
    "SKILL.md": `---\nname: tpl\ndescription: template demo\ncontributes:\n  workflows: ./workflows\n---\n# tpl\n`,
    "workflows/tpl/def.yaml": `name: tpl
version: 0.1.0
initialPhase: draft
phases:
  - { name: draft }
  - { name: rendered, terminal: true }
transitions:
  - { from: draft, to: rendered, defaultGate: auto }
artifactTemplates:
  note:
    source: templates/note.md
    target: out/note.md
    phase: rendered
`,
    "templates/note.md": "# Note for ${instance.id}\n",
  });
  const cap = captureLog();
  const priorExitCode = process.exitCode;
  try {
    await main(["run", "tpl", "--path", skill, "--state-dir", stateDir]);
    const id = runIdFrom(cap.lines);
    cap.lines.length = 0;
    await main(["advance", id, "rendered", "--state-dir", stateDir]);
    const rendered = readFileSync(join(work, "out", "note.md"), "utf8");
    expect(rendered).toContain(`Note for ${id}`);
  } finally {
    cap.restore();
    process.exitCode = priorExitCode;
    rmSync(work, { recursive: true, force: true });
  }
});

test("FR-015: a custom invariant from scripts/invariants.js gates a transition", async () => {
  const work = mkdtempSync(join(tmpdir(), "ixflow-inv-"));
  const skill = join(work, "skill");
  const stateDir = join(work, "flows");
  writeSkill(skill, {
    "SKILL.md": `---\nname: inv\ndescription: invariant demo\ncontributes:\n  workflows: ./workflows\n---\n# inv\n`,
    "workflows/inv/def.yaml": `name: inv
version: 0.1.0
initialPhase: open
phases:
  - { name: open }
  - { name: closed, terminal: true }
itemSchemas:
  note: {}
transitions:
  - { from: open, to: closed, invariants: ["has_note"], defaultGate: auto }
`,
    "scripts/invariants.js": `export const invariants = {
  has_note: ({ instance }) =>
    (instance.items.note?.length ?? 0) > 0 || { ok: false, code: "note_required" },
};
`,
  });
  const cap = captureLog();
  const priorExitCode = process.exitCode;
  try {
    await main(["run", "inv", "--path", skill, "--state-dir", stateDir]);
    const id = runIdFrom(cap.lines);

    // The custom invariant blocks the transition until a note exists.
    cap.lines.length = 0;
    await main(["advance", id, "closed", "--state-dir", stateDir]);
    expect(cap.lines.join("\n")).toContain("note_required");
    process.exitCode = priorExitCode;

    cap.lines.length = 0;
    await main([
      "add-item",
      id,
      "note",
      "--item",
      '{"id":"n1"}',
      "--state-dir",
      stateDir,
    ]);
    cap.lines.length = 0;
    await main(["advance", id, "closed", "--state-dir", stateDir]);
    expect(cap.lines.join("\n")).toContain("phase: closed");
  } finally {
    cap.restore();
    process.exitCode = priorExitCode;
    rmSync(work, { recursive: true, force: true });
  }
});

test("FR-015: an unregistered invariant fails with transition_invariant_unregistered", async () => {
  const work = mkdtempSync(join(tmpdir(), "ixflow-unreg-"));
  const skill = join(work, "skill");
  const stateDir = join(work, "flows");
  writeSkill(skill, {
    "SKILL.md": `---\nname: unreg\ndescription: unregistered invariant\ncontributes:\n  workflows: ./workflows\n---\n# unreg\n`,
    "workflows/unreg/def.yaml": `name: unreg
version: 0.1.0
initialPhase: open
phases:
  - { name: open }
  - { name: closed, terminal: true }
transitions:
  - { from: open, to: closed, invariants: ["does_not_exist"], defaultGate: auto }
`,
  });
  const cap = captureLog();
  const priorExitCode = process.exitCode;
  try {
    await main(["run", "unreg", "--path", skill, "--state-dir", stateDir]);
    const id = runIdFrom(cap.lines);
    cap.lines.length = 0;
    await main(["advance", id, "closed", "--state-dir", stateDir]);
    expect(cap.lines.join("\n")).toContain("transition_invariant_unregistered");
  } finally {
    cap.restore();
    process.exitCode = priorExitCode;
    rmSync(work, { recursive: true, force: true });
  }
});

test("FR-007: a followUpIf question surfaces in interview_followups after a transition", async () => {
  const work = mkdtempSync(join(tmpdir(), "ixflow-followup-"));
  const skill = join(work, "skill");
  const stateDir = join(work, "flows");
  writeSkill(skill, {
    "SKILL.md": `---\nname: iv\ndescription: follow-up demo\ncontributes:\n  workflows: ./workflows\n---\n# iv\n`,
    "workflows/iv/def.yaml": `name: iv
version: 0.1.0
initialPhase: a
phases:
  - { name: a }
  - { name: b }
  - { name: c, terminal: true }
itemSchemas:
  ans: {}
interviews:
  q:
    itemType: ans
    completenessRule: all_required
    questions:
      - { key: title, prompt: "Title?", type: text, required: true }
      - { key: extras, prompt: "Anything else?", type: text, required: false, followUpIf: nonEmpty }
transitions:
  - { from: a, to: b, invariants: ["interview.complete:q"], defaultGate: auto }
  - { from: b, to: c, invariants: ["interview.complete:q"], defaultGate: auto }
`,
  });
  const cap = captureLog();
  const priorExitCode = process.exitCode;
  try {
    await main(["run", "iv", "--path", skill, "--state-dir", stateDir]);
    const id = runIdFrom(cap.lines);
    await main([
      "record-answers",
      id,
      "q",
      "--answers",
      '{"title":"t","extras":"more detail"}',
      "--state-dir",
      stateDir,
    ]);
    cap.lines.length = 0;
    await main(["advance", id, "b", "--state-dir", stateDir, "--json"]);
    const envelope = JSON.parse(cap.lines.join("\n"));
    const followups = envelope.interview_followups ?? [];
    expect(
      followups.map((f: { questionKey: string }) => f.questionKey),
    ).toContain("extras");
  } finally {
    cap.restore();
    process.exitCode = priorExitCode;
    rmSync(work, { recursive: true, force: true });
  }
});
