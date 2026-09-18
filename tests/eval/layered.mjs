import { aggregateLivePilot } from "./live.mjs";

export const LAYERED_EVALUATION_SCHEMA_VERSION = 1;
export const STATIC_CORE_CASE_COUNT = 18;
export const REPRESENTATIVE_LIVE_ROUTE_COUNT = 4;

function unique(values) {
  return [...new Set(values)];
}

function metric(value) {
  return value === null || value === undefined ? "unavailable" : value;
}

function reduction(value) {
  if (value.reduction === null) return "unavailable";
  const percent = value.percentReduction === null ? "" : ` (${value.percentReduction.toFixed(2)}%)`;
  return `${value.reduction}${percent}`;
}

export function validateLayeredSuite(suite) {
  if (suite?.schemaVersion !== LAYERED_EVALUATION_SCHEMA_VERSION) {
    throw new Error(`Layered suite must use schema version ${LAYERED_EVALUATION_SCHEMA_VERSION}.`);
  }
  if (!Array.isArray(suite.staticCases) || suite.staticCases.length !== STATIC_CORE_CASE_COUNT) {
    throw new Error(`Layered suite must declare exactly ${STATIC_CORE_CASE_COUNT} static core cases.`);
  }
  if (unique(suite.staticCases.map((entry) => entry.id)).length !== suite.staticCases.length) {
    throw new Error("Layered suite static case ids must be unique.");
  }
  for (const entry of suite.staticCases) {
    if (!entry?.id || !["route", "safety", "contains-all"].includes(entry.type)) {
      throw new Error("Layered suite static cases need an id and supported type.");
    }
    if (entry.type === "route" && !entry.route) throw new Error(`${entry.id} requires a route.`);
    if (entry.type === "safety" && !entry.safetyCase) throw new Error(`${entry.id} requires a safety case.`);
    if (entry.type === "contains-all" && (!entry.path || !Array.isArray(entry.includes) || entry.includes.length === 0)) {
      throw new Error(`${entry.id} requires a path and required text.`);
    }
  }
  if (!Array.isArray(suite.representativeLiveRoutes) || suite.representativeLiveRoutes.length !== REPRESENTATIVE_LIVE_ROUTE_COUNT) {
    throw new Error(`Layered suite must declare exactly ${REPRESENTATIVE_LIVE_ROUTE_COUNT} representative live routes.`);
  }
  if (unique(suite.representativeLiveRoutes).length !== suite.representativeLiveRoutes.length) {
    throw new Error("Representative live routes must be unique.");
  }
  return suite;
}

export function evaluateLayeredStaticCases({ source, report, suite }) {
  validateLayeredSuite(suite);
  return suite.staticCases.map((entry) => {
    if (entry.type === "route") {
      const route = report.routes.find((candidate) => candidate.id === entry.route);
      const invalid = report.findings.some((finding) => finding.route === entry.route && finding.severity === "blocking");
      const passed = Boolean(route)
        && route.missingLoaded.length === 0
        && route.missingRequired.length === 0
        && route.evidenceFailures.length === 0
        && !invalid;
      return {
        ...entry,
        status: passed ? "pass" : "fail",
        reason: passed ? null : `Route ${entry.route} is missing or has blocking static evidence.`
      };
    }

    if (entry.type === "safety") {
      const safety = report.safety.find((candidate) => candidate.id === entry.safetyCase);
      return {
        ...entry,
        status: safety?.status === "pass" ? "pass" : "fail",
        reason: safety?.status === "pass" ? null : `Safety case ${entry.safetyCase} did not pass.`
      };
    }

    const content = source.exists(entry.path) ? source.read(entry.path) : "";
    const missing = entry.includes.filter((text) => !content.includes(text));
    return {
      ...entry,
      status: missing.length === 0 ? "pass" : "fail",
      missing,
      reason: missing.length === 0 ? null : `Required static evidence is missing from ${entry.path}.`
    };
  });
}

export function summarizeStaticCases(cases) {
  const failed = cases.filter((entry) => entry.status !== "pass");
  return {
    total: cases.length,
    passed: cases.length - failed.length,
    failed: failed.length,
    failures: failed
  };
}

export function aggregateLayeredLiveResults(suites) {
  return aggregateLivePilot(suites.flatMap((suite) => suite.runs));
}

