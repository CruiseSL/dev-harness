import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createFilesystemSource, deriveCandidateRoutes, readJson } from "./score.mjs";
import { evaluationContract } from "./evaluation-contract.mjs";

test("conditional technical guidance ships without inflating every declared route", () => {
  const path = "references/technical-quality.md";
  assert.ok(evaluationContract.candidatePackageFiles.includes(path));
  const source = createFilesystemSource(process.cwd());
  const routes = deriveCandidateRoutes(source, readJson("tests/eval/baselines/v2.5.json"));
  for (const route of routes) assert.ok(!route.loaded.includes(path), route.id);
  assert.match(readFileSync("references/route-manifest.json", "utf8"), /Conditional technical-quality and delivery packs are excluded/);
  // Check reachable entry points, including explicit review which skips classification.
  for (const entry of ["SKILL.md", "references/classification.md", "references/review.md", "references/architect/discuss.md", "references/architect/propose.md"])
    assert.ok(source.read(entry).includes(path), entry);
});

test("technical behavior cases cover both material decisions and lightweight near-misses", () => {
  const fixture = readJson("tests/eval/cases/technical-quality.json");
  assert.equal(fixture.evidenceType, "manual-host-behavior-cases");
  assert.deepEqual(fixture.cases.map(c => c.id), ["ordinary-copy", "material-choice", "settled-design", "feedback-with-real-defect", "missing-business-fact", "standalone-ideation"]);
  assert.ok(fixture.cases.every(c => c.request && c.expected.length >= 2));
  // These are host-review criteria, not a simulated proof that an agent follows them.
});
