import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createLivePlan, executeLivePilot } from "./live.mjs";
import {
  aggregateLayeredLiveResults,
  assessOverallLiveEfficiency,
  evaluateLayeredStaticCases,
  renderLayeredReport,
  summarizeStaticCases,
  validateLayeredSuite
} from "./layered.mjs";
import { loadLiveDefinition } from "./run-live.mjs";
import {
  createFilesystemSource,
  deriveCandidateRoutes,
  evaluateStatic,
  readJson,
  scoreCandidate
} from "./score.mjs";
import { evaluationContract } from "./evaluation-contract.mjs";

const evaluatorRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(evaluatorRoot, "../..");
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
    repetitions: 3,
    variant: DEFAULT_VARIANT
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--execute") options.execute = true;
    else if (arg === "--json") options.json = true;
    else if (["--repetitions", "--model", "--variant"].includes(arg)) {
      const value = optionValue(args, index, arg);
      index += 1;
      if (arg === "--repetitions") options.repetitions = Number(value);
      if (arg === "--model") options.model = value;
      if (arg === "--variant") options.variant = value;
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

function evaluateCandidateStatic(source) {
  const baseline = readJson(join(evaluatorRoot, "baselines/v2.5.json"));
  const report = evaluateStatic({
    source,
    routes: deriveCandidateRoutes(source, baseline),
    safetyCases: readJson(join(evaluatorRoot, "cases/candidate-safety.json")).cases,
    normativeRules: readJson(join(evaluatorRoot, "cases/candidate-normative-rules.json")).rules,
    packageFiles: [...evaluationContract.candidatePackageFiles],
    contract: evaluationContract
  });
  return { report, candidateFailures: scoreCandidate(report, baseline) };
}

export async function runLayeredEvaluation(options, executePilot = executeLivePilot) {
  const suite = validateLayeredSuite(readJson(join(evaluatorRoot, "cases/layered-suite.json")));
  const source = createFilesystemSource(repositoryRoot);
  const candidate = evaluateCandidateStatic(source);
  const cases = evaluateLayeredStaticCases({ source, report: candidate.report, suite });
  const summary = summarizeStaticCases(cases);
  const staticPassed = summary.failed === 0 && candidate.candidateFailures.length === 0;
  const definitions = suite.representativeLiveRoutes.map((routeId) => ({
    routeId,
    ...loadLiveDefinition(routeId)
  }));
  const plannedInvocations = suite.representativeLiveRoutes.length * options.repetitions * 4;
  const plans = definitions.map((definition) => createLivePlan({
    route: definition.routeId,
    repetitions: options.repetitions,
    model: options.model,
    variant: options.variant,
    baselineBundle: definition.baselineBundle,
    candidateBundle: definition.candidateBundle
  }));
  const shouldExecute = options.execute && staticPassed;
  const liveSuites = [];
  if (shouldExecute) {
    for (const definition of definitions) {
      liveSuites.push(await executePilot({
        route: definition.routeId,
        repetitions: options.repetitions,
        model: options.model,
        variant: options.variant,
        baselineBundle: definition.baselineBundle,
        candidateBundle: definition.candidateBundle,
        expectedPlannedChildDispatchCount: definition.expectedPlannedChildDispatchCount
      }));
    }
  } else {
    liveSuites.push(...plans);
  }
  const livePassed = shouldExecute && liveSuites.every((result) => result.status === "completed");
  const aggregate = shouldExecute ? aggregateLayeredLiveResults(liveSuites) : null;
  const efficiency = aggregate ? assessOverallLiveEfficiency(aggregate) : null;
  return {
    schemaVersion: 1,
    evidenceType: "static-contracts-and-input-cost; not delivery behavior",
    releaseReadiness: "not-assessed",
    status: !staticPassed ? "failed-static" : !shouldExecute ? "dry-run" : !livePassed ? "failed-hard-gates" : efficiency.status !== "pass" ? "failed-efficiency" : "completed",
    static: {
      status: staticPassed ? "passed" : "failed",
      summary,
      cases,
      candidateFailures: candidate.candidateFailures
    },
    live: {
      executed: shouldExecute,
      executionBlockedByStaticFailure: options.execute && !staticPassed,
      routes: suite.representativeLiveRoutes,
      repetitions: options.repetitions,
      plannedInvocations,
      model: options.model,
      variant: options.variant,
      suites: liveSuites,
      aggregate,
      efficiency
    }
  };
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write("Usage: node tests/eval/run-layered.mjs [--repetitions <n>] [--model <provider/model>] [--variant <name>] [--execute] [--json]\n");
    return;
  }
  const result = await runLayeredEvaluation(options);
  process.stdout.write(options.json ? `${JSON.stringify(result, null, 2)}\n` : renderLayeredReport(result));
  if (result.status !== "completed" && result.status !== "dry-run") process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    process.stderr.write(`Layered evaluation failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
