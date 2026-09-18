function formatBytes(bytes) {
  return `${bytes.toLocaleString("en-US")} B`;
}

export function renderStaticReport(report, { baselineDifferences = [], candidateFailures = [] } = {}) {
  const lines = [
    "Dev Harness static evaluation",
    `Source: ${report.source.label}`,
    "Measurements are UTF-8 protocol bytes, not provider token counts.",
    "",
    "Routes:"
  ];

  for (const route of report.routes) {
    const extras = route.unnecessary.length === 0 ? "" : `; unnecessary: ${route.unnecessary.join(", ")}`;
    lines.push(
      `- ${route.id}: coordinator ${formatBytes(route.coordinatorProtocolBytes)}; worker ${formatBytes(route.workerSystemBytes)}; templates ${formatBytes(route.templateBytes)}; combined ${formatBytes(route.combinedStaticBytes)}${extras}`
    );
    if (route.laterFiles?.length) lines.push(`  Later review/final stages: ${route.laterFiles.map((file) => file.path).join(", ")}; full delivery declaration ${formatBytes(route.fullDeliveryBytes)}. Initial-stage savings are not full-delivery savings.`);
  }

  lines.push("", "Safety:");
  for (const safety of report.safety) {
    const detail = safety.status === "pass" ? "pass" : `FAIL (${safety.actual ?? safety.reason ?? "missing"})`;
    lines.push(`- ${safety.id}: ${detail}`);
  }

  lines.push("", "Findings:");
  if (report.findings.length === 0) lines.push("- None");
  for (const finding of report.findings) lines.push(`- [${finding.severity}] ${finding.id}: ${finding.message}`);

  if (baselineDifferences.length > 0) {
    lines.push("", `Frozen baseline differences: ${baselineDifferences.join(", ")}`);
  }
  if (candidateFailures.length > 0) {
    const safetyAndBlocking = candidateFailures.filter((failure) => failure.category !== "efficiency");
    const efficiency = candidateFailures.filter((failure) => failure.category === "efficiency");
    if (safetyAndBlocking.length > 0) {
      lines.push("", "Candidate safety/blocking failures:");
      for (const failure of safetyAndBlocking) lines.push(`- [${failure.category}] ${failure.id}: ${failure.message}`);
    }
    if (efficiency.length > 0) {
      lines.push("", "Candidate efficiency failures:");
      for (const failure of efficiency) lines.push(`- [efficiency] ${failure.id}: ${failure.message}`);
    }
  }

  return `${lines.join("\n")}\n`;
}
