import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildProtocolBundle,
  createLivePlan,
  executeLivePilot
} from "./live.mjs";
import {
  createFilesystemSource,
  createGitSource,
  deriveCandidateRoutes,
  frozenBaselineRoutes,
  readJson
} from "./score.mjs";

const evaluatorRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(evaluatorRoot, "../..");
const DEFAULT_ROUTE = "track-matching-named-agent";
const DEFAULT_MODEL = "vertexflow/gpt-5.6-terra";
const DEFAULT_VARIANT = "xhigh";

function optionValue(args, index, option) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${option} requires a value.`);
  return value;
}

export function parseArgs(args) {
  const options = {
    execute: false,
    json: false,
    model: DEFAULT_MODEL,
    repetitions: 1,
    route: DEFAULT_ROUTE,
    variant: DEFAULT_VARIANT
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--execute") options.execute = true;
    else if (arg === "--json") options.json = true;
    else if (["--route", "--repetitions", "--model", "--variant"].includes(arg)) {
      const value = optionValue(args, index, arg);
      index += 1;
      if (arg === "--route") options.route = value;
      if (arg === "--model") options.model = value;
      if (arg === "--variant") options.variant = value;
      if (arg === "--repetitions") options.repetitions = Number(value);
    } else if (arg === "--help") {
      return { help: true };
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  if (!Number.isInteger(options.repetitions) || options.repetitions < 1) {
    throw new Error("--repetitions must be a positive integer.");
  }
  return options;
}

function routeById(routes, id, side) {
  const route = routes.find((candidate) => candidate.id === id);
  if (!route) throw new Error(`${side} does not declare route ${id}.`);
  return route;
}

export function loadLiveDefinition(routeId) {
  const baseline = readJson(join(evaluatorRoot, "baselines/v2.5.json"));
  const baselineSource = createGitSource(repositoryRoot, baseline.revision);
  const candidateSource = createFilesystemSource(repositoryRoot);
  const baselineRoute = routeById(frozenBaselineRoutes(baseline), routeId, "Frozen baseline");
  const candidateRoute = routeById(deriveCandidateRoutes(candidateSource, baseline), routeId, "Candidate manifest");
  return {
    baselineBundle: buildProtocolBundle({ source: baselineSource, route: baselineRoute, side: "baseline" }),
    candidateBundle: buildProtocolBundle({ source: candidateSource, route: candidateRoute, side: "candidate" }),
    expectedPlannedChildDispatchCount: candidateRoute.expected?.dispatch ? 1 : 0
  };
}

function renderText(result) {
  if (result.status === "dry-run") {
    return [
      "Live A/B evaluation dry run.",
      "Non-executing: no model, OpenCode, network, or fixture calls were made.",
      `Route: ${result.route}; planned invocations: ${result.order.length}.`,
      "Pass --execute to run the pilot."
    ].join("\n");
  }
  const value = (metric) => metric ?? "unavailable";
  const lines = [
    `Live A/B evaluation ${result.status}.`,
    `Route: ${result.route}; completed invocations: ${result.runs.length}.`,
    "Per-run evidence:"
  ];
  for (const run of result.runs) {
    lines.push(
      `- ${run.repetition}/${run.side}: total provider tokens ${value(run.providerTokens.totalTokens)}; elapsed ${run.elapsedMs} ms; sessions ${run.sessionCount}; turns ${value(run.turns)}; tools ${run.toolCallCount}; task child calls ${run.taskToolChildCallCount}; declared child dispatches ${value(run.plannedChildDispatchCount)}; terminal ${value(run.terminalState)}; fixture ${run.fixture.clean ? "clean" : "DIRTY"}; hard gates ${run.hardGates.passed ? "passed" : run.hardGates.failures.join(", ")}.`
    );
  }
  for (const side of ["baseline", "candidate"]) {
    const aggregate = result.aggregate[side];
    lines.push(
      `${side}: total tokens median ${value(aggregate.totalTokens.median)}, P90 ${value(aggregate.totalTokens.p90)}; elapsed median ${value(aggregate.elapsedMs.median)} ms, P90 ${value(aggregate.elapsedMs.p90)} ms; actual task child calls ${value(aggregate.actualTaskToolChildCalls.total)}; declared child dispatches ${value(aggregate.declaredChildDispatches.total)}.`
    );
  }
  lines.push(
    `Reductions: median total tokens ${value(result.aggregate.reductions.medianTotalTokens.reduction)}; P90 total tokens ${value(result.aggregate.reductions.p90TotalTokens.reduction)}; median elapsed ${value(result.aggregate.reductions.medianElapsedMs.reduction)} ms; P90 elapsed ${value(result.aggregate.reductions.p90ElapsedMs.reduction)} ms; actual task child calls ${value(result.aggregate.reductions.actualTaskToolChildCalls.reduction)}; declared child dispatches ${value(result.aggregate.reductions.declaredChildDispatches.reduction)}.`,
    `Hard-gate failures: ${result.runs.filter((run) => !run.hardGates.passed).length}.`,
    result.releaseReadiness.reason
  );
  return lines.join("\n");
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write("Usage: node tests/eval/run-live.mjs [--route <id>] [--repetitions <n>] [--model <provider/model>] [--variant <name>] [--execute] [--json]\n");
    return;
  }
  const definition = loadLiveDefinition(options.route);
  const plan = createLivePlan({
    route: options.route,
    repetitions: options.repetitions,
    model: options.model,
    variant: options.variant,
    baselineBundle: definition.baselineBundle,
    candidateBundle: definition.candidateBundle
  });
  const result = options.execute
    ? await executeLivePilot({
      route: options.route,
      repetitions: options.repetitions,
      model: options.model,
      variant: options.variant,
      baselineBundle: definition.baselineBundle,
      candidateBundle: definition.candidateBundle,
      expectedPlannedChildDispatchCount: definition.expectedPlannedChildDispatchCount
    })
    : plan;
  process.stdout.write(options.json ? `${JSON.stringify(result, null, 2)}\n` : `${renderText(result)}\n`);
  if (options.execute && result.status !== "completed") process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    process.stderr.write(`Live evaluation failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
