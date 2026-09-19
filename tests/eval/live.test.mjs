import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { isAbsolute, join } from "node:path";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  aggregateLivePilot,
  buildProtocolBundle,
  collectLiveRunEvidence,
  createLivePlan,
  createLivePrompt,
  executeLivePilot,
  invokeOpenCode,
  makeAbbaPlan,
  opencodeCommand,
  renderProtocolBundle
} from "./live.mjs";

function source(files, label = "fixture") {
  return {
    label,
    read(path) {
      if (!(path in files)) throw new Error(`Missing fixture source ${path}`);
      return files[path];
    }
  };
}

function route() {
  return {
    id: "track-matching-named-agent",
    coordinator: ["coordinator.md"],
    templates: ["template.md"],
    worker: ["worker.md"]
  };
}

function bundle(side) {
  return buildProtocolBundle({
    side,
    route: route(),
    source: source({
      "coordinator.md": "Coordinator",
      "template.md": "Template",
      "worker.md": "Worker"
    }, side)
  });
}

function terminalEvents({ input = 100, output = 40, cache = 10, total = 150, plannedChildDispatchCount = 1 } = {}) {
  return [
    { type: "session.created", sessionId: "ses-1" },
    { type: "step_finish", usage: { input, output, cache, total } },
    { type: "text", text: JSON.stringify({ terminalState: "completed", plannedChildDispatchCount, summary: "controlled" }) }
  ].map((event) => JSON.stringify(event)).join("\n");
}

function fakeChildProcess({ closeOnKill = true } = {}) {
  const child = new EventEmitter();
  child.pid = 98765;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.killSignals = [];
  child.kill = (signal) => {
    child.killSignals.push(signal);
    if (closeOnKill) setImmediate(() => child.emit("close", null, signal));
    return true;
  };
  return child;
}

