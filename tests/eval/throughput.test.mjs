import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import test from "node:test";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createFilesystemSource, createGitSource, readJson } from "./score.mjs";
import {
  canMergeTrackUnits,
  classifyThroughputCase,
  detectV25ThroughputFindings,
  externalSendDecision,
  RepairProgress,
  planDispatch,
  pollExternal,
  throughputMetricNames,
  ValidationLedger
} from "./throughput.mjs";

const evaluatorRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(evaluatorRoot, "../..");

test("freezes the supplied long-session qualitative evidence", () => {
  const evidence = readJson(join(evaluatorRoot, "fixtures/session-ses_f9fdffd2cffeXsh0QaXGJx3GIX.json"));
  assert.equal(evidence.sessionId, "ses_f9fdffd2cffeXsh0QaXGJx3GIX");
  assert.equal(evidence.messageCount, 427);
  assert.equal(evidence.successfulValidationBatches, 59);
  assert.equal(evidence.observations.length, 7);
});

test("Quick defaults to current-session execution and focused validation", () => {
  const route = planDispatch({ level: "Quick" });
  assert.equal(route.dispatch, false);
  assert.equal(route.metrics.childDispatchCount, 0);
  assert.equal(route.metrics.reviewerDispatchCount, 0);
  const ledger = new ValidationLedger();
  ledger.check({ command: "focused-test", inputFingerprint: "a", relevantFilesFingerprint: "a" });
  assert.equal(ledger.metrics.validationExecutionCount, 1);
  assert.equal(ledger.metrics.broadCheckCount, 0);
});

test("Quick and Scoped local review uses the compact contract without inventing delegated artifacts", () => {
  const source = createFilesystemSource(repositoryRoot);
  const skill = source.read("SKILL.md");
  const review = source.read("references/review.md");
  assert.ok(skill.includes("Do not create a child or full Work Order."));
  assert.ok(review.includes("Local review, including small Track units"));
  assert.ok(review.includes("original compact checklist"));
  assert.ok(review.includes("current-Session changed-file list and cumulative diff"));
  assert.ok(review.includes("Delegated review"));
  assert.ok(review.includes("approved Work Order, Executor Result"));
});

test("one-line expectation fix stays in its current cycle without broad validation", () => {
  const route = planDispatch({ level: "Quick", mechanicalFix: true });
  assert.equal(route.metrics.childDispatchCount, 0);
  const ledger = new ValidationLedger();
  ledger.check({ command: "single-test", inputFingerprint: "fix", relevantFilesFingerprint: "test-file" });
  assert.equal(ledger.check({ command: "full-suite", inputFingerprint: "fix", relevantFilesFingerprint: "test-file", broad: true }).status, "blocked");
});

test("one-recipient internal canary is Scoped and retains exact send approval", () => {
  const level = classifyThroughputCase({ internalCanary: true, recipientCount: 1 });
  assert.equal(level, "Scoped");
  assert.equal(planDispatch({ level }).dispatch, false);
  assert.equal(externalSendDecision({ exactAuthorization: false }).allowed, false);
  assert.deepEqual(externalSendDecision({ exactAuthorization: true }), { allowed: true, owner: "Coordinator" });
});

test("Track dispatch follows ownership and independent review also counts after local implementation", () => {
  assert.equal(planDispatch({level: "Track", implementationOwner: "Coordinator"}).dispatch, false);
  assert.equal(planDispatch({level: "Track", implementationOwner: "Executor"}).dispatch, true);
  assert.equal(planDispatch({level: "Track", implementationOwner: "Coordinator", userRequestedIsolation: true}).dispatch, true);
  const localReview = planDispatch({level: "Scoped", reviewerIndependent: true});
  assert.equal(localReview.metrics.childDispatchCount, 0);
  assert.equal(localReview.metrics.reviewerDispatchCount, 1);
});

test("one approved delivery batch combines complementary checks while preserving meaningful gates", () => {
  const base = { outcomeId: "cloud-report", approvalId: "approved-local", owner: "luna", withinApprovedScope: true, ownership: ["a"], acceptance: ["x"], validation: ["t"], rolloutBoundary: "local", rollbackBoundary: "r" };
  assert.equal(canMergeTrackUnits(base, { ...base }), true);
  assert.equal(canMergeTrackUnits(base, { ...base, ownership: ["b"], acceptance: ["y"], validation: ["other-test"] }), true);
  assert.equal(canMergeTrackUnits(base, { ...base, rollbackBoundary: "other" }), false);
  assert.equal(canMergeTrackUnits(base, { ...base, approvalId: "production" }), false);
  assert.equal(canMergeTrackUnits(base, { ...base, owner: "other-worker" }), false);
  assert.equal(canMergeTrackUnits(base, { ...base, requiresSeparateGate: true }), false);
  assert.equal(canMergeTrackUnits(base, { ...base, withinApprovedScope: false }), false);
  assert.equal(canMergeTrackUnits({}, {}), false);
});

