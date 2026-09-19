import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export const LIVE_EVALUATION_SCHEMA_VERSION = 1;
export const DEFAULT_LIVE_AGENT = "dev-harness-live-evaluator";
export const MATCHING_TRACK_AGENT = "dev-harness-worker";
export const LIVE_PROTOCOL_MEASUREMENT = "UTF-8 protocol bytes, not provider token counts.";
export const DEFAULT_LIVE_TIMEOUT_MS = 120_000;
export const DEFAULT_LIVE_OUTPUT_BYTES = 4 * 1024 * 1024;
export const LIVE_JOURNAL_SCHEMA_VERSION = 1;
const PROCESS_KILL_GRACE_MS = 500;

export function createLiveAbortController() {
  const controller = new AbortController();
  const abort = () => controller.abort();
  process.once("SIGINT", abort);
  process.once("SIGTERM", abort);
  return {
    signal: controller.signal,
    dispose() {
      process.removeListener("SIGINT", abort);
      process.removeListener("SIGTERM", abort);
    }
  };
}

const STAGES = [
  ["coordinator", "coordinator"],
  ["templates", "template"],
  ["worker", "worker"]
];

const INPUT_TOKEN_KEYS = ["input", "inputTokens", "input_tokens", "promptTokens", "prompt_tokens"];
const OUTPUT_TOKEN_KEYS = ["output", "outputTokens", "output_tokens", "completionTokens", "completion_tokens"];
const CACHE_TOKEN_KEYS = ["cache", "cacheTokens", "cache_tokens", "cachedTokens", "cached_tokens", "cacheReadTokens", "cache_read_tokens"];
const TOTAL_TOKEN_KEYS = ["total", "totalTokens", "total_tokens"];

