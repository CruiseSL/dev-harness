import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import {
  createLiveAbortController,
  createLivePlan,
  DEFAULT_LIVE_OUTPUT_BYTES,
  DEFAULT_LIVE_TIMEOUT_MS,
  executeLivePilot,
  createLivePlanIdentity,
  prepareLiveJournal
} from "./live.mjs";
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
    maxOutputBytes: DEFAULT_LIVE_OUTPUT_BYTES,
    model: DEFAULT_MODEL,
    output: null,
    repetitions: 3,
    timeoutMs: DEFAULT_LIVE_TIMEOUT_MS,
    variant: DEFAULT_VARIANT,
    journal: null,
    resume: false
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--execute") options.execute = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--resume") options.resume = true;
    else if (["--repetitions", "--model", "--variant", "--timeout-ms", "--max-output-bytes", "--output", "--journal"].includes(arg)) {
      const value = optionValue(args, index, arg);
      index += 1;
      if (arg === "--repetitions") options.repetitions = Number(value);
      if (arg === "--model") options.model = value;
      if (arg === "--variant") options.variant = value;
      if (arg === "--timeout-ms") options.timeoutMs = Number(value);
      if (arg === "--max-output-bytes") options.maxOutputBytes = Number(value);
      if (arg === "--output") options.output = value;
      if (arg === "--journal") options.journal = value;
    } else if (arg === "--help") {
      return { help: true };
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  if (!Number.isInteger(options.repetitions) || options.repetitions < 1) {
    throw new Error("--repetitions must be a positive integer.");
  }
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs <= 0) throw new Error("--timeout-ms must be a positive integer.");
  if (!Number.isInteger(options.maxOutputBytes) || options.maxOutputBytes <= 0) throw new Error("--max-output-bytes must be a positive integer.");
  if (options.resume && !options.execute) throw new Error("--resume requires --execute.");
  if (options.execute && !options.journal) throw new Error("--execute requires --journal <path> so completed paid calls are checkpointed.");
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

function routeJournalPath(basePath, routeId) {
  if (!basePath) return null;
  const suffix = extname(basePath) ? `${basePath}.${routeId}.json` : join(basePath, `${routeId}.json`);
  return suffix;
}

