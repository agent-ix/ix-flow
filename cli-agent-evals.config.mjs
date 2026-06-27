import { defineSuite } from "../cli-agent-evals/dist/index.js";
import { makeScenarioWorkspace } from "./evals/lib/env.mjs";
import { buildTaskBrief, kickoffLine } from "./evals/lib/prompt.mjs";
import { assertExpectations } from "./evals/lib/assert.mjs";
import { extractMetrics } from "./evals/lib/metrics.mjs";
import { shimDir } from "./evals/lib/resolve.mjs";
import { selectScenarios, SCENARIOS } from "./evals/scenarios/index.mjs";

export default defineSuite({
  name: "ix-flow",
  rootDir: import.meta.dirname,
  scenarios: SCENARIOS,
  workspace(scenario, suite) {
    const ctx = makeScenarioWorkspace(scenario);
    ctx.workDir = ctx.work;
    ctx.reportDir = `${suite.rootDir}/evals/reports`;
    return ctx;
  },
  buildTaskBrief,
  kickoffLine,
  shimPath: () => shimDir(),
  agents: {
    claude: {
      parseMetrics: extractMetrics,
    },
  },
  assert(ctx, scenario, run) {
    return assertExpectations(ctx, scenario.expect ?? {}, run);
  },
  selectScenarios,
});