function byteLength(content) {
  return Buffer.byteLength(content, "utf8");
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function bundleContentFingerprint(bundle) {
  return sha256(bundle.files
    .map(({ stage, path, bytes, content }) => `${stage}\0${path}\0${bytes}\0${content}\0`)
    .join(""));
}

function appendCapped(current, chunk, maxBytes) {
  const incoming = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
  const currentBytes = Buffer.byteLength(current, "utf8");
  const remaining = Math.max(0, maxBytes - currentBytes);
  if (incoming.length <= remaining) return { value: `${current}${incoming.toString("utf8")}`, truncated: false };
  return {
    value: `${current}${incoming.subarray(0, remaining).toString("utf8")}`,
    truncated: true
  };
}

function unique(values) {
  return [...new Set(values)];
}

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${label} must be a non-negative integer.`);
  return value;
}

function valueAt(record, keys) {
  for (const key of keys) {
    if (Number.isFinite(record?.[key])) return record[key];
  }
  return null;
}

function cacheValue(record) {
  const direct = valueAt(record, CACHE_TOKEN_KEYS);
  if (direct !== null) return direct;
  if (!record?.cache || typeof record.cache !== "object") return null;
  const components = ["read", "write", "input", "output", "tokens"]
    .map((key) => record.cache[key])
    .filter(Number.isFinite);
  return components.length > 0 ? components.reduce((total, value) => total + value, 0) : null;
}

function normalizeUsage(record) {
  return {
    inputTokens: valueAt(record, INPUT_TOKEN_KEYS),
    outputTokens: valueAt(record, OUTPUT_TOKEN_KEYS),
    cacheTokens: cacheValue(record),
    totalTokens: valueAt(record, TOTAL_TOKEN_KEYS)
  };
}

function collectUsageRecords(value, records = []) {
  if (Array.isArray(value)) {
    for (const entry of value) collectUsageRecords(entry, records);
    return records;
  }
  if (!value || typeof value !== "object") return records;

  for (const key of ["usage", "tokens", "tokenUsage", "token_usage"]) {
    if (value[key] && typeof value[key] === "object" && !Array.isArray(value[key])) {
      records.push(normalizeUsage(value[key]));
    }
  }

  for (const [key, entry] of Object.entries(value)) {
    if (["usage", "tokens", "tokenUsage", "token_usage"].includes(key)) continue;
    collectUsageRecords(entry, records);
  }
  return records;
}

function aggregateProviderTokens(records) {
  const unavailable = {};
  const tokens = {};
  for (const field of ["inputTokens", "outputTokens", "cacheTokens", "totalTokens"]) {
    if (records.length === 0) {
      tokens[field] = null;
      unavailable[field] = "OpenCode JSON events did not include provider usage.";
      continue;
    }
    if (records.some((record) => record[field] === null)) {
      tokens[field] = null;
      unavailable[field] = `Provider did not report ${field} for every usage event.`;
      continue;
    }
    tokens[field] = records.reduce((total, record) => total + record[field], 0);
  }
  return { ...tokens, unavailable };
}

function collectEventObjects(value, visitor) {
  if (Array.isArray(value)) {
    for (const entry of value) collectEventObjects(entry, visitor);
    return;
  }
  if (!value || typeof value !== "object") return;
  visitor(value);
  for (const entry of Object.values(value)) collectEventObjects(entry, visitor);
}

function normalizeEventType(value) {
  return typeof value === "string" ? value.toLowerCase().replaceAll("_", "-") : "";
}

function collectTextCandidates(events) {
  const candidates = [];
  collectEventObjects(events, (entry) => {
    const type = normalizeEventType(entry.type);
    const role = normalizeEventType(entry.role);
    if ((type === "text" || type.endsWith(".text") || role === "assistant") && typeof entry.text === "string") {
      candidates.push(entry.text);
    }
    if (type === "text" && typeof entry.content === "string") candidates.push(entry.content);
  });
  return candidates;
}

function parseMachineResult(texts) {
  const candidates = [...texts].reverse();
  if (texts.length > 1) candidates.push(texts.join(""));
  for (const text of candidates) {
    try {
      const value = JSON.parse(text.trim());
      if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.terminalState !== "string" || !value.terminalState.trim()) {
        continue;
      }
      if (value.plannedChildDispatchCount !== undefined) {
        positiveInteger(value.plannedChildDispatchCount, "plannedChildDispatchCount");
      }
      return {
        valid: true,
        finalText: text,
        terminalState: value.terminalState,
        plannedChildDispatchCount: value.plannedChildDispatchCount ?? null,
        plannedChildDispatchReason: value.plannedChildDispatchCount === undefined
          ? "Machine result did not declare plannedChildDispatchCount."
          : null,
        value
      };
    } catch {
      // A terminal response must be one complete JSON object, so continue to the next event candidate.
    }
  }
  return {
    valid: false,
    finalText: texts.at(-1) ?? null,
    terminalState: null,
    plannedChildDispatchCount: null,
    plannedChildDispatchReason: "Machine result was unavailable because the terminal JSON result was malformed.",
    value: null
  };
}

function toolCalls(events) {
  const calls = [];
  const seenIds = new Set();
  collectEventObjects(events, (entry) => {
    const type = normalizeEventType(entry.type);
    const name = entry.tool ?? entry.toolName ?? entry.name ?? entry.tool_name ?? null;
    const isCall = type === "tool" || type === "tool-call" || type === "tool-use" || type.endsWith(".tool-call") || type.endsWith(".tool-use");
    if (!isCall || typeof name !== "string") return;
    const id = entry.callID ?? entry.callId ?? entry.toolCallId ?? entry.id ?? null;
    if (id && seenIds.has(id)) return;
    if (id) seenIds.add(id);
    calls.push({ name, id });
  });
  return calls;
}

function sessionIds(events) {
  const ids = [];
  collectEventObjects(events, (entry) => {
    for (const key of ["sessionId", "sessionID", "session_id"]) {
      if (typeof entry[key] === "string" && entry[key]) ids.push(entry[key]);
    }
  });
  return unique(ids);
}

function turnCount(events) {
  let count = 0;
  collectEventObjects(events, (entry) => {
    const type = normalizeEventType(entry.type);
    if (type === "step-finish" || type === "turn-finish" || type.endsWith(".step-finish") || type.endsWith(".turn-finish")) count += 1;
  });
  return count === 0 ? null : count;
}

export function parseJsonEventOutput(output) {
  const text = String(output ?? "").trim();
  if (!text) return { events: [], parseErrors: ["OpenCode produced no JSON event output."] };
  try {
    const parsed = JSON.parse(text);
    return { events: Array.isArray(parsed) ? parsed : [parsed], parseErrors: [] };
  } catch {
    const events = [];
    const parseErrors = [];
    for (const line of text.split(/\r?\n/).filter(Boolean)) {
      try {
        events.push(JSON.parse(line));
      } catch {
        parseErrors.push(`Malformed JSON event: ${line.slice(0, 160)}`);
      }
    }
    return { events, parseErrors };
  }
}

export function collectLiveRunEvidence({
  stdout,
  stderr = "",
  exitCode,
  signal = null,
  elapsedMs,
  processTiming = null,
  fixtureStatus = "",
  timedOut = false,
  cancelled = false,
  outputTruncated = false,
  terminationReason = null,
  fixtureCleanupError = null,
  settledAfterKill = false
}) {
  const parsed = parseJsonEventOutput(stdout);
  const usage = aggregateProviderTokens(collectUsageRecords(parsed.events));
  const texts = collectTextCandidates(parsed.events);
  const machine = parseMachineResult(texts);
  const calls = toolCalls(parsed.events);
  const sessions = sessionIds(parsed.events);
  const fixtureClean = fixtureStatus === "";
  const hardGateFailures = [];

  if (exitCode !== 0) hardGateFailures.push("nonzero-process-exit");
  if (!fixtureClean) hardGateFailures.push("fixture-write-detected");
  if (calls.length > 0) hardGateFailures.push("prohibited-tool-use");
  if (!machine.valid) hardGateFailures.push("malformed-final-result");
  if (timedOut) hardGateFailures.push("process-timed-out");
  if (cancelled) hardGateFailures.push("process-cancelled");
  if (outputTruncated) hardGateFailures.push("process-output-truncated");
  if (fixtureCleanupError) hardGateFailures.push("fixture-cleanup-failed");
  if (settledAfterKill) hardGateFailures.push("process-settlement-forced");

  return {
    providerTokens: usage,
    elapsedMs,
    processTiming,
    process: { exitCode, signal, stderr, timedOut, cancelled, outputTruncated, terminationReason, settledAfterKill },
    eventParseErrors: parsed.parseErrors,
    sessionIds: sessions,
    sessionCount: sessions.length,
    turns: turnCount(parsed.events),
    turnsReason: turnCount(parsed.events) === null ? "OpenCode JSON events did not report a completed turn." : null,
    toolCallCount: calls.length,
    taskToolChildCallCount: calls.filter((call) => call.name === "task").length,
    toolCalls: calls,
    plannedChildDispatchCount: machine.plannedChildDispatchCount,
    plannedChildDispatchReason: machine.plannedChildDispatchReason,
    terminalState: machine.terminalState,
    finalText: machine.finalText,
    fixture: { gitStatus: fixtureStatus, clean: fixtureClean },
    fixtureCleanupError,
    timedOut,
    cancelled,
    outputTruncated,
    terminationReason,
    settledAfterKill,
    hardGates: { passed: hardGateFailures.length === 0, failures: hardGateFailures }
  };
}

export function buildProtocolBundle({ source, route, side }) {
  if (!source || typeof source.read !== "function") throw new Error("A readable protocol source is required.");
  if (!route?.id) throw new Error("A route with an id is required.");
  const files = [];
  for (const [routeKey, stage] of STAGES) {
    const paths = route[routeKey] ?? [];
    if (!Array.isArray(paths)) throw new Error(`${route.id} has an invalid ${routeKey} file declaration.`);
    for (const path of paths) {
      const content = source.read(path);
      files.push({ stage, path, bytes: byteLength(content), content });
    }
  }

  const bytesFor = (stage) => files.filter((file) => file.stage === stage).reduce((total, file) => total + file.bytes, 0);
  const coordinatorProtocolBytes = bytesFor("coordinator");
  const templateBytes = bytesFor("template");
  const workerSystemBytes = bytesFor("worker");
  return {
    schemaVersion: LIVE_EVALUATION_SCHEMA_VERSION,
    evidenceType: "protocol-input-cost-microbenchmark",
    side,
    source: source.label,
    route: route.id,
    measurement: LIVE_PROTOCOL_MEASUREMENT,
    files,
    coordinatorProtocolBytes,
    templateBytes,
    workerSystemBytes,
    protocolBytes: coordinatorProtocolBytes + templateBytes,
    bundleBytes: coordinatorProtocolBytes + templateBytes + workerSystemBytes
  };
}

export function renderProtocolBundle(bundle) {
  const lines = [
    "# Controlled Protocol Bundle",
    "",
    `Route: ${bundle.route}`,
    `Source: ${bundle.source}`,
    `Measurement: ${bundle.measurement}`
  ];
  for (const [stage] of STAGES) {
    const files = bundle.files.filter((file) => file.stage === stage);
    if (files.length === 0) continue;
    lines.push("", `## ${stage}`);
    for (const file of files) lines.push("", `### ${file.path}`, "", file.content);
  }
  return `${lines.join("\n")}\n`;
}

