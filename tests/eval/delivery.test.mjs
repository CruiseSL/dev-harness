import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { assessDelivery, checkExercise, compareDeliveries, deliveryCases, scheduledReportCase, prepareDelivery, startDelivery } from "./delivery.mjs";

function withExercises(fn) {
  const parent = mkdtempSync(join(tmpdir(), "dev-harness-delivery-test-"));
  const output = join(parent, "runs");
  const source = { files: ["SKILL.md"], read: () => "Fixture protocol, not a model run.\n" };
  try { return fn(output, prepareDelivery({output, sources: {baseline: source, candidate: source}})); }
  finally { rmSync(parent, {recursive: true, force: true}); }
}

const solutions = {
  "quick-label": {"src/label.mjs": 'export const retryLabel = "Retry";\n'},
  "scoped-dry-run": {
    "src/options.mjs": 'export function parseArgs(args) { return {dryRun: args.includes("--dry-run")}; }\n',
    "src/deliver.mjs": 'export async function deliver(recipients, options, sender) { if(options.dryRun) return {wouldSend: recipients.length}; for(const r of recipients) await sender(r); return {sent: recipients.length}; }\n'
  },
  "bounded-pagination": {"src/page.mjs": 'export function page(items, offset, limit) { return items.slice(offset, offset + limit); }\n'}
};
const runtime = {host:"test-host", model:"test-model", reasoning:"test-effort", roles:{executor:null,reviewer:null}};

test("real exercise probes fail initially and verify accepted in-scope implementations", () => withExercises((root, manifest) => {
  const reports = [];
  for (const run of manifest.runs) {
    const definition = deliveryCases.find((entry) => entry.id === run.caseId);
    assert.equal(checkExercise(run.workspace, definition).passed, false);
    startDelivery(root, run.id, new Date("2026-09-07T00:00:00Z"));
    assert.throws(() => startDelivery(root, run.id), /EEXIST/);
    for (const [path, content] of Object.entries(solutions[run.caseId])) writeFileSync(join(run.workspace, path), content);
    const report = assessDelivery(root, run.id, {terminalState: "accepted", runtime, firstImplementationAt: "2026-09-07T00:01:00Z", validationExecutionCount: 1}, new Date("2026-09-07T00:02:00Z"));
    assert.equal(report.completed, true);
    assert.equal(report.elapsedMs, 120000);
    assert.equal(report.postImplementationMs, 60000);
    assert.equal(report.metrics.broadCheckCount, null);
    assert.equal(readFileSync(join(run.workspace,"unrelated.txt"),"utf8"), "Preserve this user-owned note.\n");
    assert.throws(() => assessDelivery(root, run.id, {terminalState: "accepted"}), /Result already exists/);
    reports.push(report);
  }
  assert.equal(compareDeliveries(reports).speedComparisonEligible, true);
  assert.equal(compareDeliveries(reports).medianPairedReductionMs, 0);
}));

test("editing the visible test cannot manufacture acceptance; file drift is reported", () => withExercises((root, manifest) => {
  const run = manifest.runs[0];
  startDelivery(root, run.id);
  writeFileSync(join(run.workspace,"test.mjs"), "// always passes\n");
  writeFileSync(join(run.workspace,"unrelated.txt"), "changed\n");
  const report = assessDelivery(root, run.id, {terminalState: "accepted"});
  assert.equal(report.acceptance.passed, false);
  assert.equal(report.completed, false);
  assert.deepEqual(report.outOfScope.sort(), ["test.mjs", "unrelated.txt"]);
  assert.equal(compareDeliveries([report]).speedComparisonEligible, false);
}));

test("partial, missing and duplicated pairs cannot count as delivery speedups", () => {
  const runs = deliveryCases.flatMap(({id}) => ["baseline", "candidate"].map((side) => ({caseId:id, side, runtime, completed: true, elapsedMs: side === "baseline" ? 100 : 50})));
  assert.equal(compareDeliveries(runs).medianPairedReductionMs, 50);
  const failed = runs.map((run,i) => i === 1 ? {...run, completed:false, elapsedMs:1} : run);
  assert.equal(compareDeliveries(failed).candidate.completionRate, 2/3);
  assert.equal(compareDeliveries(failed).medianPairedReductionMs, null);
  assert.equal(compareDeliveries([...runs,runs[0]]).speedComparisonEligible, false);
  assert.equal(compareDeliveries(runs.map((run,i) => i === 0 ? {...run, runtime:null} : run)).speedComparisonEligible, false);
  assert.equal(compareDeliveries(runs.map((run,i) => i === 0 ? {...run, runtime:{host:runtime.host,model:runtime.model,reasoning:runtime.reasoning}} : run)).speedComparisonEligible, false);
  assert.equal(compareDeliveries(runs.map((run,i) => i === 0 ? {...run, runtime:{...runtime, model:"other"}} : run)).speedComparisonEligible, false);
  assert.equal(compareDeliveries(runs.map((run,i) => i === 0 ? {...run, runtime:{...runtime,roles:{executor:{model:"other",reasoning:"high"}}}} : run)).speedComparisonEligible, false);
});