test("protocol bundles preserve declared stages and label byte measurements", () => {
  const result = bundle("candidate");
  assert.deepEqual(result.files.map((file) => [file.stage, file.path]), [
    ["coordinator", "coordinator.md"],
    ["template", "template.md"],
    ["worker", "worker.md"]
  ]);
  assert.equal(result.coordinatorProtocolBytes, 11);
  assert.equal(result.templateBytes, 8);
  assert.equal(result.workerSystemBytes, 6);
  assert.equal(result.protocolBytes, 19);
  assert.equal(result.bundleBytes, 25);
  assert.match(result.measurement, /protocol bytes, not provider token counts/);
  assert.match(renderProtocolBundle(result), /### worker.md/);
});

test("dry plans are deterministic, non-executing, and counterbalanced", () => {
  const baselineBundle = bundle("baseline");
  const candidateBundle = bundle("candidate");
  const plan = createLivePlan({
    route: route().id,
    repetitions: 1,
    model: "vertexflow/gpt-5.6-terra",
    variant: "xhigh",
    baselineBundle,
    candidateBundle
  });
  assert.equal(plan.status, "dry-run");
  assert.equal(plan.execution.status, "non-executing");
  assert.equal(plan.execution.modelCalls, false);
  assert.deepEqual(plan.order.map((entry) => entry.side), ["baseline", "candidate", "candidate", "baseline"]);
  assert.deepEqual(makeAbbaPlan(route().id, 2).map((entry) => entry.side), [
    "baseline", "candidate", "candidate", "baseline",
    "candidate", "baseline", "baseline", "candidate"
  ]);
  assert.deepEqual(makeAbbaPlan(route().id, 2).map((entry) => entry.position), [1, 2, 3, 4, 1, 2, 3, 4]);
});

test("live evidence records provider fields, tool violations, and fixture safety", () => {
  const stdout = `${terminalEvents()}\n${JSON.stringify({ type: "tool_call", tool: "task", callId: "call-1" })}`;
  const evidence = collectLiveRunEvidence({
    stdout,
    exitCode: 0,
    elapsedMs: 123,
    processTiming: { firstStdoutMs: 12, lastStdoutMs: 122, postOutputMs: 1 },
    fixtureStatus: " M protocol-bundle.md\n"
  });
  assert.deepEqual(evidence.providerTokens, {
    inputTokens: 100,
    outputTokens: 40,
    cacheTokens: 10,
    totalTokens: 150,
    unavailable: {}
  });
  assert.equal(evidence.sessionCount, 1);
  assert.deepEqual(evidence.processTiming, { firstStdoutMs: 12, lastStdoutMs: 122, postOutputMs: 1 });
  assert.equal(evidence.turns, 1);
  assert.equal(evidence.toolCallCount, 1);
  assert.equal(evidence.taskToolChildCallCount, 1);
  assert.equal(evidence.plannedChildDispatchCount, 1);
  assert.equal(evidence.terminalState, "completed");
  assert.deepEqual(evidence.hardGates.failures, ["fixture-write-detected", "prohibited-tool-use"]);
});

test("live evidence keeps unavailable provider fields null with reasons and rejects malformed terminals", () => {
  const evidence = collectLiveRunEvidence({
    stdout: `${JSON.stringify({ type: "session.created", sessionId: "ses-2" })}\n${JSON.stringify({ type: "text", text: "not json" })}`,
    exitCode: 0,
    elapsedMs: 11
  });
  assert.equal(evidence.providerTokens.inputTokens, null);
  assert.match(evidence.providerTokens.unavailable.inputTokens, /did not include provider usage/);
  assert.equal(evidence.plannedChildDispatchCount, null);
  assert.equal(evidence.terminalState, null);
  assert.deepEqual(evidence.hardGates.failures, ["malformed-final-result"]);
});

test("OpenCode commands put the prompt before the greedy absolute fixture option", () => {
  const prompt = "Shared controlled prompt.";
  const protocolBundlePath = "/private/tmp/live fixture/protocol-bundle.md";
  const command = opencodeCommand({
    model: "vertexflow/gpt-5.6-terra",
    variant: "xhigh",
    protocolBundlePath,
    prompt
  });
  const fileArgument = `--file=${protocolBundlePath}`;
  const fileIndex = command.indexOf(fileArgument);

  assert.equal(command.indexOf(prompt), 1);
  assert.equal(isAbsolute(protocolBundlePath), true);
  assert.equal(command.filter((argument) => argument.startsWith("--file=")).length, 1);
  assert.equal(command.includes("--file"), false);
  assert.equal(fileIndex > command.indexOf(prompt), true);
});

test("live prompts preserve the selected route's dispatch semantics", () => {
  const quickPrompt = createLivePrompt({
    route: "quick-single-file-change",
    expectedPlannedChildDispatchCount: 0
  });
  const trackPrompt = createLivePrompt({
    route: "track-matching-named-agent",
    expectedPlannedChildDispatchCount: 1
  });

  assert.match(quickPrompt, /does not declare a child dispatch/);
  assert.doesNotMatch(quickPrompt, /already-approved Track/);
  assert.match(quickPrompt, /\{"terminalState":"completed","plannedChildDispatchCount":0\}/);
  assert.match(trackPrompt, /already-approved Track/);
  assert.match(trackPrompt, /\{"terminalState":"completed","plannedChildDispatchCount":1\}/);
});

test("fake live invocations use fresh fixtures, aggregate ABBA evidence, and remove artifacts", async () => {
  const baselineBundle = bundle("baseline");
  const candidateBundle = bundle("candidate");
  const fixturePaths = [];
  let call = 0;
  const result = await executeLivePilot({
    route: route().id,
    repetitions: 1,
    model: "vertexflow/gpt-5.6-terra",
    variant: "xhigh",
    baselineBundle,
    candidateBundle,
    invoke: async ({ cwd, command }) => {
      fixturePaths.push(cwd);
      assert.equal(command.includes("--pure"), true);
      assert.equal(command.includes("--format"), true);
      assert.equal(command.includes(`--file=${join(cwd, "protocol-bundle.md")}`), true);
      call += 1;
      return {
        stdout: terminalEvents({ input: call * 10, output: 5, cache: 1, total: call * 10 + 6 }),
        stderr: "",
        exitCode: 0,
        signal: null,
        elapsedMs: call * 100,
        processTiming: { firstStdoutMs: call * 10, lastStdoutMs: call * 90, postOutputMs: call * 10 }
      };
    }
  });
  assert.equal(result.status, "completed");
  assert.deepEqual(result.runs.map((run) => run.side), ["baseline", "candidate", "candidate", "baseline"]);
  assert.equal(new Set(fixturePaths).size, 4);
  assert.equal(result.aggregate.baseline.totalTokens.median, 31);
  assert.equal(result.aggregate.candidate.totalTokens.median, 31);
  assert.equal(result.aggregate.reductions.medianTotalTokens.reduction, 0);
  assert.equal(result.aggregate.baseline.firstStdoutMs.median, 25);
  assert.equal(result.aggregate.candidate.postOutputMs.median, 25);
  assert.equal(result.runs.every((run) => run.command[2] === "<shared-prompt>"), true);
  assert.equal(result.runs.every((run) => run.command.includes("--file=protocol-bundle.md")), true);
  assert.equal(result.runs.some((run) => fixturePaths.some((fixturePath) => run.command.some((argument) => argument.includes(fixturePath)))), false);
});

test("aggregate reports reductions for provider tokens, elapsed time, and child counts", () => {
  const makeRun = (side, totalTokens, elapsedMs, actual, declared) => ({
    side,
    providerTokens: { totalTokens },
    elapsedMs,
    taskToolChildCallCount: actual,
    plannedChildDispatchCount: declared,
    hardGates: { passed: true }
  });
  const report = aggregateLivePilot([
    makeRun("baseline", 200, 100, 1, 2),
    makeRun("baseline", 100, 200, 1, 2),
    makeRun("candidate", 80, 90, 0, 1),
    makeRun("candidate", 120, 110, 0, 1)
  ]);
  assert.deepEqual(report.baseline.totalTokens, { median: 150, p90: 200, reason: null });
  assert.deepEqual(report.candidate.elapsedMs, { median: 100, p90: 110, reason: null });
  assert.equal(report.reductions.medianTotalTokens.reduction, 50);
  assert.equal(report.reductions.actualTaskToolChildCalls.reduction, 2);
  assert.equal(report.reductions.declaredChildDispatches.reduction, 2);
});

test("OpenCode invocation bounds output and reports a timed-out process after cooperative cancellation", async () => {
  const child = fakeChildProcess();
  const result = await invokeOpenCode({
    cwd: "/private/tmp",
    command: [],
    timeoutMs: 5,
    killGraceMs: 1,
    maxOutputBytes: 4,
    spawnProcess: () => child
  });
  assert.equal(result.timedOut, true);
  assert.equal(result.cancelled, false);
  assert.equal(result.terminationReason, "timeout");
  assert.deepEqual(child.killSignals, ["SIGINT"]);
});

test("OpenCode invocation settles after escalation when a child never emits close", async () => {
  const child = fakeChildProcess({ closeOnKill: false });
  const result = await invokeOpenCode({
    cwd: "/private/tmp",
    command: [],
    timeoutMs: 2,
    killGraceMs: 1,
    spawnProcess: () => child
  });
  assert.equal(result.timedOut, true);
  assert.equal(result.settledAfterKill, true);
  assert.deepEqual(child.killSignals, ["SIGINT", "SIGTERM", "SIGKILL"]);
});

test("OpenCode invocation responds to AbortSignal and caps each output stream", async () => {
  const child = fakeChildProcess();
  const controller = new AbortController();
  const resultPromise = invokeOpenCode({
    cwd: "/private/tmp",
    command: [],
    timeoutMs: 1000,
    maxOutputBytes: 4,
    signal: controller.signal,
    spawnProcess: () => child
  });
  child.stdout.emit("data", "123456789");
  child.stderr.emit("data", "abcdefgh");
  controller.abort();
  const result = await resultPromise;
  assert.equal(result.cancelled, true);
  assert.equal(result.timedOut, false);
  assert.equal(result.outputTruncated, true);
  assert.equal(Buffer.byteLength(result.stdout), 4);
  assert.equal(Buffer.byteLength(result.stderr), 4);
  assert.equal(result.terminationReason, "cancelled");
});

test("live journals checkpoint completed samples and resume only unrecorded identities", async () => {
  const baselineBundle = bundle("baseline");
  const candidateBundle = bundle("candidate");
  const journalRoot = mkdtempSync(join(tmpdir(), "dev-harness-live-journal-"));
  const journalPath = join(journalRoot, "pilot.json");
  const controller = new AbortController();
  let firstCalls = 0;
  const invoke = async () => {
    firstCalls += 1;
    if (firstCalls === 2) controller.abort();
    return {
      stdout: terminalEvents(),
      stderr: "",
      exitCode: 0,
      signal: null,
      elapsedMs: 1,
      processTiming: { firstStdoutMs: 1, lastStdoutMs: 1, postOutputMs: 0 }
    };
  };
  try {
    const partial = await executeLivePilot({
      route: route().id,
      repetitions: 1,
      model: "vertexflow/gpt-5.6-terra",
      variant: "xhigh",
      baselineBundle,
      candidateBundle,
      journalPath,
      signal: controller.signal,
      invoke
    });
    assert.equal(partial.status, "cancelled");
    assert.equal(partial.runs.length, 2);
    assert.equal(JSON.parse(readFileSync(journalPath, "utf8")).runs.length, 2);

    let resumeCalls = 0;
    const resumed = await executeLivePilot({
      route: route().id,
      repetitions: 1,
      model: "vertexflow/gpt-5.6-terra",
      variant: "xhigh",
      baselineBundle,
      candidateBundle,
      journalPath,
      resume: true,
      invoke: async () => {
        resumeCalls += 1;
        return {
          stdout: terminalEvents(),
          stderr: "",
          exitCode: 0,
          signal: null,
          elapsedMs: 1,
          processTiming: { firstStdoutMs: 1, lastStdoutMs: 1, postOutputMs: 0 }
        };
      }
    });
    assert.equal(resumed.status, "completed");
    assert.equal(resumed.runs.length, 4);
    assert.equal(resumed.recovery.reusedRunCount, 2);
    assert.equal(resumeCalls, 2);
    assert.equal(JSON.parse(readFileSync(journalPath, "utf8")).runs.length, 4);
  } finally {
    rmSync(journalRoot, { recursive: true, force: true });
  }
});