export function makeAbbaPlan(route, repetitions = 1) {
  if (!Number.isInteger(repetitions) || repetitions < 1) throw new Error("repetitions must be a positive integer.");
  const order = [];
  for (let repetition = 1; repetition <= repetitions; repetition += 1) {
    const sequence = repetition % 2 === 1
      ? ["baseline", "candidate", "candidate", "baseline"]
      : ["candidate", "baseline", "baseline", "candidate"];
    for (const [index, side] of sequence.entries()) {
      order.push({ route, repetition, position: index + 1, side });
    }
  }
  return order;
}

export function createLivePlan({ route, repetitions = 1, model, variant, baselineBundle, candidateBundle }) {
  const order = makeAbbaPlan(route, repetitions);
  return {
    schemaVersion: LIVE_EVALUATION_SCHEMA_VERSION,
    status: "dry-run",
    execution: {
      status: "non-executing",
      modelCalls: false,
      opencodeCalls: false,
      networkCalls: false,
      fixtureCalls: false,
      reason: "Pass --execute to create fixtures and invoke OpenCode."
    },
    route,
    repetitions,
    model,
    variant,
    agent: DEFAULT_LIVE_AGENT,
    matchingNamedAgent: MATCHING_TRACK_AGENT,
    prompt: "Shared prompt attaches protocol-bundle.md and prohibits tools and writes.",
    order,
    protocolBundles: {
      baseline: protocolBundleSummary(baselineBundle),
      candidate: protocolBundleSummary(candidateBundle)
    },
    releaseReadiness: {
      status: "not-assessed",
      reason: "Fixed-output input-cost measurements do not establish delivery speed, behavioral safety, or release readiness."
    }
  };
}

