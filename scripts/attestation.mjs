import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const ATTESTATION_SCHEMA_VERSION = 2;

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function git(worktree, args) {
  return execFileSync("git", args, { cwd: worktree, encoding: "buffer" });
}

function gitText(worktree, args) {
  return git(worktree, args).toString("utf8").trim();
}

function normalizeScopePath(path) {
  const normalized = normalize(path).replaceAll("\\", "/");
  if (
    typeof path !== "string"
    || !path
    || path !== path.trim()
    || isAbsolute(path)
    || normalized === "."
    || normalized === ".."
    || normalized.startsWith("../")
    || normalized.startsWith(":")
    || /[\0<>*?[\]]/.test(normalized)
  ) {
    throw new Error(`Unsafe scope path: ${path}`);
  }
  return normalized.replace(/^\.\//, "");
}

function isWithin(root, path) {
  const relationship = relative(root, path);
  return relationship === "" || (!relationship.startsWith("..") && !isAbsolute(relationship));
}

function hasOverlap(left, right) {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

export function normalizeScope({ ownedPaths, readOnlyPaths }) {
  if (!Array.isArray(ownedPaths) || !Array.isArray(readOnlyPaths)) throw new Error("ownedPaths and readOnlyPaths must be arrays.");
  const owned = [...new Set(ownedPaths.map(normalizeScopePath))].sort();
  const readOnly = [...new Set(readOnlyPaths.map(normalizeScopePath))].sort();
  if (owned.length === 0) throw new Error("At least one owned path is required.");

  for (const ownedPath of owned) {
    for (const readOnlyPath of readOnly) {
      if (hasOverlap(ownedPath, readOnlyPath)) {
        throw new Error(`Owned and read-only paths overlap: ${ownedPath} / ${readOnlyPath}`);
      }
    }
  }

  return { ownedPaths: owned, readOnlyPaths: readOnly, paths: [...new Set([...owned, ...readOnly])].sort() };
}

function nearestExistingAncestor(path) {
  let candidate = path;
  while (true) {
    try {
      lstatSync(candidate);
      return candidate;
    } catch (error) {
      if (error?.code !== "ENOENT" || candidate === dirname(candidate)) throw error;
      candidate = dirname(candidate);
    }
  }
}

function assertScopeParent(worktree, absolutePath, scopePath) {
  const ancestor = nearestExistingAncestor(dirname(absolutePath));
  const resolvedAncestor = realpathSync(ancestor);
  if (!isWithin(worktree, resolvedAncestor)) {
    throw new Error(`Declared scope path escapes worktree through its parent: ${scopePath}`);
  }
}

function hashDeclaredEntry(worktree, absolutePath, scopePath) {
  assertScopeParent(worktree, absolutePath, scopePath);
  let stat;
  try {
    stat = lstatSync(absolutePath);
  } catch (error) {
    if (error?.code === "ENOENT") return `missing\0${scopePath}\0`;
    throw error;
  }
  if (stat.isSymbolicLink()) {
    throw new Error(`Unsupported declared scope symlink: ${scopePath}; declare the real in-worktree path instead.`);
  }
  if (stat.isFile()) return `file\0${sha256(readFileSync(absolutePath))}\0`;
  if (stat.isDirectory()) {
    const children = readdirSync(absolutePath, { withFileTypes: true })
      .map((entry) => entry.name)
      .sort()
      .map((name) => {
        const childPath = join(absolutePath, name);
        const childScopePath = `${scopePath}/${name}`;
        return `${childScopePath}\0${hashDeclaredEntry(worktree, childPath, childScopePath)}`;
      });
    return `directory\0${children.join("\0")}\0`;
  }
  throw new Error(`Unsupported declared scope file type: ${scopePath}`);
}

// This fingerprint intentionally walks only explicitly declared scope paths.
// Directory declarations include their descendants. Symlinks are rejected so
// a target cannot change without changing the declared scope fingerprint;
// declare the real in-worktree path instead. Missing paths are recorded so a
// later creation is detected; unsupported file types fail attestation.
function relevantUntrackedFingerprint(worktree, paths) {
  return sha256(paths
    .map((path) => `${path}\0${hashDeclaredEntry(worktree, join(worktree, path), path)}`)
    .join(""));
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireConcreteString(value, label) {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim() || /[<>]/.test(value)) {
    throw new Error(`${label} must be a concrete non-placeholder string.`);
  }
  return value;
}

function normalizeExecutionBinding(binding) {
  if (!isRecord(binding)) throw new Error("executionBinding must be an object.");
  const harnessMode = requireConcreteString(binding.harnessMode, "executionBinding.harnessMode");
  if (!["Quick", "Scoped", "Track unit"].includes(harnessMode)) {
    throw new Error("executionBinding.harnessMode must be Quick, Scoped, or Track unit.");
  }
  if (!isRecord(binding.child)) throw new Error("executionBinding.child must be an object.");
  if (!isRecord(binding.trackGate)) throw new Error("executionBinding.trackGate must be an object.");

  const child = {
    model: requireConcreteString(binding.child.model, "executionBinding.child.model"),
    reasoning: requireConcreteString(binding.child.reasoning, "executionBinding.child.reasoning"),
    agent: requireConcreteString(binding.child.agent, "executionBinding.child.agent"),
    configurationSource: requireConcreteString(binding.child.configurationSource, "executionBinding.child.configurationSource")
  };
  const trackState = requireConcreteString(binding.trackGate.state, "executionBinding.trackGate.state");
  const unitIds = Array.isArray(binding.trackGate.unitIds)
    ? binding.trackGate.unitIds.map((unitId, index) => requireConcreteString(unitId, `executionBinding.trackGate.unitIds[${index}]`))
    : null;
  if (!unitIds) throw new Error("executionBinding.trackGate.unitIds must be an array.");

  let trackGate;
  if (harnessMode === "Track unit") {
    if (trackState !== "passed") throw new Error("A Track unit requires a passed Track gate.");
    if (unitIds.length === 0) throw new Error("A Track unit requires at least one unit ID.");
    trackGate = {
      state: trackState,
      trackId: requireConcreteString(binding.trackGate.trackId, "executionBinding.trackGate.trackId"),
      unitIds: [...new Set(unitIds)].sort()
    };
  } else {
    if (trackState !== "not-applicable" || binding.trackGate.trackId !== null || unitIds.length !== 0) {
      throw new Error("A non-Track Work Order requires a not-applicable Track gate, null trackId, and no unit IDs.");
    }
    trackGate = { state: trackState, trackId: null, unitIds: [] };
  }

  const requestedConsequentialOperations = Array.isArray(binding.requestedConsequentialOperations)
    ? binding.requestedConsequentialOperations.map((operation, index) => requireConcreteString(operation, `executionBinding.requestedConsequentialOperations[${index}]`))
    : null;
  if (!requestedConsequentialOperations) {
    throw new Error("executionBinding.requestedConsequentialOperations must be an array.");
  }

  return {
    workOrderId: requireConcreteString(binding.workOrderId, "executionBinding.workOrderId"),
    harnessMode,
    child,
    trackGate,
    requestedConsequentialOperations: [...new Set(requestedConsequentialOperations)].sort()
  };
}

function hardContract(attestation) {
  return {
    schemaVersion: attestation.schemaVersion,
    repositoryRoot: attestation.repositoryRoot,
    worktreePath: attestation.worktreePath,
    ownedPaths: attestation.ownedPaths,
    readOnlyPaths: attestation.readOnlyPaths,
    scopeRevisionFingerprint: attestation.scopeRevisionFingerprint,
    unstagedDiffFingerprint: attestation.unstagedDiffFingerprint,
    stagedDiffFingerprint: attestation.stagedDiffFingerprint,
    relevantUntrackedFingerprint: attestation.relevantUntrackedFingerprint,
    executionBinding: attestation.executionBinding
  };
}

function requireHash(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
    throw new Error(`${label} must be a SHA-256 hex digest.`);
  }
}

function validateAttestation(attestation) {
  if (!isRecord(attestation)) throw new Error("attestation must be an object.");
  if (attestation.schemaVersion !== ATTESTATION_SCHEMA_VERSION) {
    throw new Error(`attestation.schemaVersion must be ${ATTESTATION_SCHEMA_VERSION}.`);
  }
  if (!isAbsolute(attestation.repositoryRoot) || !isAbsolute(attestation.worktreePath)) {
    throw new Error("Attested repositoryRoot and worktreePath must be absolute paths.");
  }
  requireConcreteString(attestation.baselineRevision, "attestation.baselineRevision");
  for (const field of [
    "repositoryStatusFingerprint",
    "scopeRevisionFingerprint",
    "unstagedDiffFingerprint",
    "stagedDiffFingerprint",
    "relevantUntrackedFingerprint",
    "scopeFingerprint"
  ]) {
    requireHash(attestation[field], `attestation.${field}`);
  }
  const scope = normalizeScope({ ownedPaths: attestation.ownedPaths, readOnlyPaths: attestation.readOnlyPaths });
  if (JSON.stringify(scope.ownedPaths) !== JSON.stringify(attestation.ownedPaths)
    || JSON.stringify(scope.readOnlyPaths) !== JSON.stringify(attestation.readOnlyPaths)) {
    throw new Error("Attested scope paths must use canonical sorted form.");
  }
  const executionBinding = normalizeExecutionBinding(attestation.executionBinding);
  if (JSON.stringify(executionBinding) !== JSON.stringify(attestation.executionBinding)) {
    throw new Error("Attested executionBinding must use canonical form.");
  }
}

export function captureExecutionAttestation({ worktree, ownedPaths, readOnlyPaths, executionBinding }) {
  const resolvedWorktree = realpathSync(worktree);
  const scope = normalizeScope({ ownedPaths, readOnlyPaths });
  const normalizedBinding = normalizeExecutionBinding(executionBinding);
  const repositoryRoot = realpathSync(gitText(resolvedWorktree, ["rev-parse", "--show-toplevel"]));
  if (!isWithin(repositoryRoot, resolvedWorktree)) throw new Error("Worktree is outside the repository root.");
  const status = git(resolvedWorktree, ["status", "--porcelain=v1", "--untracked-files=all", "-z"]);
  const attestation = {
    schemaVersion: ATTESTATION_SCHEMA_VERSION,
    repositoryRoot,
    worktreePath: resolvedWorktree,
    baselineRevision: gitText(resolvedWorktree, ["rev-parse", "HEAD"]),
    repositoryStatusFingerprint: sha256(status),
    ownedPaths: scope.ownedPaths,
    readOnlyPaths: scope.readOnlyPaths,
    scopeRevisionFingerprint: sha256(git(resolvedWorktree, ["ls-tree", "-r", "HEAD", "--", ...scope.paths])),
    unstagedDiffFingerprint: sha256(git(resolvedWorktree, ["diff", "--no-ext-diff", "--binary", "--", ...scope.paths])),
    stagedDiffFingerprint: sha256(git(resolvedWorktree, ["diff", "--cached", "--no-ext-diff", "--binary", "--", ...scope.paths])),
    relevantUntrackedFingerprint: relevantUntrackedFingerprint(resolvedWorktree, scope.paths),
    executionBinding: normalizedBinding
  };
  return { ...attestation, scopeFingerprint: sha256(JSON.stringify(hardContract(attestation))) };
}

export function verifyExecutionAttestation({ worktree, attestation }) {
  try {
    validateAttestation(attestation);
  } catch (error) {
    return { matches: false, mismatches: ["invalidAttestation"], outsideScopeDrift: [], actual: null, error: error.message };
  }
  const actual = captureExecutionAttestation({
    worktree,
    ownedPaths: attestation.ownedPaths,
    readOnlyPaths: attestation.readOnlyPaths,
    executionBinding: attestation.executionBinding
  });
  const hardFields = [
    "repositoryRoot",
    "worktreePath",
    "ownedPaths",
    "readOnlyPaths",
    "scopeRevisionFingerprint",
    "unstagedDiffFingerprint",
    "stagedDiffFingerprint",
    "relevantUntrackedFingerprint",
    "executionBinding",
    "scopeFingerprint"
  ];
  const mismatches = hardFields.filter((field) => JSON.stringify(attestation[field]) !== JSON.stringify(actual[field]));
  const outsideScopeDrift = ["baselineRevision", "repositoryStatusFingerprint"]
    .filter((field) => attestation[field] !== actual[field]);
  return { matches: mismatches.length === 0, mismatches, outsideScopeDrift, actual };
}

function readInput() {
  const text = readFileSync(0, "utf8");
  if (!text.trim()) throw new Error("Expected JSON input on stdin.");
  return JSON.parse(text);
}

function runCli() {
  const command = process.argv[2];
  const input = readInput();
  if (input.schemaVersion !== ATTESTATION_SCHEMA_VERSION) throw new Error(`schemaVersion must be ${ATTESTATION_SCHEMA_VERSION}.`);
  if (command === "capture") {
    const attestation = captureExecutionAttestation(input);
    const envelope = { schemaVersion: ATTESTATION_SCHEMA_VERSION, worktree: attestation.worktreePath, attestation };
    process.stdout.write(`${JSON.stringify({ ok: true, envelope }, null, 2)}\n`);
    return;
  }
  if (command === "verify") {
    const result = verifyExecutionAttestation(input);
    process.stdout.write(`${JSON.stringify({ ok: result.matches, ...result }, null, 2)}\n`);
    if (!result.matches) process.exitCode = 1;
    return;
  }
  throw new Error("Usage: node scripts/attestation.mjs <capture|verify> < input.json");
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    runCli();
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ ok: false, error: error.message, mismatches: ["verificationError"] })}\n`);
    process.exitCode = 1;
  }
}
