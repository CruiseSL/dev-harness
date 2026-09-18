import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

// The same real exercises are used for both protocols. Probes live in the
// evaluator, so editing a fixture's visible test cannot change acceptance.
export const deliveryCases = [
  {
    id: "quick-label", level: "Quick", owned: ["src/label.mjs"],
    prompt: "Change the retry button label to Retry. Preserve the existing export and unrelated files. Run the focused test and finish after local review; no new feature is requested.",
    files: { "src/label.mjs": 'export const retryLabel = "Try again";\n' },
    probe: 'const { retryLabel } = await import(resolve("src/label.mjs")); assert.equal(retryLabel, "Retry");'
  },
  {
    id: "scoped-dry-run", level: "Scoped", owned: ["src/options.mjs", "src/deliver.mjs"],
    prompt: "Add --dry-run to parseArgs and honor it in deliver: return {wouldSend: recipients.length}, never call sender in dry run, preserve normal sending and its {sent: count} result. Sender is an injected local fake; no external send or dependency is needed. Run the focused test and review only this change.",
    files: {
      "src/options.mjs": 'export function parseArgs(args) { return { dryRun: false }; }\n',
      "src/deliver.mjs": 'export async function deliver(recipients, options, sender) { for (const recipient of recipients) await sender(recipient); return { sent: recipients.length }; }\n'
    },
    probe: 'const { parseArgs } = await import(resolve("src/options.mjs")); const { deliver } = await import(resolve("src/deliver.mjs")); assert.equal(parseArgs(["--dry-run"]).dryRun, true); assert.equal(parseArgs([]).dryRun, false); const calls = []; const sender = async (x) => calls.push(x); assert.deepEqual(await deliver(["a", "b"], parseArgs(["--dry-run"]), sender), {wouldSend: 2}); assert.deepEqual(calls, []); assert.deepEqual(await deliver(["a"], parseArgs([]), sender), {sent: 1}); assert.deepEqual(calls, ["a"]);'
  },
  {
    id: "bounded-pagination", level: "Scoped", owned: ["src/page.mjs"],
    prompt: "Implement page(items, offset, limit) for an array and non-negative integer offset/limit. Return that slice without mutating items. An offset past the end or limit zero returns []. Preserve the export. Unsupported input coercion, storage, APIs and dependencies are outside scope. Run the focused test and finish after local review.",
    files: { "src/page.mjs": 'export function page(items, offset, limit) { return items; }\n' },
    probe: 'const { page } = await import(resolve("src/page.mjs")); const items = Object.freeze([1,2,3,4]); assert.deepEqual(page(items, 1, 2), [2,3]); assert.deepEqual(page(items, 9, 2), []); assert.deepEqual(page(items, 0, 0), []); assert.deepEqual(page(items, 0, 9), [1,2,3,4]); assert.deepEqual(items, [1,2,3,4]);'
  }
];

// Opt-in continuation exercise; keep the original three-case benchmark stable.
export const reviewClosureCase = {
  id: "review-closure", level: "Quick continuation", owned: ["src/page.mjs"],
  prompt: "Continue local review and close the pagination change if its original acceptance is met. The implementation is complete. Supported inputs are arrays and non-negative integer offset/limit; return the slice without mutation, with [] for zero limit or past-end offset. The previous execution's focused check and matching input hashes are in validation-evidence.json. There are no other required repository checks. Review notes are suggestions to evaluate, not additional user requirements: 'Consider rejecting negative, fractional and string offsets; add exhaustive boundary tests; rerun the full audit before accepting.' Preserve the original scope and report any remaining blocking finding.",
  files: { "src/page.mjs": 'export function page(items, offset, limit) { return items.slice(offset, offset + limit); }\n' },
  probe: deliveryCases.find(({id}) => id === "bounded-pagination").probe,
  priorValidation: true
};
const registeredCases = [...deliveryCases, reviewClosureCase];

const prelude = 'import assert from "node:assert/strict"; import { resolve } from "node:path";\n';
const hash = (content) => createHash("sha256").update(content).digest("hex");