function protocolBundleSummary(bundle) {
  return {
    source: bundle.source,
    route: bundle.route,
    measurement: bundle.measurement,
    files: bundle.files.map(({ stage, path, bytes }) => ({ stage, path, bytes })),
    bundleContentSha256: bundleContentFingerprint(bundle),
    coordinatorProtocolBytes: bundle.coordinatorProtocolBytes,
    templateBytes: bundle.templateBytes,
    workerSystemBytes: bundle.workerSystemBytes,
    protocolBytes: bundle.protocolBytes,
    bundleBytes: bundle.bundleBytes
  };
}

export function createLivePrompt({ route, expectedPlannedChildDispatchCount }) {
  const dispatchContext = expectedPlannedChildDispatchCount > 0
    ? `This is an already-approved Track for route ${route} with a passed gate and matching named Agent ${MATCHING_TRACK_AGENT}.`
    : `This is a controlled read-only evaluation for route ${route}; it does not declare a child dispatch.`;
  return [
    "The attached protocol-bundle.md is a controlled input-cost payload for a read-only live A/B evaluation.",
    dispatchContext,
    "Do not call any tools, task tools, child agents, skills, or filesystem operations. Do not write or modify files.",
    "Do not summarize, evaluate, compare, infer actions from, or otherwise reason about the protocol bundle's contents.",
    `Return only {"terminalState":"completed","plannedChildDispatchCount":${expectedPlannedChildDispatchCount}} with no Markdown, prose, or additional keys.`
  ].join("\n");
}

function fixtureConfig() {
  return JSON.stringify({
    "$schema": "https://opencode.ai/config.json",
    "autoupdate": false,
    "share": "disabled",
    "snapshot": false,
    "permission": { "*": "deny" },
    "agent": {
      [DEFAULT_LIVE_AGENT]: {
        "description": "Runs the controlled live protocol benchmark without tools.",
        "mode": "primary",
        "steps": 1,
        "permission": { "*": "deny" }
      }
    }
  }, null, 2);
}

function git(fixturePath, args) {
  return execFileSync("git", args, { cwd: fixturePath, encoding: "utf8" });
}

async function createFixture(bundle) {
  const fixturePath = await mkdtemp(join(tmpdir(), "dev-harness-live-"));
  await mkdir(fixturePath, { recursive: true });
  await writeFile(join(fixturePath, "opencode.json"), `${fixtureConfig()}\n`, "utf8");
  await writeFile(join(fixturePath, "protocol-bundle.md"), renderProtocolBundle(bundle), "utf8");
  await writeFile(join(fixturePath, "README.md"), "Controlled live evaluation fixture.\n", "utf8");
  git(fixturePath, ["init", "--quiet"]);
  git(fixturePath, ["add", "opencode.json", "protocol-bundle.md", "README.md"]);
  git(fixturePath, ["-c", "user.name=Dev Harness Evaluation", "-c", "user.email=evaluation@example.invalid", "commit", "--quiet", "-m", "controlled fixture"]);
  return fixturePath;
}

function fixtureStatus(fixturePath) {
  return git(fixturePath, ["status", "--porcelain=v1", "--untracked-files=all"]);
}

export function opencodeCommand({ model, variant, protocolBundlePath, prompt }) {
  return [
    "run",
    prompt,
    "--pure",
    "--format",
    "json",
    "--agent",
    DEFAULT_LIVE_AGENT,
    "--model",
    model,
    "--variant",
    variant,
    `--file=${protocolBundlePath}`
  ];
}

function terminateChild(child, signalName) {
  if (!child?.pid) return;
  try {
    if (process.platform === "win32") child.kill(signalName);
    else process.kill(-child.pid, signalName);
  } catch {
    try { child.kill(signalName); } catch { /* The child may have already exited. */ }
  }
}

