import { emptyMetrics, FixBudget, planDispatch, pollExternal, throughputMetricNames, ValidationLedger } from "./throughput.mjs";

const metrics = emptyMetrics();
const quick = planDispatch({ level: "Quick" });
const bookkeeping = planDispatch({ level: "Track", bookkeepingOnly: true });
const ledger = new ValidationLedger();
ledger.check({ command: "focused-test", inputFingerprint: "input-a", relevantFilesFingerprint: "files-a" });
ledger.check({ command: "focused-test", inputFingerprint: "input-a", relevantFilesFingerprint: "files-a" });
const polling = pollExternal({ deadline: "2026-09-03T12:00:00Z", pollInterval: "30s", maxPolls: 3 });
const budget = new FixBudget(2);
budget.consume();
budget.consume();
budget.consume();

for (const name of throughputMetricNames) {
  metrics[name] = quick.metrics[name] + bookkeeping.metrics[name] + ledger.metrics[name] + polling.metrics[name] + budget.metrics[name];
}

process.stdout.write(`${JSON.stringify({
  schemaVersion: 1,
  evidenceType: "protocol behavior simulation",
  liveWallClockMeasured: false,
  metrics
}, null, 2)}\n`);