function batchJournalPath(basePath) {
  return `${basePath}.batch.json`;
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp-${process.pid}-${Date.now()}`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(temporaryPath, path);
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => {});
  }
}

async function prepareLayeredJournals(options, definitions) {
  if (!options.journal) return null;
  const manifestPath = batchJournalPath(options.journal);
  const routes = definitions.map((definition) => {
    const journalPath = routeJournalPath(options.journal, definition.routeId);
    return {
      routeId: definition.routeId,
      journalPath,
      identity: createLivePlanIdentity({
        route: definition.routeId,
        repetitions: options.repetitions,
        model: options.model,
        variant: options.variant,
        baselineBundle: definition.baselineBundle,
        candidateBundle: definition.candidateBundle,
        expectedPlannedChildDispatchCount: definition.expectedPlannedChildDispatchCount,
        timeoutMs: options.timeoutMs,
        maxOutputBytes: options.maxOutputBytes
      })
    };
  });
  const identity = {
    schemaVersion: 1,
    kind: "layered-live-journal-batch",
    repetitions: options.repetitions,
    model: options.model,
    variant: options.variant,
    timeoutMs: options.timeoutMs,
    maxOutputBytes: options.maxOutputBytes,
    routes
  };
  let manifest;
  let manifestCreated = false;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    if (!options.resume) throw new Error(`Layered journal batch already exists at ${manifestPath}; pass --resume or choose a new path.`);
    if (JSON.stringify(manifest.identity) !== JSON.stringify(identity)) {
      throw new Error("Cannot resume: layered journal batch identity does not match routes, ordering, bundle content, model, or settings.");
    }
    if (manifest.status === "ready" && !Array.isArray(manifest.routes)) {
      throw new Error("Cannot resume: layered journal batch manifest is malformed.");
    }
  } catch (error) {
    if (error.message.includes("already exists") || error.message.includes("identity does not match") || error.message.includes("malformed")) throw error;
    if (error?.code !== "ENOENT") throw error;
    if (options.resume) throw new Error(`Cannot resume: layered journal batch manifest does not exist at ${manifestPath}.`);
    manifest = { schemaVersion: 1, kind: "layered-live-journal-batch", status: "preparing", identity, routes };
    manifestCreated = true;
    await writeJsonAtomic(manifestPath, manifest);
  }

  const requireExisting = options.resume && manifest.status === "ready";
  for (const definition of definitions) {
    await prepareLiveJournal({
      journalPath: routeJournalPath(options.journal, definition.routeId),
      route: definition.routeId,
      repetitions: options.repetitions,
      model: options.model,
      variant: options.variant,
      baselineBundle: definition.baselineBundle,
      candidateBundle: definition.candidateBundle,
      expectedPlannedChildDispatchCount: definition.expectedPlannedChildDispatchCount,
      timeoutMs: options.timeoutMs,
      maxOutputBytes: options.maxOutputBytes,
      resume: options.resume || (!manifestCreated && manifest.status === "preparing"),
      requireExisting
    });
  }
  manifest.status = "ready";
  await writeJsonAtomic(manifestPath, manifest);
  return manifest;
}

export async function executeLayeredLiveBatch({ options, definitions, executePilot = executeLivePilot, signal = options.signal ?? null }) {
  if (options.journal) await prepareLayeredJournals(options, definitions);
  const liveSuites = [];
  for (const definition of definitions) {
    liveSuites.push(await executePilot({
      route: definition.routeId,
      repetitions: options.repetitions,
      model: options.model,
      variant: options.variant,
      baselineBundle: definition.baselineBundle,
      candidateBundle: definition.candidateBundle,
      expectedPlannedChildDispatchCount: definition.expectedPlannedChildDispatchCount,
      timeoutMs: options.timeoutMs,
      maxOutputBytes: options.maxOutputBytes,
      journalPath: routeJournalPath(options.journal, definition.routeId),
      resume: Boolean(options.resume || options.journal),
      signal
    }));
    const current = liveSuites.at(-1);
    if (signal?.aborted || ["cancelled", "timed-out", "journal-error"].includes(current?.status)) break;
  }
  return liveSuites;
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
  const abortSignal = options.signal ?? null;
  const liveSuites = shouldExecute
    ? await executeLayeredLiveBatch({ options, definitions, executePilot, signal: abortSignal })
    : plans;
  const livePassed = shouldExecute
    && liveSuites.length === definitions.length
    && liveSuites.every((result) => result.status === "completed");
  const aggregate = shouldExecute ? aggregateLayeredLiveResults(liveSuites) : null;
  const efficiency = aggregate ? assessOverallLiveEfficiency(aggregate) : null;
  return {
    schemaVersion: 1,
    evidenceType: "static-contracts-and-input-cost; not delivery behavior",
    releaseReadiness: "not-assessed",
    status: !staticPassed ? "failed-static" : !shouldExecute ? "dry-run" : liveSuites.some((result) => result.status === "cancelled") || abortSignal?.aborted ? "cancelled" : liveSuites.some((result) => result.status === "timed-out") ? "timed-out" : liveSuites.some((result) => result.status === "journal-error") ? "journal-error" : !livePassed ? "failed-hard-gates" : efficiency.status !== "pass" ? "failed-efficiency" : "completed",
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
    process.stdout.write("Usage: node tests/eval/run-layered.mjs [--repetitions <n>] [--model <provider/model>] [--variant <name>] [--timeout-ms <n>] [--max-output-bytes <n>] [--journal <path>] [--resume] [--output <path>] [--execute] [--json]\n");
    return;
  }
  const abortController = options.execute ? createLiveAbortController() : null;
  let result;
  try {
    result = await runLayeredEvaluation({ ...options, signal: abortController?.signal ?? null });
  } finally {
    abortController?.dispose();
  }
  const output = options.json ? `${JSON.stringify(result, null, 2)}\n` : renderLayeredReport(result);
  if (options.output) {
    await mkdir(dirname(options.output), { recursive: true });
    await writeFile(options.output, output, "utf8");
  }
  process.stdout.write(output);
  if (result.status !== "completed" && result.status !== "dry-run") process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    process.stderr.write(`Layered evaluation failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