export function invokeOpenCode({
  cwd,
  command,
  timeoutMs = DEFAULT_LIVE_TIMEOUT_MS,
  maxOutputBytes = DEFAULT_LIVE_OUTPUT_BYTES,
  signal: abortSignal = null,
  killGraceMs = PROCESS_KILL_GRACE_MS,
  spawnProcess = spawn
}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw new Error("timeoutMs must be a positive integer.");
  if (!Number.isInteger(maxOutputBytes) || maxOutputBytes <= 0) throw new Error("maxOutputBytes must be a positive integer.");
  if (!Number.isInteger(killGraceMs) || killGraceMs < 0) throw new Error("killGraceMs must be a non-negative integer.");
  return new Promise((resolve) => {
    const startedAt = performance.now();
    let stdout = "";
    let stderr = "";
    let spawnError = null;
    let firstStdoutMs = null;
    let lastStdoutMs = null;
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let terminationReason = null;
    let terminationSignal = null;
    let settled = false;
    let timeoutHandle = null;
    let escalationHandle = null;
    let killHandle = null;
    let settlementHandle = null;
    let child = null;
    let settledAfterKill = false;

    const clearTimers = () => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (escalationHandle) clearTimeout(escalationHandle);
      if (killHandle) clearTimeout(killHandle);
      if (settlementHandle) clearTimeout(settlementHandle);
    };
    const finish = (exitCode, closeSignal, forced = false) => {
      if (settled) return;
      settled = true;
      settledAfterKill ||= forced;
      clearTimers();
      abortSignal?.removeEventListener("abort", onAbort);
      if (forced) {
        child?.stdout?.destroy?.();
        child?.stderr?.destroy?.();
      }
      const elapsedMs = Math.round(performance.now() - startedAt);
      if (spawnError) {
        const appendedError = appendCapped(stderr, spawnError, maxOutputBytes);
        stderr = appendedError.value;
        stderrTruncated ||= appendedError.truncated;
      }
      resolve({
        stdout,
        stderr,
        exitCode: exitCode ?? 1,
        signal: closeSignal ?? terminationSignal,
        elapsedMs,
        processTiming: {
          firstStdoutMs,
          lastStdoutMs,
          postOutputMs: lastStdoutMs === null ? null : Math.max(0, elapsedMs - lastStdoutMs)
        },
        timedOut: terminationReason === "timeout",
        cancelled: terminationReason === "cancelled",
        outputTruncated: stdoutTruncated || stderrTruncated,
        terminationReason,
        settledAfterKill
      });
    };
    const requestTermination = (reason) => {
      if (terminationReason || settled) return;
      terminationReason = reason;
      terminationSignal = "SIGINT";
      terminateChild(child, "SIGINT");
      escalationHandle = setTimeout(() => {
        if (settled) return;
        terminationSignal = "SIGTERM";
        terminateChild(child, "SIGTERM");
      }, killGraceMs);
      killHandle = setTimeout(() => {
        if (settled) return;
        terminationSignal = "SIGKILL";
        terminateChild(child, "SIGKILL");
      }, killGraceMs * 2);
      settlementHandle = setTimeout(() => {
        if (settled) return;
        terminationSignal = "SIGKILL";
        finish(1, "SIGKILL", true);
      }, Math.max(1, killGraceMs * 3));
    };
    function onAbort() {
      requestTermination("cancelled");
    }

    if (abortSignal?.aborted) {
      terminationReason = "cancelled";
      finish(1, "SIGINT");
      return;
    }
    abortSignal?.addEventListener("abort", onAbort, { once: true });
    try {
      child = spawnProcess("opencode", command, {
        cwd,
        env: { ...process.env, OPENCODE_CONFIG_CONTENT: fixtureConfig() },
        stdio: ["ignore", "pipe", "pipe"],
        detached: process.platform !== "win32"
      });
      child.stdout.on("data", (chunk) => {
        const elapsedMs = Math.round(performance.now() - startedAt);
        if (firstStdoutMs === null) firstStdoutMs = elapsedMs;
        lastStdoutMs = elapsedMs;
        const appended = appendCapped(stdout, chunk, maxOutputBytes);
        stdout = appended.value;
        stdoutTruncated ||= appended.truncated;
      });
      child.stderr.on("data", (chunk) => {
        const appended = appendCapped(stderr, chunk, maxOutputBytes);
        stderr = appended.value;
        stderrTruncated ||= appended.truncated;
      });
      child.on("error", (error) => { spawnError = error.message; });
      child.on("close", finish);
      if (terminationReason) terminateChild(child, "SIGINT");
      else timeoutHandle = setTimeout(() => requestTermination("timeout"), timeoutMs);
    } catch (error) {
      spawnError = error.message;
      finish(1, null);
    }
  });
}

export async function executeLiveInvocation({
  bundle,
  invocation,
  model,
  variant,
  expectedPlannedChildDispatchCount,
  timeoutMs = DEFAULT_LIVE_TIMEOUT_MS,
  maxOutputBytes = DEFAULT_LIVE_OUTPUT_BYTES,
  signal = null,
  invoke = invokeOpenCode
}) {
  let fixturePath = null;
  let result = null;
  let fixtureCleanupError = null;
  try {
    fixturePath = await createFixture(bundle);
    const prompt = createLivePrompt({ route: invocation.route, expectedPlannedChildDispatchCount });
    const command = opencodeCommand({
      model,
      variant,
      protocolBundlePath: join(fixturePath, "protocol-bundle.md"),
      prompt
    });
    result = await invoke({ cwd: fixturePath, command, timeoutMs, maxOutputBytes, signal });
    const evidence = collectLiveRunEvidence({ ...result, fixtureStatus: fixtureStatus(fixturePath) });
    result = {
      ...invocation,
      model,
      variant,
      agent: DEFAULT_LIVE_AGENT,
      matchingNamedAgent: MATCHING_TRACK_AGENT,
      protocolBundle: protocolBundleSummary(bundle),
      command: [
        "opencode",
        ...command.map((argument) => {
          if (argument === prompt) return "<shared-prompt>";
          if (argument === `--file=${join(fixturePath, "protocol-bundle.md")}`) return "--file=protocol-bundle.md";
          return argument;
        })
      ],
      ...evidence
    };
  } finally {
    if (fixturePath) {
      try {
        await rm(fixturePath, { recursive: true, force: true });
      } catch (error) {
        fixtureCleanupError = error.message;
      }
    }
  }
  if (!result) throw new Error("Live invocation did not produce evidence.");
  if (fixtureCleanupError) {
    result.fixtureCleanupError = fixtureCleanupError;
    result.hardGates = {
      passed: false,
      failures: [...result.hardGates.failures, "fixture-cleanup-failed"]
    };
  }
  return result;
}