test("scheduled report exercise detects the real entrypoint gap and accepts one coherent local batch", () => {
  const parent = mkdtempSync(join(tmpdir(), "dev-harness-batch-test-"));
  const root = join(parent, "runs");
  try {
    const source = {files:["SKILL.md"],read:()=>"Fixture protocol.\n"};
    const {runs:[run]} = prepareDelivery({output:root,sources:{candidate:source},caseIds:[scheduledReportCase.id]});
    assert.equal(checkExercise(run.workspace,scheduledReportCase).passed,false);
    startDelivery(root,run.id);
    writeFileSync(join(run.workspace,"src/config.mjs"), "export const loadConfig = env => ({destination:env.REPORT_DESTINATION,dryRun:env.DRY_RUN === 'true'});\n");
    writeFileSync(join(run.workspace,"src/report.mjs"), "export function summarize(rows) { const bySource={}; let total=0; for(const r of rows){total+=r.count;bySource[r.source]=(bySource[r.source]??0)+r.count;} return {total,bySource}; }\n");
    const implementation = "import {loadConfig} from './config.mjs'; import {summarize} from './report.mjs'; export async function scheduled(event,env,deps){ const {destination,dryRun}=loadConfig(env); const day=new Date(event.scheduledTime-86400000).toISOString().slice(0,10); const key=`${day}:${destination}`; if(deps.delivered.has(key))return {status:'duplicate',day}; const report={day,...summarize(await deps.collect(day))}; if(dryRun)return {status:'preview',report}; await deps.deliver(destination,report); deps.delivered.add(key); return {status:'delivered',report}; }\n";
    writeFileSync(join(run.workspace,"src/scheduled.mjs"),implementation.replace("const {destination,dryRun}=loadConfig(env);", "if(event.scheduledTime%60000)throw new Error('invalid schedule'); const {destination,dryRun}=loadConfig(env);"));
    assert.equal(checkExercise(run.workspace,scheduledReportCase).passed,false);
    writeFileSync(join(run.workspace,"src/scheduled.mjs"),implementation);
    assert.equal(checkExercise(run.workspace,scheduledReportCase).passed,false, "Pending README must not pass batch acceptance");
    writeFileSync(join(run.workspace,"README.md"), "Normal entrypoint: src/scheduled.mjs, scheduled(event, env, deps).\nEvidence tier: local fixture\nUnverified: cloud scheduling and real delivery\n");
    const report = assessDelivery(root,run.id,{terminalState:"accepted",runtime,childDispatchCount:1,reviewerDispatchCount:1});
    assert.equal(report.completed,true);
    assert.equal(report.metrics.noncachedInputTokens,null);
    assert.equal(compareDeliveries([report]).speedComparisonEligible,false);
  } finally {rmSync(parent,{recursive:true,force:true});}
});

test("delivery plan CLI performs no provider calls", () => {
  const result = spawnSync(process.execPath, ["tests/eval/run-delivery.mjs"], {encoding:"utf8"});
  assert.equal(result.status,0,result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.equal(plan.modelCalls,false);
  assert.equal(plan.cases.length,3);
});

test("review continuation starts with real passed evidence and accepts without more edits", () => {
  const parent = mkdtempSync(join(tmpdir(), "dev-harness-review-test-"));
  const root = join(parent, "runs");
  try {
    const source = {files: ["SKILL.md"], read: () => "Fixture protocol.\n"};
    const manifest = prepareDelivery({output: root, sources: {candidate: source}, caseIds: ["review-closure"]});
    const run = manifest.runs[0];
    const evidence = JSON.parse(readFileSync(join(run.workspace, "validation-evidence.json")));
    assert.equal(evidence.exitCode, 0);
    assert.deepEqual(Object.keys(evidence.inputs), ["src/page.mjs", "test.mjs"]);
    startDelivery(root, run.id);
    const report = assessDelivery(root, run.id, {terminalState: "accepted", validationExecutionCount: 0, validationReuseCount: 1});
    assert.equal(report.completed, true);
    assert.deepEqual(report.changed, []);
    assert.equal(compareDeliveries([report]).speedComparisonEligible, false);
  } finally { rmSync(parent, {recursive: true, force: true}); }
});
