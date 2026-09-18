import { execFileSync, spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import test from "node:test";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  compareFrozenBaseline,
  createFilesystemSource,
  createGitSource,
  deriveCandidateRoutes,
  evaluateStatic,
  frozenBaselineRoutes,
  makeLivePlan,
  readJson,
  scoreCandidate
} from "./score.mjs";
import { evaluationContract } from "./evaluation-contract.mjs";

const evaluatorRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(evaluatorRoot, "../..");
const inputs = {
  baselineSafetyCases: readJson(join(evaluatorRoot, "cases/safety.json")).cases,
  candidateSafetyCases: readJson(join(evaluatorRoot, "cases/candidate-safety.json")).cases,
  normativeRules: readJson(join(evaluatorRoot, "cases/candidate-normative-rules.json")).rules
};
const baseline = readJson(join(evaluatorRoot, "baselines/v2.5.json"));

function evaluateFrozenBaseline() {
  return evaluateStatic({
    source: createGitSource(repositoryRoot, baseline.revision),
    routes: frozenBaselineRoutes(baseline),
    safetyCases: inputs.baselineSafetyCases,
    normativeRules: readJson(join(evaluatorRoot, "cases/normative-rules.json")).rules,
    packageFiles: Object.keys(baseline.sourceHashes)
  });
}

test("frozen v2.5 report matches the committed source", () => {
  assert.deepEqual(compareFrozenBaseline(evaluateFrozenBaseline(), baseline), []);
});

test("static evaluator reports the known status-route protocol weight", () => {
  const report = evaluateFrozenBaseline();
  const finding = report.findings.find((entry) => entry.id === "unnecessary-route-dependency:explicit-status:references/classification.md");
  assert.equal(finding?.kind, "protocol-weight");
  assert.ok(finding.bytes > 0);
});

test("static evaluator reports and distinguishes recursive Skill access", () => {
  const report = evaluateFrozenBaseline();
  const unsafe = report.safety.find((entry) => entry.id === "worker-denies-recursive-skill-load");
  assert.deepEqual({ status: unsafe.status, actual: unsafe.actual }, { status: "fail", actual: null });

  const fixture = createFilesystemSource(repositoryRoot);
  const safe = evaluateStatic({
    source: fixture,
    routes: [],
    safetyCases: [
      {
        id: "fixture-worker-denies-recursive-skill-load",
        type: "worker-permission",
        path: "tests/eval/fixtures/worker-denies-all-controls.md",
        permission: "skill",
        expected: "deny"
      }
    ],
    normativeRules: [],
    packageFiles: []
  });
  assert.equal(safe.safety[0].status, "pass");
});

test("candidate protocol budgets are derived from the frozen baseline", () => {
  const report = evaluateFrozenBaseline();
  const failure = scoreCandidate(report, baseline).find((entry) => entry.id === "route-budget:quick-single-file-change");
  assert.deepEqual(
    { actualBytes: failure.actualBytes, targetBytes: failure.targetBytes },
    { actualBytes: 38146, targetBytes: 26702 }
  );
});

test("Track routes use stage-local runtime packs within their frozen budgets", () => {
  const source = createFilesystemSource(repositoryRoot);
  const manifest = readJson(join(repositoryRoot, "references/route-manifest.json"));
  const routeMap = new Map(manifest.routes.map((route) => [route.id, route]));
  const gateFiles = [
    "SKILL.md",
    "references/architect/router.md",
    "references/architect/contracts.md",
    "references/track-gate.md"
  ];

  for (const id of ["track-missing-child-configuration", "track-named-agent-mismatch"]) {
    const route = routeMap.get(id);
    assert.equal(route?.dispatch, false);
    assert.deepEqual(route?.coordinator, gateFiles);
    assert.deepEqual(route?.templates, []);
    assert.deepEqual(route?.worker, []);
  }

  const dispatchRoute = routeMap.get("track-matching-named-agent");
  assert.equal(dispatchRoute?.dispatch, true);
  assert.deepEqual(dispatchRoute?.coordinator, [...gateFiles, "references/architect/track-runtime.md"]);
  assert.deepEqual(dispatchRoute?.templates, ["templates/work-order.md", "templates/result.md"]);
  assert.deepEqual(dispatchRoute?.worker, ["templates/opencode-worker.md"]);
  assert.deepEqual(dispatchRoute?.later, ["references/review.md", "references/architect/review.md"]);
  for (const path of [
    "references/architect/implement.md",
    "references/orchestration.md",
    "references/execution.md",
    "references/review.md",
    "references/architect/review.md"
  ]) {
    assert.equal(dispatchRoute?.coordinator.includes(path), false, `${path} must load at its own stage.`);
  }

  const report = evaluateStatic({
    source,
    routes: deriveCandidateRoutes(source, baseline),
    safetyCases: inputs.candidateSafetyCases,
    normativeRules: inputs.normativeRules,
    packageFiles: [...evaluationContract.candidatePackageFiles],
    contract: evaluationContract
  });
  const routeBudgetFailures = scoreCandidate(report, baseline)
    .filter((entry) => entry.id.startsWith("route-budget:track-"));
  assert.deepEqual(routeBudgetFailures, []);
  const track = report.routes.find((route) => route.id === "track-matching-named-agent");
  assert.equal(track.fullDeliveryBytes, track.combinedStaticBytes + track.laterFiles.reduce((sum, file) => sum + file.bytes, 0));
  assert.ok(track.fullDeliveryBytes > track.combinedStaticBytes);
  assert(trackGateRuntime(source).includes("fails closed"));
  assert(trackRuntime(source).includes("Do not begin review before implementation evidence exists"));
});

