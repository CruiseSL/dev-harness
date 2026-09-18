import assert from "node:assert/strict";
import test from "node:test";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createFilesystemSource, evaluateStatic, readJson } from "./score.mjs";

const evaluatorRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(evaluatorRoot, "../..");
const source = createFilesystemSource(repositoryRoot);

test("candidate worker closes recursive control paths", () => {
  const report = evaluateStatic({
    source,
    routes: [],
    safetyCases: readJson(join(evaluatorRoot, "cases/candidate-safety.json")).cases.filter((safetyCase) => safetyCase.type === "worker-permission"),
    normativeRules: [],
    packageFiles: []
  });
  assert.deepEqual(report.safety.map((result) => result.status), ["pass", "pass", "pass"]);

  const worker = source.read("templates/opencode-worker.md");
  for (const text of [
    "Reject the Work Order as `blocked` with zero writes",
    "complete, unmodified schema version 2 Verification Envelope",
    "already the complete CLI input",
    "reports any mismatch or invalid attestation",
    "Do not load Dev Harness, `SKILL.md`, or another controller",
    "Return the requested operation to the Coordinator",
    "Do not claim harness-level acceptance"
  ]) {
    assert.ok(worker.includes(text), `Worker is missing rejection boundary: ${text}`);
  }
});

test("Work Order and runtime protocols require an attestation before writes", () => {
  const workOrder = source.read("templates/work-order.md");
  for (const field of [
    "**Verifier:**",
    "**Baseline status:**",
    "### Verification Envelope",
    "complete `envelope` object",
    "schema version 2",
    "already the complete stdin"
  ]) {
    assert.ok(workOrder.includes(field), `Work Order is missing ${field}`);
  }

  const orchestration = source.read("references/orchestration.md");
  assert.ok(orchestration.includes("Reject a missing, placeholder, stale, or ambiguous attestation before dispatch"));
  assert.ok(orchestration.includes("When the runtime creates a separate worktree"));

  const execution = source.read("references/execution.md");
  assert.ok(execution.includes("Stop as `blocked` with zero writes when `verify` exits nonzero"));
  assert.ok(execution.includes("reports a mismatch or invalid attestation"));
  assert.ok(execution.includes("Do not repair the attestation from inference."));
});