test("bookkeeping is Coordinator-owned with zero child dispatches", () => {
  const route = planDispatch({ level: "Track", bookkeepingOnly: true });
  assert.deepEqual({ owner: route.owner, children: route.metrics.childDispatchCount, bookkeepingChildren: route.metrics.bookkeepingChildCount }, { owner: "Coordinator", children: 0, bookkeepingChildren: 0 });
});

test("validation evidence reuses exact fingerprints and invalidates only changed evidence", () => {
  const ledger = new ValidationLedger();
  assert.equal(ledger.check({ command: "test-a", inputFingerprint: "i1", relevantFilesFingerprint: "f1" }).status, "executed");
  assert.equal(ledger.check({ command: "test-a", inputFingerprint: "i1", relevantFilesFingerprint: "f1" }).status, "reused");
  assert.equal(ledger.check({ command: "test-a", inputFingerprint: "i1", relevantFilesFingerprint: "f2" }).status, "executed");
  assert.equal(ledger.check({ command: "test-a", inputFingerprint: "i1", relevantFilesFingerprint: "f1" }).status, "reused");
  assert.deepEqual({ executions: ledger.metrics.validationExecutionCount, reuses: ledger.metrics.validationReuseCount }, { executions: 2, reuses: 2 });
});

test("broad checks require an allowed gate", () => {
  const ledger = new ValidationLedger();
  assert.equal(ledger.check({ command: "full", inputFingerprint: "i", relevantFilesFingerprint: "f", broad: true }).status, "blocked");
  assert.equal(ledger.check({ command: "full", inputFingerprint: "i", relevantFilesFingerprint: "f", broad: true, trigger: "phase" }).status, "executed");
  assert.equal(ledger.metrics.broadCheckCount, 1);
});

test("external polling stops at max polls without child extension", () => {
  const result = pollExternal({ deadline: "2026-09-03T12:00:00Z", pollInterval: "30s", maxPolls: 3 });
  assert.deepEqual({ state: result.terminalState, polls: result.metrics.externalPollCount, children: result.childDispatchCount }, { state: "blocked", polls: 3, children: 0 });
});

test("repair checkpoints allow changed evidence beyond two cycles and reject blind repetition", () => {
  const progress = new RepairProgress();
  const attempt = (evidence) => ({cause: "runtime-start", evidence, approach: "repair-entrypoint"});
  assert.equal(progress.consume(attempt("missing-module")).allowed, true);
  assert.equal(progress.consume(attempt("permission-error")).checkpointDue, true);
  assert.equal(progress.consume(attempt("native-event-shape")).allowed, true);
  assert.equal(progress.consume(attempt("native-event-shape")).reason, "replan-no-new-evidence");
  assert.equal(progress.used, 3);
  assert.equal(progress.metrics.repairCheckpointCount, 1);
});

test("only an explicit user hard budget stops progressing repairs at its limit", () => {
  const budget = new RepairProgress({userHardLimit: 2});
  const attempt = (n) => ({cause: "runtime", evidence: `failure-${n}`, approach: "fix"});
  assert.equal(budget.consume(attempt(1)).allowed, true);
  assert.equal(budget.consume(attempt(2)).allowed, true);
  assert.equal(budget.consume(attempt(3)).reason, "user-hard-limit");
  assert.equal(budget.extend({ userApproved: false, namedRisk: "finding-a", newLimit: 3 }), false);
  assert.equal(budget.extend({ userApproved: true, namedRisk: "finding-a", newLimit: 3 }), true);
  assert.equal(budget.metrics.budgetExtensionCount, 1);
  assert.equal(budget.consume(attempt(3)).allowed, true);
});

test("throughput output exposes every required metric", () => {
  assert.deepEqual(throughputMetricNames, [
    "childDispatchCount",
    "reviewerDispatchCount",
    "validationExecutionCount",
    "validationReuseCount",
    "broadCheckCount",
    "externalPollCount",
    "repairCheckpointCount",
    "budgetExtensionCount",
    "bookkeepingChildCount"
  ]);
  const output = JSON.parse(execFileSync(process.execPath, [join(evaluatorRoot, "run-throughput.mjs")], { encoding: "utf8" }));
  assert.equal(output.evidenceType, "protocol behavior simulation");
  assert.equal(output.liveWallClockMeasured, false);
  assert.deepEqual(Object.keys(output.metrics), throughputMetricNames);
});

test("v2.5 static evidence exposes known throughput regressions", () => {
  const baseline = readJson(join(evaluatorRoot, "baselines/v2.5.json"));
  const findings = detectV25ThroughputFindings(createGitSource(repositoryRoot, baseline.revision));
  assert.deepEqual(findings, [
    "quick-forces-full-path",
    "bookkeeping-can-be-delegated",
    "validation-reuse-missing",
    "budget-can-expand-without-current-user"
  ]);
});
