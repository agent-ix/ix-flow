import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

const [mode, counterPath = "-", requestPath = "-", ...extraArgs] =
  process.argv.slice(2);
const input = readFileSync(0, "utf8");

if (counterPath !== "-") appendFileSync(counterPath, "invoked\n");
if (requestPath !== "-") {
  writeFileSync(requestPath, input);
  writeFileSync(`${requestPath}.args`, JSON.stringify(extraArgs));
}

if (mode === "crash") process.kill(process.pid, "SIGTERM");
if (mode === "nonzero") process.exit(23);
if (mode === "timeout") {
  setTimeout(() => {}, 60_000);
} else if (mode === "oversized") {
  process.stdout.write("x".repeat(1024 * 1024 + 1));
} else if (mode === "malformed") {
  process.stdout.write("not-json\n");
} else {
  const request = JSON.parse(input);
  let outcomes = request.invariants.map((invariant) =>
    invariant.startsWith("external.fail")
      ? {
          invariant,
          status: "failed",
          code: "external_denied",
          details: { invariant },
        }
      : { invariant, status: "passed" },
  );
  let protocol = "test.invariant-result/v1";

  if (mode === "wrong-protocol") protocol = "test.invariant-result/v2";
  if (mode === "unknown-invariant") {
    outcomes = [{ invariant: "external.unknown", status: "passed" }];
  }
  if (mode === "missing-outcome") outcomes = outcomes.slice(0, -1);

  process.stdout.write(`${JSON.stringify({ protocol, outcomes })}\n`);
}
