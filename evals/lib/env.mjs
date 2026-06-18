// Per-scenario workspace: an isolated working dir + flow state-dir, a pinned run
// id, a pre-generated session id, and the predetermined Claude Code transcript
// path. ix-flow needs no schema provisioning — a run is just an isolated
// `--state-dir`.

import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";

import { evalsRoot, repoRoot } from "./resolve.mjs";

/**
 * Claude Code's project-dir slug for a cwd: every non-alphanumeric character
 * becomes `-`, case preserved. (Verified against live transcript dir names.)
 */
export function slug(absPath) {
  return absPath.replace(/[^a-zA-Z0-9]/g, "-");
}

/** Where Claude Code writes the transcript for a session run in `cwd`. */
export function transcriptPathFor(cwd, sessionId) {
  return join(
    homedir(),
    ".claude",
    "projects",
    slug(cwd),
    `${sessionId}.jsonl`,
  );
}

/**
 * Absolute path to a fixture skill dir. `examples/...` resolves to the repo's
 * shipped examples; everything else resolves under `evals/fixtures`.
 */
export function fixturePath(rel) {
  if (rel.startsWith("examples/")) return resolve(repoRoot(), rel);
  return resolve(evalsRoot(), "fixtures", rel);
}

/**
 * Create an isolated workspace for one scenario run.
 *
 * - `cwd` is the agent's working dir (also the template/artifact project root,
 *   since the runner anchors path-mode bookkeeping at the state-dir parent).
 * - `stateDir` is the flow store root (`--state-dir`); runs land under
 *   `stateDir/instances/<id>.json`.
 * - `runId` is pinned (lowercased scenario id) so the harness can assert and ack
 *   gates without scraping it from the transcript.
 * @returns {{ id, runId, work, cwd, stateDir, sessionId, transcriptPath, fixtureAbs, data, cleanup }}
 */
export function makeScenarioWorkspace(scenario) {
  const id = scenario.id;
  const work = mkdtempSync(join(tmpdir(), `ix-flow-${id.toLowerCase()}-`));
  // cwd === work so the runner's state-dir parent (template/artifact project
  // root) equals the agent's cwd; artifacts render under `work/out/...`.
  const cwd = work;
  const stateDir = join(work, "flows");
  mkdirSync(stateDir, { recursive: true });
  const sessionId = randomUUID();
  return {
    id,
    runId: id.toLowerCase(),
    work,
    cwd,
    stateDir,
    sessionId,
    transcriptPath: transcriptPathFor(cwd, sessionId),
    fixtureAbs: scenario.fixture ? fixturePath(scenario.fixture) : undefined,
    data: {}, // scratch for setup(ctx) -> prompt(ctx) handoff
    cleanup() {
      rmSync(work, { recursive: true, force: true });
    },
  };
}
