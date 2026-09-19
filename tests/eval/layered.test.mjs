import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import test from "node:test";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  aggregateLayeredLiveResults,
  assessOverallLiveEfficiency,
  evaluateLayeredStaticCases,
  summarizeStaticCases,
  validateLayeredSuite
} from "./layered.mjs";
import {
  createFilesystemSource,
  deriveCandidateRoutes,
  evaluateStatic,
  readJson
} from "./score.mjs";
import { evaluationContract } from "./evaluation-contract.mjs";
import { executeLayeredLiveBatch, runLayeredEvaluation } from "./run-layered.mjs";

const evaluatorRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(evaluatorRoot, "../..");

function candidateStaticReport(source) {
  const baseline = readJson(join(evaluatorRoot, "baselines/v2.5.json"));
  return evaluateStatic({
    source,
    routes: deriveCandidateRoutes(source, baseline),
    safetyCases: readJson(join(evaluatorRoot, "cases/candidate-safety.json")).cases,
    normativeRules: readJson(join(evaluatorRoot, "cases/candidate-normative-rules.json")).rules,
    packageFiles: [...evaluationContract.candidatePackageFiles],
    contract: evaluationContract
  });
}

test("layered suite registers all 21 static cases and four representative live routes", () => {
  const suite = validateLayeredSuite(readJson(join(evaluatorRoot, "cases/layered-suite.json")));
  assert.equal(suite.staticCases.length, 21);
  assert.deepEqual(suite.representativeLiveRoutes, [
    "explicit-status",
    "quick-single-file-change",
    "scoped-cross-module-change",
    "track-matching-named-agent"
  ]);
});

test("current candidate passes the complete layered static matrix", () => {
  const source = createFilesystemSource(repositoryRoot);
  const suite = validateLayeredSuite(readJson(join(evaluatorRoot, "cases/layered-suite.json")));
  const cases = evaluateLayeredStaticCases({ source, report: candidateStaticReport(source), suite });
  assert.deepEqual(summarizeStaticCases(cases), {
    total: 21,
    passed: 21,
    failed: 0,
    failures: []
  });
});

test("layered aggregation reports a weighted token and latency comparison", () => {
  const run = (side, totalTokens, elapsedMs) => ({
    side,
    providerTokens: { totalTokens },
    elapsedMs,
    taskToolChildCallCount: 0,
    plannedChildDispatchCount: 0,
    hardGates: { passed: true }
  });
  const aggregate = aggregateLayeredLiveResults([
    { runs: [run("baseline", 200, 100), run("candidate", 100, 50)] },
    { runs: [run("baseline", 300, 200), run("candidate", 150, 125)] }
  ]);
  assert.equal(aggregate.baseline.totalTokens.median, 250);
  assert.equal(aggregate.candidate.totalTokens.median, 125);
  assert.equal(aggregate.reductions.medianTotalTokens.reduction, 125);
  assert.equal(aggregate.reductions.medianElapsedMs.reduction, 62.5);
  assert.equal(assessOverallLiveEfficiency(aggregate).status, "pass");
});

test("overall live efficiency rejects excessive median latency regression", () => {
  const assessment = assessOverallLiveEfficiency({
    reductions: {
      medianTotalTokens: { percentReduction: 25 },
      p90TotalTokens: { percentReduction: 5 },
      medianElapsedMs: { percentReduction: -11 }
    }
  });
  assert.equal(assessment.status, "fail");
  assert.equal(assessment.failed[0].id, "overall-median-elapsed-ms");
});

test("a completed cost pilot with no savings fails the overall efficiency gate", async () => {
  const result = await runLayeredEvaluation({execute:true, repetitions:1, model:"test", variant:"test"}, async ({route}) => ({
    route, status:"completed", runs:["baseline", "candidate"].map((side) => ({side,
      providerTokens:{totalTokens:100}, elapsedMs:10, taskToolChildCallCount:0,
      plannedChildDispatchCount:0, hardGates:{passed:true}}))
  }));
  assert.equal(result.live.executed, true);
  assert.equal(result.live.efficiency.status, "fail");
  assert.equal(result.status, "failed-efficiency");
  assert.equal(result.releaseReadiness, "not-assessed");
});

test("layered CLI dry-run plans four routes with three ABBA repetitions without model calls", () => {
  const result = spawnSync(process.execPath, ["tests/eval/run-layered.mjs", "--json"], {
    cwd: repositoryRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "dry-run");
  assert.equal(report.static.summary.passed, 21);
  assert.equal(report.live.executed, false);
  assert.equal(report.live.repetitions, 3);
  assert.equal(report.live.plannedInvocations, 48);
  assert.deepEqual(report.live.suites.map((plan) => plan.route), report.live.routes);
});

test("layered journal prepares every route and resumes a cancelled first route without rerunning it", async () => {
  const makeBundle = (route, side) => {
    const content = `${route}-${side}`;
    return {
      schemaVersion: 1,
      evidenceType: "protocol-input-cost-microbenchmark",
      side,
      source: side,
      route,
      measurement: "UTF-8 protocol bytes, not provider token counts.",
      files: [{ stage: "coordinator", path: `${side}.md`, bytes: Buffer.byteLength(content), content }],
      coordinatorProtocolBytes: Buffer.byteLength(content),
      templateBytes: 0,
      workerSystemBytes: 0,
      protocolBytes: Buffer.byteLength(content),
      bundleBytes: Buffer.byteLength(content)
    };
  };
  const definitions = ["route-a", "route-b"].map((routeId) => ({
    routeId,
    baselineBundle: makeBundle(routeId, "baseline"),
    candidateBundle: makeBundle(routeId, "candidate"),
    expectedPlannedChildDispatchCount: 0
  }));
  const journalRoot = mkdtempSync(join(tmpdir(), "dev-harness-layered-journal-"));
  const journalPath = join(journalRoot, "batch");
  const options = {
    execute: true,
    journal: journalPath,
    resume: false,
    repetitions: 1,
    model: "test/model",
    variant: "test",
    timeoutMs: 100,
    maxOutputBytes: 1000
  };
  const orchestrationCalls = [];
  const providerCalls = [];
  try {
    const first = await executeLayeredLiveBatch({
      options,
      definitions,
      executePilot: async ({ route, resume }) => {
        orchestrationCalls.push({ route, resume });
        return { route, status: "cancelled", runs: [], aggregate: null };
      }
    });
    assert.deepEqual(first.map((suite) => suite.route), ["route-a"]);
    assert.equal(orchestrationCalls.length, 1);

    const resumed = await executeLayeredLiveBatch({
      options: { ...options, resume: true },
      definitions,
      executePilot: async ({ route, resume }) => {
        orchestrationCalls.push({ route, resume });
        if (route === "route-b") providerCalls.push(route);
        return { route, status: "completed", runs: [], aggregate: null };
      }
    });
    assert.deepEqual(resumed.map((suite) => suite.route), ["route-a", "route-b"]);
    assert.deepEqual(providerCalls, ["route-b"]);
    assert.deepEqual(orchestrationCalls.slice(1), [
      { route: "route-a", resume: true },
      { route: "route-b", resume: true }
    ]);
  } finally {
    rmSync(journalRoot, { recursive: true, force: true });
  }
});