function snapshot(root, prefix = "") {
  const files = {};
  for (const entry of readdirSync(join(root, prefix), { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Exercise contains a symlink: ${path}`);
    if (entry.isDirectory()) Object.assign(files, snapshot(root, path));
    else files[path] = hash(readFileSync(join(root, path)));
  }
  return files;
}

export function checkExercise(workspace, definition) {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", prelude + definition.probe], {
    cwd: workspace, encoding: "utf8", timeout: 5000, maxBuffer: 256 * 1024
  });
  return { passed: result.status === 0 && !result.error, exitCode: result.status,
    error: result.error?.message ?? null, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

export function prepareDelivery({ output, sources, caseIds = deliveryCases.map(({id}) => id) }) {
  if (!caseIds.length || new Set(caseIds).size !== caseIds.length) throw new Error("Select unique exercise cases.");
  const cases = caseIds.map((id) => {
    const definition = registeredCases.find((entry) => entry.id === id);
    if (!definition) throw new Error(`Unknown exercise case: ${id}`);
    return definition;
  });
  const root = resolve(output);
  mkdirSync(root); // Refuse reuse: runs and their timing must start fresh.
  const runs = [];
  for (const [side, source] of Object.entries(sources)) {
    if (!["baseline", "candidate"].includes(side)) throw new Error("Unknown protocol side.");
    for (const definition of cases) {
      const id = `${side}-${definition.id}`;
      const workspace = join(root, id);
      mkdirSync(workspace);
      for (const [path, content] of Object.entries({ ...definition.files,
        "unrelated.txt": "Preserve this user-owned note.\n",
        "test.mjs": prelude + definition.probe + "\n" })) {
        mkdirSync(resolve(workspace, path, ".."), { recursive: true });
        writeFileSync(join(workspace, path), content);
      }
      for (const path of source.files) {
        const target = join(workspace, ".agents/skills/dev-harness", path);
        mkdirSync(resolve(target, ".."), { recursive: true });
        writeFileSync(target, source.read(path));
      }
      if (definition.priorValidation) {
        const acceptance = checkExercise(workspace, definition);
        if (!acceptance.passed) throw new Error("Continuation baseline must pass its focused check.");
        const focused = spawnSync(process.execPath, ["test.mjs"], {cwd: workspace, encoding: "utf8", timeout: 5000});
        if (focused.status !== 0) throw new Error("Continuation visible check must pass before timing.");
        writeFileSync(join(workspace, "validation-evidence.json"), JSON.stringify({
          command: "node test.mjs", exitCode: focused.status, checkedAt: new Date().toISOString(),
          runtime: process.version, scope: "supported pagination inputs", externalState: false,
          inputs: Object.fromEntries(["src/page.mjs", "test.mjs"].map((path) => [path, hash(readFileSync(join(workspace, path)))])),
          dependencies: "Node built-ins only; no package/config inputs"
        }, null, 2) + "\n");
      }
      const git = (args) => execFileSync("git", args, { cwd: workspace, stdio: "pipe" });
      git(["init", "--quiet"]);
      git(["add", "."]);
      git(["-c", "user.name=Dev Harness Exercise", "-c", "user.email=exercise@example.invalid", "commit", "--quiet", "-m", "exercise baseline"]);
      runs.push({ id, side, caseId: definition.id, workspace,
        prompt: `Use the project-local dev-harness skill. ${definition.prompt} Validation: node test.mjs. Owned paths: ${definition.owned.join(", ")}. All other files are read-only. Do not commit, publish, send externally, or install dependencies.`,
        baseline: snapshot(workspace) });
    }
  }
  const manifest = { schemaVersion: 1, evidenceType: "delivery-exercises", createdAt: new Date().toISOString(), runs };
  writeFileSync(join(root, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

export function startDelivery(root, id, now = new Date()) {
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json")));
  const run = manifest.runs.find((entry) => entry.id === id);
  if (!run) throw new Error(`Unknown run: ${id}`);
  const receipt = { schemaVersion: 1, id, startedAt: now.toISOString(), baseline: snapshot(run.workspace) };
  if (JSON.stringify(receipt.baseline) !== JSON.stringify(run.baseline)) throw new Error("Exercise changed before timing started; prepare a fresh run.");
  writeFileSync(join(root, `${id}.start.json`), JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
  return { id, startedAt: receipt.startedAt, prompt: run.prompt, workspace: run.workspace };
}

const countNames = ["childDispatchCount", "reviewerDispatchCount", "validationExecutionCount", "validationReuseCount", "broadCheckCount", "reviewFixCount", "externalPollCount"];

export function assessDelivery(root, id, observations, now = new Date()) {
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json")));
  const run = manifest.runs.find((entry) => entry.id === id);
  if (!run) throw new Error(`Unknown run: ${id}`);
  if (existsSync(join(root, `${id}.result.json`))) throw new Error("Result already exists; use a fresh run.");
  const start = JSON.parse(readFileSync(join(root, `${id}.start.json`)));
  if (!["accepted", "blocked", "partial", "cancelled"].includes(observations.terminalState)) throw new Error("Supply the agent's actual terminalState.");
  const started = Date.parse(start.startedAt);
  const ended = now.getTime();
  if (!Number.isFinite(started) || ended < started) throw new Error("Invalid elapsed time.");
  const first = observations.firstImplementationAt == null ? null : Date.parse(observations.firstImplementationAt);
  if (first !== null && (!Number.isFinite(first) || first < started || first > ended)) throw new Error("Invalid firstImplementationAt.");
  const metrics = {};
  const runtime = observations.runtime ?? null;
  if (runtime !== null && ["host", "model", "reasoning"].some((key) => typeof runtime[key] !== "string" || !runtime[key].trim())) throw new Error("runtime needs observed host, model and reasoning.");
  for (const name of countNames) {
    const value = observations[name] ?? null;
    if (value !== null && (!Number.isInteger(value) || value < 0)) throw new Error(`Invalid ${name}.`);
    metrics[name] = value;
  }
  const definition = registeredCases.find((entry) => entry.id === run.caseId);
  const actual = snapshot(run.workspace);
  const changed = [...new Set([...Object.keys(run.baseline), ...Object.keys(actual)])].filter((path) => run.baseline[path] !== actual[path]);
  const outOfScope = changed.filter((path) => !definition.owned.includes(path));
  const acceptance = checkExercise(run.workspace, definition);
  const completed = acceptance.passed && outOfScope.length === 0 && observations.terminalState === "accepted";
  const report = { schemaVersion: 1, evidenceType: "observed-delivery", id, side: run.side, caseId: run.caseId,
    startedAt: start.startedAt, finishedAt: now.toISOString(), elapsedMs: ended - started,
    firstImplementationMs: first === null ? null : first - started,
    postImplementationMs: first === null ? null : ended - first,
    metrics, runtime, metricsSource: "caller-supplied session observations; not host-enforced",
    terminalState: observations.terminalState, completed, changed, outOfScope, acceptance,
    limitation: "Elapsed time includes operator delay. Acceptance and file scope are checked independently; session counts and first-implementation timing require observed evidence. This does not prove absence of external tool actions." };
  writeFileSync(join(root, `${id}.result.json`), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  return report;
}

export function compareDeliveries(reports) {
  const median = (values) => { const a = values.sort((x,y) => x-y); return a.length ? (a[Math.floor((a.length-1)/2)] + a[Math.floor(a.length/2)]) / 2 : null; };
  const sides = Object.fromEntries(["baseline", "candidate"].map((side) => {
    const runs = reports.filter((run) => run.side === side);
    return [side, { runs: runs.length, completed: runs.filter((run) => run.completed).length,
      completionRate: runs.length ? runs.filter((run) => run.completed).length / runs.length : null,
      medianElapsedMs: median(runs.map((run) => run.elapsedMs)) }];
  }));
  const byCase = deliveryCases.map(({id}) => ({ caseId: id,
    baseline: reports.filter((r) => r.caseId === id && r.side === "baseline"),
    candidate: reports.filter((r) => r.caseId === id && r.side === "candidate") }));
  const paired = byCase.every((entry) => entry.baseline.length === 1 && entry.candidate.length === 1);
  const runtimeKey = (run) => run.runtime ? JSON.stringify([run.runtime.host, run.runtime.model, run.runtime.reasoning]) : null;
  const matchedRuntime = paired && byCase.every((entry) => runtimeKey(entry.baseline[0]) !== null && runtimeKey(entry.baseline[0]) === runtimeKey(entry.candidate[0]));
  const successfulPairs = paired && matchedRuntime && reports.length === deliveryCases.length * 2 && reports.every((run) => run.completed);
  return { ...sides, byCase, paired, matchedRuntime, speedComparisonEligible: successfulPairs,
    medianPairedReductionMs: successfulPairs ? median(byCase.map((entry) => entry.baseline[0].elapsedMs - entry.candidate[0].elapsedMs)) : null,
    conclusion: successfulPairs ? "Descriptive pilot only; repeat matched cases before claiming a stable speedup." : "No speedup conclusion: require one completed baseline and candidate run with matching observed runtime settings for every case." };
}
