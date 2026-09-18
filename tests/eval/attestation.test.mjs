import { execFileSync, spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { captureExecutionAttestation, verifyExecutionAttestation } from "../../scripts/attestation.mjs";

function git(worktree, args) {
  return execFileSync("git", args, { cwd: worktree, encoding: "utf8" });
}

function status(worktree) {
  return git(worktree, ["status", "--short"]);
}

function withFixture(run) {
  const worktree = mkdtempSync(join(tmpdir(), "dev-harness-attestation-"));
  try {
    git(worktree, ["init", "--quiet"]);
    git(worktree, ["config", "user.email", "eval@example.test"]);
    git(worktree, ["config", "user.name", "Dev Harness Eval"]);
    mkdirSync(join(worktree, "src"));
    mkdirSync(join(worktree, "scratch"));
    writeFileSync(join(worktree, "src", "owned.txt"), "original\n");
    writeFileSync(join(worktree, "src", "readonly.txt"), "readonly\n");
    git(worktree, ["add", "."]);
    git(worktree, ["commit", "-m", "fixture"]);
    return run(worktree);
  } finally {
    rmSync(worktree, { recursive: true, force: true });
  }
}

function executionBinding(overrides = {}) {
  return {
    workOrderId: "wo-fixture",
    harnessMode: "Scoped",
    child: {
      model: "provider/model",
      reasoning: "high",
      agent: "dev-harness-worker",
      configurationSource: "project config"
    },
    trackGate: { state: "not-applicable", trackId: null, unitIds: [] },
    requestedConsequentialOperations: [],
    ...overrides
  };
}

function capture(worktree, extraReadOnlyPaths = [], binding = executionBinding()) {
  return captureExecutionAttestation({
    worktree,
    ownedPaths: ["src/owned.txt"],
    readOnlyPaths: ["src/readonly.txt", ...extraReadOnlyPaths],
    executionBinding: binding
  });
}

test("direct Codex role binds explicit settings without a custom Agent", () => withFixture((worktree) => {
  const attestation = capture(worktree, [], executionBinding({child: {model: "gpt-5.6-luna", reasoning: "xhigh", agent: "default", configurationSource: "project config"}}));
  assert.equal(attestation.executionBinding.child.agent, "default");
  assert.equal(verifyExecutionAttestation({worktree, attestation}).matches, true);
}));

test("attestation matches an unchanged worktree", () => withFixture((worktree) => {
  const attestation = capture(worktree);
  assert.deepEqual(verifyExecutionAttestation({ worktree, attestation }).mismatches, []);
}));

test("attestation reports an unrelated HEAD revision without blocking", () => withFixture((worktree) => {
  const attestation = capture(worktree);
  git(worktree, ["commit", "--allow-empty", "-m", "advance head"]);
  const verification = verifyExecutionAttestation({ worktree, attestation });
  assert.equal(verification.matches, true);
  assert.ok(verification.outsideScopeDrift.includes("baselineRevision"));
}));

test("attestation blocks a scoped revision change", () => withFixture((worktree) => {
  const attestation = capture(worktree);
  writeFileSync(join(worktree, "src", "owned.txt"), "committed change\n");
  git(worktree, ["add", "src/owned.txt"]);
  git(worktree, ["commit", "-m", "change owned scope"]);
  assert.ok(verifyExecutionAttestation({ worktree, attestation }).mismatches.includes("scopeRevisionFingerprint"));
}));

test("attestation detects a status change", () => withFixture((worktree) => {
  const attestation = capture(worktree);
  writeFileSync(join(worktree, "src", "owned.txt"), "changed\n");
  assert.ok(verifyExecutionAttestation({ worktree, attestation }).mismatches.includes("unstagedDiffFingerprint"));
}));

test("attestation allows unrelated worktree changes", () => withFixture((worktree) => {
  const attestation = capture(worktree);
  writeFileSync(join(worktree, "outside.txt"), "unrelated\n");
  const verification = verifyExecutionAttestation({ worktree, attestation });
  assert.equal(verification.matches, true);
  assert.ok(verification.outsideScopeDrift.includes("repositoryStatusFingerprint"));
}));

test("attestation detects unstaged content changes with identical status", () => withFixture((worktree) => {
  writeFileSync(join(worktree, "src", "owned.txt"), "first change\n");
  const attestation = capture(worktree);
  const originalStatus = status(worktree);
  writeFileSync(join(worktree, "src", "owned.txt"), "second change\n");
  assert.equal(status(worktree), originalStatus);
  const verification = verifyExecutionAttestation({ worktree, attestation });
  assert.ok(verification.mismatches.includes("unstagedDiffFingerprint"));
  assert.ok(verification.mismatches.includes("scopeFingerprint"));
}));

test("attestation detects staged content changes with identical status", () => withFixture((worktree) => {
  writeFileSync(join(worktree, "src", "owned.txt"), "first staged change\n");
  git(worktree, ["add", "src/owned.txt"]);
  const attestation = capture(worktree);
  const originalStatus = status(worktree);
  writeFileSync(join(worktree, "src", "owned.txt"), "second staged change\n");
  git(worktree, ["add", "src/owned.txt"]);
  assert.equal(status(worktree), originalStatus);
  assert.ok(verifyExecutionAttestation({ worktree, attestation }).mismatches.includes("stagedDiffFingerprint"));
}));

test("attestation detects untracked content changes with identical status", () => withFixture((worktree) => {
  const untracked = join(worktree, "scratch", "note.txt");
  writeFileSync(untracked, "first note\n");
  const attestation = capture(worktree, ["scratch"]);
  const originalStatus = status(worktree);
  writeFileSync(untracked, "second note\n");
  assert.equal(status(worktree), originalStatus);
  const verification = verifyExecutionAttestation({ worktree, attestation });
  assert.ok(verification.mismatches.includes("relevantUntrackedFingerprint"));
  assert.ok(verification.mismatches.includes("scopeFingerprint"));
}));

test("attestation hashes an untracked symlink without reading its target", () => withFixture((worktree) => {
  const outside = mkdtempSync(join(tmpdir(), "dev-harness-outside-"));
  try {
    const target = join(outside, "secret.txt");
    writeFileSync(target, "first secret\n");
    symlinkSync(target, join(worktree, "scratch", "link.txt"));
    const attestation = capture(worktree, ["scratch"]);
    writeFileSync(target, "changed secret\n");
    assert.equal(verifyExecutionAttestation({ worktree, attestation }).matches, true);
    rmSync(join(worktree, "scratch", "link.txt"));
    symlinkSync(`${target}.different`, join(worktree, "scratch", "link.txt"));
    assert.ok(verifyExecutionAttestation({ worktree, attestation }).mismatches.includes("relevantUntrackedFingerprint"));
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
}));

test("attestation rejects overlapping owned and read-only paths", () => withFixture((worktree) => {
  assert.throws(
    () => captureExecutionAttestation({
      worktree,
      ownedPaths: ["src"],
      readOnlyPaths: ["src/readonly.txt"],
      executionBinding: executionBinding()
    }),
    /Owned and read-only paths overlap/
  );
}));

test("Work Order envelope follows the Worker contract and verifies unchanged", () => withFixture((worktree) => {
  const script = join(import.meta.dirname, "../../scripts/attestation.mjs");
  const captureInput = JSON.stringify({
    schemaVersion: 2,
    worktree,
    ownedPaths: ["src/owned.txt"],
    readOnlyPaths: ["src/readonly.txt"],
    executionBinding: executionBinding({
      workOrderId: "wo-track-fixture",
      harnessMode: "Track unit",
      trackGate: { state: "passed", trackId: "20260903_fixture", unitIds: ["task-1"] }
    })
  });
  const captured = spawnSync(process.execPath, [script, "capture"], { input: captureInput, encoding: "utf8" });
  assert.equal(captured.status, 0, captured.stdout);
  const envelope = JSON.parse(captured.stdout).envelope;

  const template = readFileSync(join(import.meta.dirname, "../../templates/work-order.md"), "utf8");
  const workOrder = template
    .replace("<optional stable identifier>", "wo-track-fixture")
    .replace("<Quick|Scoped|Track unit>", "Track unit")
    .replace("<resolved host model id or alias>", "provider/model")
    .replace("<resolved host reasoning depth or variant>", "high")
    .replace("<verified host Agent name or direct dispatch>", "dev-harness-worker")
    .replace("<project config|current Session answer|per-dispatch answer>", "project config")
    .replace("<resolved path to this installed Skill's scripts/attestation.mjs>", script)
    .replace(
      "<paste the complete `envelope` object returned by the capture command without modification>",
      JSON.stringify(envelope, null, 2)
    );
  const verifier = workOrder.match(/- \*\*Verifier:\*\* `([^`]+)`/)[1];
  const embedded = JSON.parse(workOrder.match(/### Verification Envelope\n\n```json\n([\s\S]+?)\n```/)[1]);
  assert.equal(embedded.attestation.executionBinding.workOrderId, "wo-track-fixture");
  assert.equal(embedded.attestation.executionBinding.harnessMode, "Track unit");
  assert.equal(embedded.attestation.executionBinding.child.model, "provider/model");
  assert.equal(embedded.attestation.executionBinding.trackGate.state, "passed");

  const verified = spawnSync(process.execPath, [verifier, "verify"], {
    input: JSON.stringify(embedded),
    encoding: "utf8"
  });
  assert.equal(verified.status, 0, verified.stdout);
  assert.equal(JSON.parse(verified.stdout).ok, true);

  writeFileSync(join(worktree, "src", "owned.txt"), "CLI mismatch\n");
  const mismatch = spawnSync(process.execPath, [script, "verify"], {
    input: JSON.stringify(embedded),
    encoding: "utf8"
  });
  assert.notEqual(mismatch.status, 0);
  assert.ok(JSON.parse(mismatch.stdout).mismatches.includes("unstagedDiffFingerprint"));
}));

test("attestation rejects missing fields and placeholder scope before dispatch", () => withFixture((worktree) => {
  const script = join(import.meta.dirname, "../../scripts/attestation.mjs");
  const attestation = capture(worktree);
  delete attestation.baselineRevision;
  const missing = verifyExecutionAttestation({ worktree, attestation });
  assert.equal(missing.matches, false);
  assert.deepEqual(missing.mismatches, ["invalidAttestation"]);
  const missingCli = spawnSync(process.execPath, [script, "verify"], {
    input: JSON.stringify({ schemaVersion: 2, worktree, attestation }),
    encoding: "utf8"
  });
  assert.notEqual(missingCli.status, 0);
  assert.match(JSON.parse(missingCli.stdout).error, /baselineRevision/);

  const placeholderCli = spawnSync(process.execPath, [script, "capture"], {
    input: JSON.stringify({
      schemaVersion: 2,
      worktree,
      ownedPaths: ["<owned-path>"],
      readOnlyPaths: [],
      executionBinding: executionBinding()
    }),
    encoding: "utf8"
  });
  assert.notEqual(placeholderCli.status, 0);
  assert.match(JSON.parse(placeholderCli.stdout).error, /Unsafe scope path/);
}));

test("attestation binds child settings and the passed Track gate", () => withFixture((worktree) => {
  const attestation = capture(worktree, [], executionBinding({
    workOrderId: "wo-track-fixture",
    harnessMode: "Track unit",
    trackGate: { state: "passed", trackId: "20260903_fixture", unitIds: ["task-1", "task-2"] }
  }));
  const changedGate = structuredClone(attestation);
  changedGate.executionBinding.trackGate.unitIds = ["task-3"];
  assert.ok(verifyExecutionAttestation({ worktree, attestation: changedGate }).mismatches.includes("scopeFingerprint"));

  const changedModel = structuredClone(attestation);
  changedModel.executionBinding.child.model = "provider/other-model";
  assert.ok(verifyExecutionAttestation({ worktree, attestation: changedModel }).mismatches.includes("scopeFingerprint"));

  const missingModel = structuredClone(attestation);
  delete missingModel.executionBinding.child.model;
  assert.deepEqual(verifyExecutionAttestation({ worktree, attestation: missingModel }).mismatches, ["invalidAttestation"]);

  assert.throws(
    () => capture(worktree, [], executionBinding({
      harnessMode: "Track unit",
      trackGate: { state: "not-applicable", trackId: null, unitIds: [] }
    })),
    /requires a passed Track gate/
  );
}));