export function assessOverallLiveEfficiency(aggregate) {
  const checks = [
    {
      id: "overall-median-total-tokens",
      label: "Overall median total-token reduction",
      value: aggregate.reductions.medianTotalTokens.percentReduction,
      minimumPercent: 20
    },
    {
      id: "overall-p90-total-tokens",
      label: "Overall P90 total-token regression",
      value: aggregate.reductions.p90TotalTokens.percentReduction,
      minimumPercent: -5
    },
    {
      id: "overall-median-elapsed-ms",
      label: "Overall median elapsed-time regression",
      value: aggregate.reductions.medianElapsedMs.percentReduction,
      minimumPercent: -10
    }
  ].map((check) => ({
    ...check,
    status: check.value === null ? "unavailable" : check.value >= check.minimumPercent ? "pass" : "fail"
  }));
  const failed = checks.filter((check) => check.status === "fail");
  const unavailable = checks.filter((check) => check.status === "unavailable");
  return {
    status: failed.length > 0 ? "fail" : unavailable.length > 0 ? "unavailable" : "pass",
    checks,
    failed,
    unavailable
  };
}

function renderComparison(label, aggregate) {
  return `${label}: total tokens median ${metric(aggregate.totalTokens.median)}, P90 ${metric(aggregate.totalTokens.p90)}; elapsed median ${metric(aggregate.elapsedMs.median)} ms, P90 ${metric(aggregate.elapsedMs.p90)} ms.`;
}

function renderProcessTiming(label, aggregate) {
  return `${label}: first stdout median ${metric(aggregate.firstStdoutMs.median)} ms; post-output median ${metric(aggregate.postOutputMs.median)} ms.`;
}

export function renderLayeredReport(result) {
  const lines = [
    `Layered evaluation ${result.status}.`,
    "Evidence: static contracts and fixed-output input cost; delivery behavior and release readiness are not assessed.",
    `Static core cases: ${result.static.summary.passed}/${result.static.summary.total} passed.`
  ];
  if (result.static.candidateFailures.length > 0) {
    lines.push(`Candidate static failures: ${result.static.candidateFailures.map((failure) => failure.id).join(", ")}.`);
  }
  if (result.static.summary.failed > 0) {
    lines.push(`Core static failures: ${result.static.summary.failures.map((failure) => failure.id).join(", ")}.`);
  }

  lines.push(
    `Live representative routes: ${result.live.routes.join(", ")}.`,
    `Live plan: ${result.live.repetitions} ABBA repetitions per route, ${result.live.plannedInvocations} planned invocations.`
  );
  if (!result.live.executed) {
    lines.push("Live metrics are unavailable in dry-run. Pass --execute to invoke OpenCode.");
    return `${lines.join("\n")}\n`;
  }

  lines.push("Per-route token and latency comparison:");
  for (const suite of result.live.suites) {
    const aggregate = suite.aggregate;
    lines.push(`- ${suite.route}`);
    lines.push(`  ${renderComparison("baseline", aggregate.baseline)}`);
    lines.push(`  ${renderComparison("candidate", aggregate.candidate)}`);
    lines.push(`  ${renderProcessTiming("baseline", aggregate.baseline)}`);
    lines.push(`  ${renderProcessTiming("candidate", aggregate.candidate)}`);
    lines.push(`  reductions: median tokens ${reduction(aggregate.reductions.medianTotalTokens)}; P90 tokens ${reduction(aggregate.reductions.p90TotalTokens)}; median elapsed ${reduction(aggregate.reductions.medianElapsedMs)}; P90 elapsed ${reduction(aggregate.reductions.p90ElapsedMs)}.`);
  }
  lines.push("Overall representative comparison:");
  lines.push(renderComparison("baseline", result.live.aggregate.baseline));
  lines.push(renderComparison("candidate", result.live.aggregate.candidate));
  lines.push(`Reductions: median tokens ${reduction(result.live.aggregate.reductions.medianTotalTokens)}; P90 tokens ${reduction(result.live.aggregate.reductions.p90TotalTokens)}; median elapsed ${reduction(result.live.aggregate.reductions.medianElapsedMs)}; P90 elapsed ${reduction(result.live.aggregate.reductions.p90ElapsedMs)}.`);
  lines.push(`Overall efficiency gates: ${result.live.efficiency.status}.`);
  for (const check of result.live.efficiency.checks) {
    const value = check.value === null ? "unavailable" : `${check.value.toFixed(2)}%`;
    lines.push(`- [${check.status}] ${check.label}: ${value}; minimum ${check.minimumPercent}%.`);
  }
  const failedRuns = result.live.suites.flatMap((suite) => suite.runs).filter((run) => !run.hardGates.passed);
  lines.push(`Hard-gate failures: ${failedRuns.length}.`);
  for (const run of failedRuns) {
    lines.push(`- ${run.route} repetition ${run.repetition} position ${run.position} ${run.side}: ${run.hardGates.failures.join(", ")}.`);
  }
  return `${lines.join("\n")}\n`;
}
