import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const LIVE_EVALUATION_SCHEMA_VERSION = 1;
export const DEFAULT_LIVE_AGENT = "dev-harness-live-evaluator";
export const MATCHING_TRACK_AGENT = "dev-harness-worker";
export const LIVE_PROTOCOL_MEASUREMENT = "UTF-8 protocol bytes, not provider token counts.";

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

export function collectLiveRunEvidence({ stdout, stderr = "", exitCode, signal = null, elapsedMs, processTiming = null, fixtureStatus = "" }) {
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

  return {
    providerTokens: usage,
    elapsedMs,
    processTiming,
    process: { exitCode, signal, stderr },
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

export function invokeOpenCode({ cwd, command }) {
  return new Promise((resolve) => {
    const startedAt = performance.now();
    let stdout = "";
    let stderr = "";
    let spawnError = null;
    let firstStdoutMs = null;
    let lastStdoutMs = null;
    const child = spawn("opencode", command, {
      cwd,
      env: { ...process.env, OPENCODE_CONFIG_CONTENT: fixtureConfig() },
      stdio: ["ignore", "pipe", "pipe"]
    });
    child.stdout.on("data", (chunk) => {
      const elapsedMs = Math.round(performance.now() - startedAt);
      if (firstStdoutMs === null) firstStdoutMs = elapsedMs;
      lastStdoutMs = elapsedMs;
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => { spawnError = error.message; });
    child.on("close", (exitCode, signal) => {
      const elapsedMs = Math.round(performance.now() - startedAt);
      resolve({
        stdout,
        stderr: spawnError ? `${stderr}${spawnError}` : stderr,
        exitCode: exitCode ?? 1,
        signal,
        elapsedMs,
        processTiming: {
          firstStdoutMs,
          lastStdoutMs,
          postOutputMs: lastStdoutMs === null ? null : Math.max(0, elapsedMs - lastStdoutMs)
        }
      });
    });
  });
}

export async function executeLiveInvocation({ bundle, invocation, model, variant, expectedPlannedChildDispatchCount, invoke = invokeOpenCode }) {
  let fixturePath = null;
  try {
    fixturePath = await createFixture(bundle);
    const prompt = createLivePrompt({ route: invocation.route, expectedPlannedChildDispatchCount });
    const command = opencodeCommand({
      model,
      variant,
      protocolBundlePath: join(fixturePath, "protocol-bundle.md"),
      prompt
    });
    const result = await invoke({ cwd: fixturePath, command });
    const evidence = collectLiveRunEvidence({ ...result, fixtureStatus: fixtureStatus(fixturePath) });
    return {
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
    if (fixturePath) await rm(fixturePath, { recursive: true, force: true });
  }
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

export async function executeLivePilot({ route, repetitions = 1, model, variant, baselineBundle, candidateBundle, expectedPlannedChildDispatchCount = 1, invoke = invokeOpenCode }) {
  const order = makeAbbaPlan(route, repetitions);
  const runs = [];
  for (const invocation of order) {
    const bundle = invocation.side === "baseline" ? baselineBundle : candidateBundle;
    runs.push(await executeLiveInvocation({
      bundle,
      invocation,
      model,
      variant,
      expectedPlannedChildDispatchCount,
      invoke
    }));
  }
  return {
    schemaVersion: LIVE_EVALUATION_SCHEMA_VERSION,
    status: runs.every((run) => run.hardGates.passed) ? "completed" : "failed-hard-gates",
    route,
    repetitions,
    model,
    variant,
    runs,
    aggregate: aggregateLivePilot(runs),
    releaseReadiness: {
      status: "not-assessed",
      reason: "Fixed-output input-cost measurements do not establish delivery speed, behavioral safety, or release readiness."
    }
  };
}
