// Binary + sibling-package resolution for the ix-flow eval harness.
//
// The harness drives the REAL `claude` agent (via agent-pty) through the `ix-flow`
// CLI + workflow skills, so it needs to locate two things that are NOT npm
// dependencies of this package:
//   - agent-pty's built dist (sibling checkout, dynamically imported)
//   - this repo's own `ix-flow` bin
// It then builds a shim PATH so the spawned agent's bare `ix-flow` command
// resolves to exactly this checkout's build, regardless of global install state.
// (`ix-flow` is self-contained — no quire, no schema provisioning.)

import { existsSync, mkdirSync, rmSync, symlinkSync, chmodSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** ix-flow repo root (this file lives at evals/lib/resolve.mjs). */
export function repoRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

export function evalsRoot() {
  return join(repoRoot(), "evals");
}

/** Absolute path to this repo's ix-flow entry (needs `dist/` built). */
export function ixFlowBin() {
  const bin = join(repoRoot(), "bin", "ix-flow.js");
  const dist = join(repoRoot(), "dist", "cli.js");
  if (!existsSync(dist)) {
    throw new Error(
      `ix-flow is not built: ${dist} missing. Run \`make build\` first.`,
    );
  }
  return bin;
}

/** Dynamically import agent-pty from its sibling built dist (never an npm dep). */
export async function findAgentPty() {
  const entry = resolve(repoRoot(), "..", "agent-pty", "dist", "index.js");
  if (!existsSync(entry)) {
    throw new Error(
      `agent-pty build missing at ${entry}. ` +
        "Run `make build` (or `pnpm build`) in ../agent-pty.",
    );
  }
  return { mod: await import(pathToFileURL(entry).href), entry };
}

/**
 * Build a shim bin dir holding `ix-flow` -> this repo's bin, so the spawned
 * agent's bare `ix-flow` command is pinned to this checkout. Returns the dir;
 * prepend it to PATH. `claude` comes from the inherited PATH.
 */
export function shimDir() {
  const dir = join(evalsRoot(), ".bin");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  link(join(dir, "ix-flow"), ixFlowBin());
  return dir;
}

function link(linkPath, target) {
  symlinkSync(target, linkPath);
  try {
    chmodSync(target, 0o755);
  } catch {
    // target may be read-only or already executable; the symlink still resolves.
  }
}

/** PATH string with the shim dir prepended. */
export function binPaths(shim = shimDir()) {
  return `${shim}:${process.env.PATH ?? ""}`;
}