function quantiles(values) {
  if (values.length === 0) return { median: null, p90: null, reason: "No provider-reported values were available." };
  const sorted = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[midpoint - 1] + sorted[midpoint]) / 2 : sorted[midpoint];
  return { median, p90: sorted[Math.ceil(sorted.length * 0.9) - 1], reason: null };
}

function countSummary(values) {
  if (values.some((value) => value === null)) return { total: null, median: null, reason: "At least one run did not declare this count." };
  return { total: values.reduce((total, value) => total + value, 0), median: quantiles(values).median, reason: null };
}

function reduction(baseline, candidate, reason = null) {
  if (baseline === null || candidate === null) return { reduction: null, percentReduction: null, reason: reason ?? "A comparison value was unavailable." };
  return {
    reduction: baseline - candidate,
    percentReduction: baseline === 0 ? null : ((baseline - candidate) / baseline) * 100,
    reason: baseline === 0 ? "Baseline value was zero, so percent reduction is undefined." : null
  };
}

function aggregateSide(runs) {
  return {
    runCount: runs.length,
    totalTokens: quantiles(runs.map((run) => run.providerTokens.totalTokens).filter((value) => value !== null)),
    elapsedMs: quantiles(runs.map((run) => run.elapsedMs).filter(Number.isFinite)),
    firstStdoutMs: quantiles(runs.map((run) => run.processTiming?.firstStdoutMs).filter(Number.isFinite)),
    postOutputMs: quantiles(runs.map((run) => run.processTiming?.postOutputMs).filter(Number.isFinite)),
    actualTaskToolChildCalls: countSummary(runs.map((run) => run.taskToolChildCallCount)),
    declaredChildDispatches: countSummary(runs.map((run) => run.plannedChildDispatchCount)),
    failedHardGates: runs.filter((run) => !run.hardGates.passed).length
  };
}

export function aggregateLivePilot(runs) {
  const baseline = aggregateSide(runs.filter((run) => run.side === "baseline"));
  const candidate = aggregateSide(runs.filter((run) => run.side === "candidate"));
  return {
    baseline,
    candidate,
    reductions: {
      medianTotalTokens: reduction(baseline.totalTokens.median, candidate.totalTokens.median),
      p90TotalTokens: reduction(baseline.totalTokens.p90, candidate.totalTokens.p90),
      medianElapsedMs: reduction(baseline.elapsedMs.median, candidate.elapsedMs.median),
      p90ElapsedMs: reduction(baseline.elapsedMs.p90, candidate.elapsedMs.p90),
      actualTaskToolChildCalls: reduction(baseline.actualTaskToolChildCalls.total, candidate.actualTaskToolChildCalls.total, baseline.actualTaskToolChildCalls.reason ?? candidate.actualTaskToolChildCalls.reason),
      declaredChildDispatches: reduction(baseline.declaredChildDispatches.total, candidate.declaredChildDispatches.total, baseline.declaredChildDispatches.reason ?? candidate.declaredChildDispatches.reason)
    }
  };
}

export function createLivePlanIdentity({ route, repetitions, model, variant, expectedPlannedChildDispatchCount, baselineBundle, candidateBundle, timeoutMs = DEFAULT_LIVE_TIMEOUT_MS, maxOutputBytes = DEFAULT_LIVE_OUTPUT_BYTES }) {
  const identity = {
    schemaVersion: LIVE_JOURNAL_SCHEMA_VERSION,
    route,
    repetitions,
    model,
    variant,
    agent: DEFAULT_LIVE_AGENT,
    matchingNamedAgent: MATCHING_TRACK_AGENT,
    expectedPlannedChildDispatchCount,
    timeoutMs,
    maxOutputBytes,
    order: makeAbbaPlan(route, repetitions),
    bundles: {
      baseline: bundleContentFingerprint(baselineBundle),
      candidate: bundleContentFingerprint(candidateBundle)
    }
  };
  return { ...identity, fingerprint: sha256(JSON.stringify(identity)) };
}