function trackGateRuntime(source) {
  return source.read("references/track-gate.md");
}

function trackRuntime(source) {
  return source.read("references/architect/track-runtime.md");
}

test("CLI validates the frozen baseline and live planning remains explicitly non-executing", () => {
  const result = spawnSync(process.execPath, ["tests/eval/run-static.mjs", "--baseline", "v2.5", "--json"], {
    cwd: repositoryRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).baselineDifferences, []);

  const routes = frozenBaselineRoutes(baseline);
  const plan = makeLivePlan(routes, 2);
  assert.equal(plan.length, routes.length * 8);
  assert.deepEqual(plan.slice(0, 4).map((entry) => entry.side), ["baseline", "candidate", "candidate", "baseline"]);
  const livePlan = JSON.parse(execFileSync(process.execPath, ["tests/eval/run-live.mjs", "--json"], { cwd: repositoryRoot, encoding: "utf8" }));
  assert.equal(livePlan.status, "dry-run");
  assert.equal(livePlan.execution.status, "non-executing");
  assert.equal(livePlan.execution.modelCalls, false);
  assert.deepEqual(livePlan.order.map((entry) => entry.side), ["baseline", "candidate", "candidate", "baseline"]);
});

test("compare exits zero when frozen efficiency budgets pass", () => {
  const result = spawnSync(process.execPath, ["tests/eval/run-static.mjs", "--compare", "v2.5"], {
    cwd: repositoryRoot,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /Candidate efficiency failures:/);
});

test("candidate scoring fails when recursive Skill denial is removed", () => {
  const source = createFilesystemSource(repositoryRoot);
  const unsafeSource = {
    ...source,
    read(path) {
      const content = source.read(path);
      return path === "templates/opencode-worker.md" ? content.replace("  skill: deny\n", "") : content;
    }
  };
  const report = evaluateStatic({
    source: unsafeSource,
    routes: deriveCandidateRoutes(unsafeSource, baseline),
    safetyCases: inputs.candidateSafetyCases,
    normativeRules: inputs.normativeRules,
    packageFiles: [...evaluationContract.candidatePackageFiles],
    contract: evaluationContract
  });
  const failure = scoreCandidate(report, baseline).find((entry) => entry.id === "safety:worker-denies-recursive-skill-load");
  assert.equal(failure?.category, "safety");
});

test("candidate scoring rejects broken references, missing canonical owners, and route evidence", () => {
  const source = createFilesystemSource(repositoryRoot);
  const evaluateCandidate = (read) => {
    const candidateSource = { ...source, read };
    const report = evaluateStatic({
      source: candidateSource,
      routes: deriveCandidateRoutes(candidateSource, baseline),
      safetyCases: inputs.candidateSafetyCases,
      normativeRules: inputs.normativeRules,
      packageFiles: [...evaluationContract.candidatePackageFiles],
      contract: evaluationContract
    });
    return scoreCandidate(report, baseline);
  };

  const brokenReferenceFailures = evaluateCandidate((path) => {
    const content = source.read(path);
    return path === "SKILL.md" ? `${content}\n\`references/missing.md\`\n` : content;
  });
  assert.equal(brokenReferenceFailures.find((entry) => entry.id.startsWith("blocking:broken-reference:"))?.category, "blocking");

  const missingCanonicalFailures = evaluateCandidate((path) => {
    const content = source.read(path);
    return path === "references/review.md" ? content.replace("Review is read-only by default.", "Review may edit by default.") : content;
  });
  assert.equal(missingCanonicalFailures.find((entry) => entry.id === "blocking:missing-canonical-rule:review-does-not-authorize-fixes")?.category, "blocking");

  const missingRouteEvidenceFailures = evaluateCandidate((path) => {
    const content = source.read(path);
    return path === "references/route-manifest.json" ? "{ invalid JSON" : content;
  });
  assert.equal(missingRouteEvidenceFailures.find((entry) => entry.id === "blocking:evaluation-contract:missing-route:quick-single-file-change")?.category, "blocking");

  const missingSource = {
    ...source,
    exists(path) {
      return path !== "references/execution.md" && source.exists(path);
    }
  };
  const missingSourceReport = evaluateStatic({
    source: missingSource,
    routes: deriveCandidateRoutes(missingSource, baseline),
    safetyCases: inputs.candidateSafetyCases,
    normativeRules: inputs.normativeRules,
    packageFiles: [...evaluationContract.candidatePackageFiles],
    contract: evaluationContract
  });
  assert.equal(scoreCandidate(missingSourceReport, baseline).find((entry) => entry.id === "blocking:missing-source:references/execution.md")?.category, "blocking");
});

test("candidate gate rejects removed frozen evaluation items", () => {
  const source = createFilesystemSource(repositoryRoot);
  const routes = deriveCandidateRoutes(source, baseline);
  const cases = [
    {
      kind: "safety-case",
      safetyCases: inputs.candidateSafetyCases.slice(1),
      normativeRules: inputs.normativeRules,
      packageFiles: [...evaluationContract.candidatePackageFiles],
      routes
    },
    {
      kind: "normative-rule",
      safetyCases: inputs.candidateSafetyCases,
      normativeRules: inputs.normativeRules.slice(1),
      packageFiles: [...evaluationContract.candidatePackageFiles],
      routes
    },
    {
      kind: "package-file",
      safetyCases: inputs.candidateSafetyCases,
      normativeRules: inputs.normativeRules,
      packageFiles: evaluationContract.candidatePackageFiles.slice(1),
      routes
    },
    {
      kind: "route",
      safetyCases: inputs.candidateSafetyCases,
      normativeRules: inputs.normativeRules,
      packageFiles: [...evaluationContract.candidatePackageFiles],
      routes: routes.slice(1)
    }
  ];

  for (const candidate of cases) {
    const report = evaluateStatic({ source, ...candidate, contract: evaluationContract });
    const failures = scoreCandidate(report, baseline);
    assert.ok(
      failures.some((failure) => failure.id.startsWith(`blocking:evaluation-contract:missing-${candidate.kind}:`)),
      `Missing ${candidate.kind} did not fail the candidate gate.`
    );
  }
});

test("candidate gate rejects duplicate and unknown replacement items", () => {
  const source = createFilesystemSource(repositoryRoot);
  const routes = deriveCandidateRoutes(source, baseline);
  const variants = [
    { routes: [...routes, routes[0]], expected: "duplicate-route:" },
    { routes: [...routes, { ...routes[0], id: "replacement-route" }], expected: "unknown-route:" },
    {
      routes,
      safetyCases: [...inputs.candidateSafetyCases, inputs.candidateSafetyCases[0]],
      expected: "duplicate-safety-case:"
    },
    {
      routes,
      normativeRules: [...inputs.normativeRules, { ...inputs.normativeRules[0], id: "replacement-rule" }],
      expected: "unknown-normative-rule:"
    }
  ];

  for (const variant of variants) {
    const report = evaluateStatic({
      source,
      routes: variant.routes,
      safetyCases: variant.safetyCases ?? inputs.candidateSafetyCases,
      normativeRules: variant.normativeRules ?? inputs.normativeRules,
      packageFiles: [...evaluationContract.candidatePackageFiles],
      contract: evaluationContract
    });
    assert.ok(scoreCandidate(report, baseline).some((failure) => failure.id.includes(variant.expected)));
  }
});
