import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createFilesystemSource, deriveCandidateRoutes, evaluateStatic, readJson, scoreCandidate } from "./score.mjs";
import { evaluationContract } from "./evaluation-contract.mjs";

test("Track runtime documentation covers entry, phase ordering and final completion", () => {
  const runtime = readFileSync("references/architect/track-runtime.md", "utf8");
  for (const rule of ["Auto by default when implementation is clearly authorized", "earlier unfinished phase gate", "only missing or invalidated checks", "registry `[~]`", "metadata `in_progress`", "metadata `completed`", "Final review is a reconciliation boundary", "requested-tier evidence"]) assert.ok(runtime.includes(rule), rule);
  const propose = readFileSync("references/architect/propose.md", "utf8");
  assert.match(propose, /route through `references\/track-gate.md` to `references\/architect\/track-runtime.md`/);
});

test("later review stages cannot disappear from the measured Track route", () => {
  const source = createFilesystemSource(process.cwd());
  const baseline = readJson("tests/eval/baselines/v2.5.json");
  const routes = deriveCandidateRoutes(source, baseline).map((route) => ({...route, later: []}));
  const report = evaluateStatic({source, routes,
    safetyCases: readJson("tests/eval/cases/candidate-safety.json").cases,
    normativeRules: readJson("tests/eval/cases/candidate-normative-rules.json").rules,
    packageFiles: [...evaluationContract.candidatePackageFiles], contract: evaluationContract});
  assert.ok(scoreCandidate(report, baseline).some((failure) => failure.id.includes("missing-later-stage:")));
});