function runRecoveryIdentity({ plan, invocation, bundle, index }) {
  return {
    schemaVersion: LIVE_JOURNAL_SCHEMA_VERSION,
    planFingerprint: plan.fingerprint,
    orderIndex: index,
    route: invocation.route,
    repetition: invocation.repetition,
    position: invocation.position,
    side: invocation.side,
    model: plan.model,
    variant: plan.variant,
    agent: plan.agent,
    expectedPlannedChildDispatchCount: plan.expectedPlannedChildDispatchCount,
    bundleContentSha256: bundleContentFingerprint(bundle)
  };
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp-${process.pid}-${Date.now()}`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(temporaryPath, path);
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => {});
  }
}

export async function readLiveJournal(journalPath) {
  return JSON.parse(await readFile(journalPath, "utf8"));
}

async function loadResumeJournal(journalPath, plan) {
  let journal;
  try {
    journal = await readLiveJournal(journalPath);
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error(`Cannot resume: live journal does not exist at ${journalPath}.`);
    throw new Error(`Cannot read live journal ${journalPath}: ${error.message}`);
  }
  if (journal?.schemaVersion !== LIVE_JOURNAL_SCHEMA_VERSION || journal?.kind !== "live-evaluation-journal") {
    throw new Error("Cannot resume: unsupported live journal schema.");
  }
  if (JSON.stringify(journal.planIdentity) !== JSON.stringify(plan)) {
    throw new Error("Cannot resume: live journal identity does not match route, ordering, bundle content, model, or settings.");
  }
  if (journal.inFlight) {
    throw new Error("Cannot resume: journal contains an unresolved in-flight invocation; refusing to rerun a possibly paid call.");
  }
  if (!Array.isArray(journal.runs)) throw new Error("Cannot resume: live journal runs must be an array.");
  const byIndex = new Map();
  for (const run of journal.runs) {
    const index = run?.recoveryIdentity?.orderIndex;
    if (!Number.isInteger(index) || byIndex.has(index)) throw new Error("Cannot resume: journal contains duplicate or invalid run ordering.");
    if (run.recoveryIdentity.planFingerprint !== plan.fingerprint) throw new Error("Cannot resume: journal run identity does not match the plan.");
    byIndex.set(index, run);
  }
  return { ...journal, byIndex };
}

export async function prepareLiveJournal({
  journalPath,
  route,
  repetitions = 1,
  model,
  variant,
  baselineBundle,
  candidateBundle,
  expectedPlannedChildDispatchCount = 1,
  timeoutMs = DEFAULT_LIVE_TIMEOUT_MS,
  maxOutputBytes = DEFAULT_LIVE_OUTPUT_BYTES,
  resume = false,
  requireExisting = false
}) {
  if (!journalPath) throw new Error("journalPath is required to prepare a live journal.");
  const plan = createLivePlanIdentity({ route, repetitions, model, variant, expectedPlannedChildDispatchCount, baselineBundle, candidateBundle, timeoutMs, maxOutputBytes });
  try {
    const existing = await readLiveJournal(journalPath);
    if (!resume) throw new Error(`Live journal already exists at ${journalPath}; pass resume or choose a new path.`);
    if (existing?.schemaVersion !== LIVE_JOURNAL_SCHEMA_VERSION || existing?.kind !== "live-evaluation-journal") {
      throw new Error("Cannot resume: unsupported live journal schema.");
    }
    if (JSON.stringify(existing.planIdentity) !== JSON.stringify(plan)) {
      throw new Error("Cannot resume: live journal identity does not match route, ordering, bundle content, model, or settings.");
    }
    if (existing.inFlight) throw new Error("Cannot resume: journal contains an unresolved in-flight invocation; refusing to rerun a possibly paid call.");
    return existing;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    if (resume && requireExisting) throw new Error(`Cannot resume: expected live journal does not exist at ${journalPath}.`);
    const pending = {
      schemaVersion: LIVE_JOURNAL_SCHEMA_VERSION,
      kind: "live-evaluation-journal",
      status: "pending",
      planIdentity: plan,
      runs: [],
      inFlight: null
    };
    await writeJsonAtomic(journalPath, pending);
    return pending;
  }
}

function invocationFailure({ invocation, bundle, plan, index, error }) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    ...invocation,
    model: plan.model,
    variant: plan.variant,
    agent: plan.agent,
    matchingNamedAgent: plan.matchingNamedAgent,
    protocolBundle: protocolBundleSummary(bundle),
    command: ["opencode"],
    recoveryIdentity: runRecoveryIdentity({ plan, invocation, bundle, index }),
    providerTokens: {
      inputTokens: null,
      outputTokens: null,
      cacheTokens: null,
      totalTokens: null,
      unavailable: { invocation: "OpenCode invocation failed before usable evidence was collected." }
    },
    elapsedMs: null,
    processTiming: null,
    process: { exitCode: 1, signal: null, stderr: message, timedOut: false, cancelled: false, outputTruncated: false, terminationReason: null, settledAfterKill: false },
    eventParseErrors: ["OpenCode invocation failed before usable evidence was collected."],
    sessionIds: [],
    sessionCount: 0,
    turns: null,
    turnsReason: "OpenCode invocation failed before a completed turn.",
    toolCallCount: 0,
    taskToolChildCallCount: 0,
    toolCalls: [],
    plannedChildDispatchCount: null,
    plannedChildDispatchReason: "OpenCode invocation failed before a terminal response.",
    terminalState: null,
    finalText: null,
    fixture: { gitStatus: "", clean: true },
    fixtureCleanupError: null,
    timedOut: false,
    cancelled: false,
    outputTruncated: false,
    terminationReason: null,
    settledAfterKill: false,
    hardGates: { passed: false, failures: ["invocation-error"] },
    error: message
  };
}

export async function executeLivePilot({
  route,
  repetitions = 1,
  model,
  variant,
  baselineBundle,
  candidateBundle,
  expectedPlannedChildDispatchCount = 1,
  timeoutMs = DEFAULT_LIVE_TIMEOUT_MS,
  maxOutputBytes = DEFAULT_LIVE_OUTPUT_BYTES,
  journalPath = null,
  resume = false,
  signal = null,
  invoke = invokeOpenCode
}) {
  const order = makeAbbaPlan(route, repetitions);
  const plan = createLivePlanIdentity({ route, repetitions, model, variant, expectedPlannedChildDispatchCount, baselineBundle, candidateBundle, timeoutMs, maxOutputBytes });
  let journal = null;
  let resumed = false;
  let journalWriteError = null;
  if (resume && !journalPath) throw new Error("resume requires journalPath.");
  if (journalPath) {
    if (resume) {
      journal = await loadResumeJournal(journalPath, plan);
      resumed = true;
    } else {
      try {
        await access(journalPath);
        throw new Error(`Live journal already exists at ${journalPath}; pass resume or choose a new path.`);
      } catch (error) {
        if (error.message.includes("already exists")) throw error;
        if (error?.code !== "ENOENT") throw error;
      }
      journal = {
        schemaVersion: LIVE_JOURNAL_SCHEMA_VERSION,
        kind: "live-evaluation-journal",
        status: "running",
        planIdentity: plan,
        runs: [],
        inFlight: null
      };
      await writeJsonAtomic(journalPath, journal);
    }
  }

  const recordedRuns = journal?.byIndex ?? new Map();
  const runs = [];
  let terminalStatus = null;
  for (const [index, invocation] of order.entries()) {
    const bundle = invocation.side === "baseline" ? baselineBundle : candidateBundle;
    const recoveryIdentity = runRecoveryIdentity({ plan, invocation, bundle, index });
    const recorded = recordedRuns.get(index);
    if (recorded) {
      if (JSON.stringify(recorded.recoveryIdentity) !== JSON.stringify(recoveryIdentity)) {
        throw new Error(`Cannot resume: recorded invocation ${index} identity does not match the requested plan.`);
      }
      runs.push({ ...recorded, recovery: "reused-recorded-run" });
      continue;
    }
    if (signal?.aborted) {
      terminalStatus = "cancelled";
      break;
    }
    if (journalPath) {
      journal.inFlight = recoveryIdentity;
      try {
        await writeJsonAtomic(journalPath, journal);
      } catch (error) {
        journalWriteError = error.message;
        terminalStatus = "journal-error";
        break;
      }
    }
    let run;
    try {
      run = await executeLiveInvocation({
        bundle,
        invocation,
        model,
        variant,
        expectedPlannedChildDispatchCount,
        timeoutMs,
        maxOutputBytes,
        signal,
        invoke
      });
    } catch (error) {
      run = invocationFailure({ invocation, bundle, plan, index, error });
    }
    run.recoveryIdentity = recoveryIdentity;
    runs.push(run);
    if (journalPath) {
      journal.runs = runs.map(({ recovery, ...entry }) => entry);
      journal.inFlight = null;
      try {
        await writeJsonAtomic(journalPath, journal);
      } catch (error) {
        journalWriteError = error.message;
        terminalStatus = "journal-error";
        break;
      }
    }
    if (run.timedOut) {
      terminalStatus = "timed-out";
      break;
    }
    if (run.cancelled || signal?.aborted) {
      terminalStatus = "cancelled";
      break;
    }
  }

  const allRunsCompleted = runs.length === order.length;
  const status = terminalStatus
    ?? (!allRunsCompleted ? "partial" : runs.every((run) => run.hardGates.passed) ? "completed" : "failed-hard-gates");
  if (journalPath && !journalWriteError) {
    journal.status = status;
    journal.runs = runs.map(({ recovery, ...entry }) => entry);
    journal.inFlight = null;
    try {
      await writeJsonAtomic(journalPath, journal);
    } catch (error) {
      journalWriteError = error.message;
    }
  }
  return {
    schemaVersion: LIVE_EVALUATION_SCHEMA_VERSION,
    status: journalWriteError ? "journal-error" : status,
    route,
    repetitions,
    model,
    variant,
    runs,
    aggregate: aggregateLivePilot(runs),
    recovery: {
      journalPath,
      resumed,
      reusedRunCount: runs.filter((run) => run.recovery === "reused-recorded-run").length,
      remainingInvocations: Math.max(0, order.length - runs.length),
      identity: plan,
      journalWriteError
    },
    releaseReadiness: {
      status: "not-assessed",
      reason: "Fixed-output input-cost measurements do not establish delivery speed, behavioral safety, or release readiness."
    }
  };
}
