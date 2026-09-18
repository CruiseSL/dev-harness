import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  compareFrozenBaseline,
  createFilesystemSource,
  createGitSource,
  deriveCandidateRoutes,
  evaluateStatic,
  frozenBaselineRoutes,
  readJson,
  scoreCandidate
} from "./score.mjs";
import { renderStaticReport } from "./report.mjs";
import { evaluationContract } from "./evaluation-contract.mjs";

const evaluatorRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(evaluatorRoot, "../..");

function parseArgs(args) {
  const options = { json: false, baseline: null, compare: null, ref: null };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") options.json = true;
    else if (arg === "--baseline" || arg === "--compare" || arg === "--ref") {
      const value = args[index + 1];
      if (!value) throw new Error(`${arg} requires a value`);
      options[arg.slice(2)] = value;
      index += 1;
    } else if (arg === "--help") {
      console.log("Usage: node tests/eval/run-static.mjs [--baseline v2.5 | --compare v2.5 | --ref <git-ref>] [--json]");
      process.exit(0);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  if (options.baseline && options.compare) throw new Error("Use either --baseline or --compare, not both.");
  return options;
}

function loadInputs() {
  return {
    baselineSafetyCases: readJson(join(evaluatorRoot, "cases/safety.json")).cases,
    candidateSafetyCases: readJson(join(evaluatorRoot, "cases/candidate-safety.json")).cases,
    normativeRules: readJson(join(evaluatorRoot, "cases/normative-rules.json")).rules
  };
}

function baselinePath(name) {
  return join(evaluatorRoot, "baselines", `${name}.json`);
}

try {
  const options = parseArgs(process.argv.slice(2));
  const inputs = loadInputs();
  const baseline = readJson(baselinePath(options.baseline ?? options.compare ?? "v2.5"));
  const source = options.baseline || options.ref
    ? createGitSource(repositoryRoot, options.ref ?? baseline.revision)
    : createFilesystemSource(repositoryRoot);
  const routes = options.baseline ? frozenBaselineRoutes(baseline) : deriveCandidateRoutes(source, baseline);
  const safetyCases = options.baseline ? inputs.baselineSafetyCases : inputs.candidateSafetyCases;
  const packageFiles = options.baseline ? Object.keys(baseline.sourceHashes) : [...evaluationContract.candidatePackageFiles];
  const report = evaluateStatic({
    source,
    routes,
    safetyCases,
    normativeRules: options.baseline || options.ref ? inputs.normativeRules : readJson(join(evaluatorRoot, "cases/candidate-normative-rules.json")).rules,
    packageFiles,
    contract: options.baseline ? null : evaluationContract
  });
  const baselineDifferences = options.baseline ? compareFrozenBaseline(report, baseline) : [];
  const candidateFailures = options.compare ? scoreCandidate(report, baseline) : [];
  const output = { report, baselineDifferences, candidateFailures };

  process.stdout.write(options.json ? `${JSON.stringify(output, null, 2)}\n` : renderStaticReport(report, output));
  if (baselineDifferences.length > 0 || candidateFailures.length > 0) process.exitCode = 1;
} catch (error) {
  process.stderr.write(`Static evaluation failed: ${error.message}\n`);
  process.exitCode = 1;
}
