export const throughputMetricNames = Object.freeze([
  "childDispatchCount",
  "reviewerDispatchCount",
  "validationExecutionCount",
  "validationReuseCount",
  "broadCheckCount",
  "externalPollCount",
  "budgetExtensionCount",
  "bookkeepingChildCount"
]);

export function emptyMetrics() {
  return Object.fromEntries(throughputMetricNames.map((name) => [name, 0]));
}

export function classifyThroughputCase(input) {
  if (input.internalCanary && input.recipientCount === 1 && !input.publicContract && !input.migration && !input.persistencePolicy && !input.architectureDecision) {
    return "Scoped";
  }
  if (input.publicContract || input.migration || input.persistencePolicy || input.architectureDecision || input.durableMultiSliceCoordination) {
    return "Track";
  }
  if (input.clear && input.local && input.reversible && input.lowRisk) return "Quick";
  return "Scoped";
}

export function planDispatch(input) {
  const metrics = emptyMetrics();
  if (input.bookkeepingOnly) return { dispatch: false, owner: "Coordinator", metrics };
  const dispatch = Boolean(input.level === "Track" || input.userRequestedIsolation || input.crossTrustBoundary || input.independentWorktree || input.significantTechnicalUncertainty || input.recordedSafetyReason);
  if (dispatch) metrics.childDispatchCount = 1;
  if (input.reviewerIndependent && dispatch) metrics.reviewerDispatchCount = 1;
  return { dispatch, owner: dispatch ? "Executor" : "Coordinator", metrics };
}

export function externalSendDecision({ exactAuthorization }) {
  return exactAuthorization ? { allowed: true, owner: "Coordinator" } : { allowed: false, terminalState: "blocked" };
}

function sameSet(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

export function canMergeTrackUnits(left, right) {
  return sameSet(left.ownership, right.ownership)
    && sameSet(left.acceptance, right.acceptance)
    && sameSet(left.validation, right.validation)
    && left.rollbackBoundary === right.rollbackBoundary;
}

export class ValidationLedger {
  constructor() {
    this.entries = [];
    this.metrics = emptyMetrics();
  }

  check({ command, inputFingerprint, relevantFilesFingerprint, broad = false, trigger = null, result = "passed", time = new Date().toISOString() }) {
    if (broad && !["phase", "final", "shared-contract", "repository-hard-threshold", "explicit"].includes(trigger)) {
      return { status: "blocked", reason: "broad check has no allowed trigger" };
    }
    const reusable = this.entries.find((entry) => entry.command === command
      && entry.inputFingerprint === inputFingerprint
      && entry.relevantFilesFingerprint === relevantFilesFingerprint
      && entry.result === "passed");
    if (reusable) {
      this.metrics.validationReuseCount += 1;
      return { status: "reused", entry: reusable };
    }
    const entry = { command, inputFingerprint, relevantFilesFingerprint, result, time };
    this.entries.push(entry);
    this.metrics.validationExecutionCount += 1;
    if (broad) this.metrics.broadCheckCount += 1;
    return { status: "executed", entry };
  }
}

export class FixBudget {
  constructor(limit) {
    this.limit = limit;
    this.used = 0;
    this.metrics = emptyMetrics();
  }

  consume() {
    if (this.used >= this.limit) return { allowed: false, terminalState: "blocked" };
    this.used += 1;
    return { allowed: true, used: this.used, limit: this.limit };
  }

  extend({ userApproved, namedRisk, newLimit }) {
    if (!userApproved || !namedRisk || !Number.isInteger(newLimit) || newLimit <= this.limit) return false;
    this.limit = newLimit;
    this.metrics.budgetExtensionCount += 1;
    return true;
  }
}

export function pollExternal({ deadline, pollInterval, maxPolls, terminalAt = null }) {
  if (!deadline || !pollInterval || !Number.isInteger(maxPolls) || maxPolls < 1) throw new Error("External polling requires deadline, pollInterval, and positive maxPolls.");
  const metrics = emptyMetrics();
  let terminal = false;
  for (let poll = 1; poll <= maxPolls; poll += 1) {
    metrics.externalPollCount += 1;
    if (terminalAt === poll) {
      terminal = true;
      break;
    }
  }
  return { terminalState: terminal ? "completed" : "blocked", metrics, childDispatchCount: 0 };
}

export function detectV25ThroughputFindings(source) {
  const skill = source.read("SKILL.md");
  const execution = source.read("references/execution.md");
  const implement = source.read("references/architect/implement.md");
  const findings = [];
  if (skill.includes("For Quick or Scoped implementation, build one self-contained Work Order")) findings.push("quick-forces-full-path");
  if (implement.includes("The Executor must not edit Architect artifacts unless the Work Order explicitly assigns")) findings.push("bookkeeping-can-be-delegated");
  if (!execution.includes("validation evidence ledger")) findings.push("validation-reuse-missing");
  if (execution.includes("explicit Coordinator decision")) findings.push("budget-can-expand-without-current-user");
  return findings;
}
