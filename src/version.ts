import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Return the package version that identifies this executable and its envelopes. */
export function packageVersion(): string {
  const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
  const packageJson = JSON.parse(
    readFileSync(join(packageRoot, "package.json"), "utf8"),
  ) as { version?: unknown };
  if (typeof packageJson.version !== "string") {
    throw new Error("package.json version is missing");
  }
  return packageJson.version;
}
