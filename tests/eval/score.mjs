import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, normalize, relative, resolve } from "node:path";

function assertSafePath(path) {
  const normalized = normalize(path);
  if (isAbsolute(path) || normalized === ".." || normalized.startsWith(`..${"/"}`)) {
    throw new Error(`Unsafe evaluator path: ${path}`);
  }
  return normalized;
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function utf8Bytes(content) {
  return Buffer.byteLength(content, "utf8");
}

function uniqueSorted(items) {
  return [...new Set(items)].sort();
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function createFilesystemSource(root) {
  const sourceRoot = resolve(root);
  return {
    label: relative(process.cwd(), sourceRoot) || ".",
    read(path) {
      return readFileSync(join(sourceRoot, assertSafePath(path)), "utf8");
    },
    exists(path) {
      return existsSync(join(sourceRoot, assertSafePath(path)));
    }
  };
}

export function createGitSource(root, revision) {
  const sourceRoot = resolve(root);
  return {
    label: revision,
    read(path) {
      const safePath = assertSafePath(path);
      return execFileSync("git", ["show", `${revision}:${safePath}`], {
        cwd: sourceRoot,
        encoding: "utf8"
      });
    },
    exists(path) {
      const safePath = assertSafePath(path);
      try {
        execFileSync("git", ["cat-file", "-e", `${revision}:${safePath}`], {
          cwd: sourceRoot,
          stdio: "ignore"
        });
        return true;
      } catch {
        return false;
      }
    }
  };
}

function readSource(source, path, issues) {
  if (!source.exists(path)) {
    issues.push({
      id: `missing-source:${path}`,
      kind: "source",
      severity: "blocking",
      path,
      message: `Required evaluator input is missing: ${path}`
    });
    return null;
  }
  return source.read(path);
}

function permissionValue(content, permission) {
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) return null;
  const permissionBlock = frontmatter[1].match(/^permission:\n((?:^[ \t]+.*\n?)*)/m);
  if (!permissionBlock) return null;
  const value = permissionBlock[1].match(new RegExp(`^[ \\t]+${permission}:\\s*([^\\s#]+)`, "m"));
  return value?.[1] ?? null;
}

function evaluateSafetyCase(source, safetyCase) {
  const content = source.exists(safetyCase.path) ? source.read(safetyCase.path) : null;
  if (!content) {
    return {
      id: safetyCase.id,
      status: "fail",
      reason: `Missing source: ${safetyCase.path}`,
      knownBaselineFailure: Boolean(safetyCase.knownBaselineFailure)
    };
  }

  if (safetyCase.type === "worker-permission") {
    const actual = permissionValue(content, safetyCase.permission);
    return {
      id: safetyCase.id,
      status: actual === safetyCase.expected ? "pass" : "fail",
      expected: safetyCase.expected,
      actual,
      path: safetyCase.path,
      knownBaselineFailure: Boolean(safetyCase.knownBaselineFailure)
    };
  }

  if (safetyCase.type === "contains-all") {
    const missing = safetyCase.includes.filter((text) => !content.includes(text));
    return {
      id: safetyCase.id,
      status: missing.length === 0 ? "pass" : "fail",
      missing,
      path: safetyCase.path,
      knownBaselineFailure: Boolean(safetyCase.knownBaselineFailure)
    };
  }

  if (safetyCase.type === "ordered-text") {
    let previous = -1;
    const missing = [];
    for (const text of safetyCase.ordered) {
      const current = content.indexOf(text);
      if (current < 0 || current <= previous) missing.push(text);
      previous = Math.max(previous, current);
    }
    return {
      id: safetyCase.id,
      status: missing.length === 0 ? "pass" : "fail",
      missing,
      path: safetyCase.path,
      knownBaselineFailure: Boolean(safetyCase.knownBaselineFailure)
    };
  }

  return {
    id: safetyCase.id,
    status: "fail",
    reason: `Unsupported safety case type: ${safetyCase.type}`,
    knownBaselineFailure: Boolean(safetyCase.knownBaselineFailure)
  };
}

function evaluateNormativeRule(source, rule) {
  const canonicalContent = source.exists(rule.canonical.path) ? source.read(rule.canonical.path) : "";
  const canonicalPresent = canonicalContent.includes(rule.canonical.includes);
  const duplicates = rule.duplicates.map((entry) => {
    const content = source.exists(entry.path) ? source.read(entry.path) : "";
    return {
      ...entry,
      present: content.includes(entry.includes)
    };
  });

  return {
    id: rule.id,
    canonical: {
      ...rule.canonical,
      present: canonicalPresent
    },
    duplicates: duplicates.filter((entry) => entry.present),
    missingDeclaredDuplicates: duplicates.filter((entry) => !entry.present)
  };
}

function evaluateReferences(source, packageFiles) {
  const broken = [];
  let referencesChecked = 0;
  for (const path of packageFiles.filter((file) => file.endsWith(".md"))) {
    if (!source.exists(path)) continue;
    const content = source.read(path);
    for (const match of content.matchAll(/`((?:references|templates)\/[^`]+)`/g)) {
      referencesChecked += 1;
      const target = match[1];
      if (!source.exists(target)) broken.push({ path, target });
    }
  }
  return { referencesChecked, broken };
}

function evaluateRoute(source, route, issues) {
  const coordinator = uniqueSorted(route.coordinator ?? route.loaded ?? []);
  const templates = uniqueSorted(route.templates ?? []);
  const worker = uniqueSorted(route.worker ?? []);
  const later = uniqueSorted(route.later ?? []).filter((path) => ![...coordinator, ...templates, ...worker].includes(path));
  const loaded = uniqueSorted([...coordinator, ...templates, ...worker]);
  const required = uniqueSorted(route.required);
  const missingLoaded = loaded.filter((path) => !source.exists(path));
  const missingRequired = required.filter((path) => !loaded.includes(path));
  const unnecessary = loaded.filter((path) => !required.includes(path));
  const files = [];

  for (const path of loaded) {
    const content = readSource(source, path, issues);
    if (content === null) continue;
    files.push({ path, bytes: utf8Bytes(content), sha256: sha256(content) });
  }

  const evidenceFailures = [...(route.parserFailures ?? [])];
  for (const assertion of route.evidence ?? []) {
    const content = readSource(source, assertion.path, issues);
    if (content === null || !content.includes(assertion.includes)) evidenceFailures.push(assertion);
  }

  const bytesFor = (paths) => files.filter((file) => paths.includes(file.path)).reduce((sum, file) => sum + file.bytes, 0);
  const coordinatorProtocolBytes = bytesFor(coordinator);
  const workerSystemBytes = bytesFor(worker);
  const templateBytes = bytesFor(templates);
  const laterFiles = later.map((path) => {
    const content = readSource(source, path, issues);
    return { path, bytes: content === null ? 0 : utf8Bytes(content) };
  });
  return {
    id: route.id,
    intent: route.intent,
    files,
    coordinatorFiles: coordinator,
    templateFiles: templates,
    workerFiles: worker,
    coordinatorProtocolBytes,
    workerSystemBytes,
    templateBytes,
    combinedStaticBytes: coordinatorProtocolBytes + workerSystemBytes + templateBytes,
    laterFiles,
    fullDeliveryBytes: coordinatorProtocolBytes + workerSystemBytes + templateBytes + laterFiles.reduce((sum, file) => sum + file.bytes, 0),
    protocolBytes: coordinatorProtocolBytes + templateBytes,
    required,
    unnecessary,
    missingLoaded,
    missingRequired,
    evidenceFailures,
    targetReductionPercent: route.targetReductionPercent,
    expected: route.expected
  };
}

export function frozenBaselineRoutes(baseline) {
  return Object.entries(baseline.routes).map(([id, route]) => ({
    id,
    intent: id,
    coordinator: route.coordinatorFiles,
    templates: route.templateFiles,
    worker: route.workerFiles,
    required: uniqueSorted([...route.coordinatorFiles, ...route.templateFiles, ...route.workerFiles]).filter((path) => !route.unnecessary.includes(path)),
    targetReductionPercent: route.targetReductionPercent,
    expected: { frozenManifest: true }
  }));
}

export function deriveCandidateRoutes(source, baseline) {
  const manifestPath = "references/route-manifest.json";
  if (!source.exists(manifestPath)) return [];
  let manifest;
  try {
    manifest = JSON.parse(source.read(manifestPath));
  } catch {
    return [];
  }
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.routes)) return [];

  return manifest.routes.map((route) => {
    const coordinator = Array.isArray(route.coordinator) ? route.coordinator : [];
    const templates = Array.isArray(route.templates) ? route.templates : [];
    const worker = Array.isArray(route.worker) ? route.worker : [];
    const baselineRoute = baseline.routes[route.id];
    const parserFailures = [];
    if (typeof route.dispatch !== "boolean") parserFailures.push({ path: manifestPath, reason: "dispatch must be boolean" });
    if (route.dispatch && worker.length === 0) parserFailures.push({ path: manifestPath, reason: "dispatched route must declare worker files" });
    if (!route.dispatch && worker.length > 0) parserFailures.push({ path: manifestPath, reason: "non-dispatched route cannot declare worker files" });
    return {
      id: route.id,
      intent: route.id,
      coordinator,
      templates,
      worker,
      later: route.later ?? [],
      loaded: uniqueSorted([...coordinator, ...templates, ...worker]),
      required: uniqueSorted([...coordinator, ...templates, ...worker]).filter((path) => !baselineRoute?.unnecessary?.includes(path)),
      targetReductionPercent: baselineRoute?.targetReductionPercent ?? 0,
      expected: { candidateProtocol: true, dispatch: route.dispatch, frozenComparisonAvailable: Boolean(baselineRoute) },
      parserFailures
    };
  });
}

function sourceHashes(source, packageFiles, issues) {
  const hashes = {};
  for (const path of uniqueSorted(packageFiles)) {
    const content = readSource(source, path, issues);
    if (content === null) continue;
    hashes[path] = sha256(content);
  }
  return hashes;
}

function contractFailures(actualItems, expectedIds, kind) {
  const ids = actualItems.map((item) => typeof item === "string" ? item : item.id);
  const counts = new Map(ids.map((id) => [id, ids.filter((candidate) => candidate === id).length]));
  const failures = [];
  for (const id of expectedIds) {
    if (!counts.has(id)) failures.push({ id: `missing-${kind}:${id}`, message: `Required ${kind} is missing: ${id}` });
    else if (counts.get(id) > 1) failures.push({ id: `duplicate-${kind}:${id}`, message: `Required ${kind} is duplicated: ${id}` });
  }
  for (const id of counts.keys()) {
    if (!expectedIds.includes(id)) failures.push({ id: `unknown-${kind}:${id}`, message: `Unknown replacement ${kind} is not allowed: ${id}` });
  }
  return failures;
}

function evaluateContract({ routes, safetyCases, normativeRules, packageFiles, contract }) {
  if (!contract) return [];
  const failures = [
    ...contractFailures(routes, contract.routeIds, "route"),
    ...contractFailures(safetyCases, contract.safetyCaseIds, "safety-case"),
    ...contractFailures(normativeRules, contract.normativeRuleIds, "normative-rule"),
    ...contractFailures(packageFiles, contract.candidatePackageFiles, "package-file")
  ];
  const routeMap = new Map(routes.map((route) => [route.id, route]));
  for (const [id, paths] of Object.entries(contract.requiredLaterStages ?? {})) {
    const route = routeMap.get(id);
    if (!route) continue;
    for (const path of paths) {
      if (![...(route.coordinator ?? []), ...(route.later ?? [])].includes(path)) {
        failures.push({ id: `missing-later-stage:${id}:${path}`, message: `${id} must account for later-stage ${path}.` });
      }
    }
  }
  for (const [id, requiredStages] of Object.entries(contract.requiredStages)) {
    const route = routeMap.get(id);
    if (!route) continue;
    const stages = {
      coordinator: route.coordinator ?? [],
      templates: route.templates ?? [],
      worker: route.worker ?? []
    };
    for (const stage of requiredStages) {
      if (stages[stage].length === 0) {
        failures.push({ id: `missing-route-stage:${id}:${stage}`, message: `${id} is missing required ${stage} stage.` });
      }
    }
  }
  return failures;
}

export function evaluateStatic({ source, routes, safetyCases, normativeRules, packageFiles, contract = null }) {
  const issues = [];
  const routeResults = routes.map((route) => evaluateRoute(source, route, issues));
  const safety = safetyCases.map((safetyCase) => evaluateSafetyCase(source, safetyCase));
  const normative = normativeRules.map((rule) => evaluateNormativeRule(source, rule));
  const references = evaluateReferences(source, packageFiles);
  const hashes = sourceHashes(source, packageFiles, issues);
  const evaluationContractFailures = evaluateContract({ routes, safetyCases, normativeRules, packageFiles, contract });
  const findings = [];

  for (const failure of evaluationContractFailures) {
    findings.push({
      id: `evaluation-contract:${failure.id}`,
      kind: "evaluation-contract",
      severity: "blocking",
      message: failure.message
    });
  }

  for (const route of routeResults) {
    for (const path of route.unnecessary) {
      const file = route.files.find((entry) => entry.path === path);
      findings.push({
        id: `unnecessary-route-dependency:${route.id}:${path}`,
        kind: "protocol-weight",
        severity: "efficiency",
        route: route.id,
        path,
        bytes: file?.bytes ?? null,
        message: `${route.id} loads ${path} even though the declared minimum route does not require it.`
      });
    }
    if (route.missingRequired.length > 0 || route.missingLoaded.length > 0 || route.evidenceFailures.length > 0) {
      findings.push({
        id: `invalid-route-definition:${route.id}`,
        kind: "route",
        severity: "blocking",
        route: route.id,
        message: "The static route definition no longer matches its protocol evidence.",
        missingRequired: route.missingRequired,
        missingLoaded: route.missingLoaded,
        evidenceFailures: route.evidenceFailures
      });
    }
  }

  for (const result of safety.filter((entry) => entry.status === "fail")) {
    findings.push({
      id: `safety:${result.id}`,
      kind: "safety",
      severity: "blocking",
      knownBaselineFailure: result.knownBaselineFailure,
      path: result.path,
      message: result.reason ?? `${result.id} expected ${result.expected} but observed ${result.actual ?? "missing"}.`
    });
  }

  for (const rule of normative) {
    if (!rule.canonical.present) {
      findings.push({
        id: `missing-canonical-rule:${rule.id}`,
        kind: "normative-rule",
        severity: "blocking",
        message: `${rule.id} is missing its canonical owner.`
      });
    }
  }

  for (const reference of references.broken) {
    findings.push({
      id: `broken-reference:${reference.path}:${reference.target}`,
      kind: "reference",
      severity: "blocking",
      ...reference,
      message: `${reference.path} references missing package file ${reference.target}.`
    });
  }

  return {
    schemaVersion: 1,
    source: { label: source.label, hashes },
    package: {
      fileCount: packageFiles.length,
      registeredSkills: packageFiles.filter((path) => path.endsWith("SKILL.md")).length
    },
    routes: routeResults,
    safety,
    normative,
    references,
    issues,
    evaluationContractFailures,
    findings
  };
}

export function compactBaseline(report) {
  return {
    package: report.package,
    sourceHashes: report.source.hashes,
    routes: Object.fromEntries(
      report.routes.map((route) => [
        route.id,
        {
          protocolBytes: route.protocolBytes,
          files: route.files.map((file) => file.path),
          coordinatorFiles: route.coordinatorFiles,
          templateFiles: route.templateFiles,
          workerFiles: route.workerFiles,
          coordinatorProtocolBytes: route.coordinatorProtocolBytes,
          workerSystemBytes: route.workerSystemBytes,
          templateBytes: route.templateBytes,
          combinedStaticBytes: route.combinedStaticBytes,
          unnecessary: route.unnecessary,
          targetReductionPercent: route.targetReductionPercent,
          candidateBudgetBytes: Math.floor(route.combinedStaticBytes * (1 - route.targetReductionPercent / 100))
        }
      ])
    ),
    safetyOutcomes: Object.fromEntries(report.safety.map((result) => [result.id, result.status])),
    knownFindingIds: report.findings.map((finding) => finding.id).sort()
  };
}

export function compareFrozenBaseline(report, baseline) {
  const actual = compactBaseline(report);
  const differences = [];
  const expected = {
    package: baseline.package,
    sourceHashes: baseline.sourceHashes,
    routes: baseline.routes,
    safetyOutcomes: baseline.safetyOutcomes,
    knownFindingIds: baseline.knownFindingIds
  };

  for (const key of Object.keys(expected)) {
    if (stableStringify(actual[key]) !== stableStringify(expected[key])) differences.push(key);
  }
  return differences;
}

export function scoreCandidate(report, baseline) {
  const failures = [];

  for (const safety of report.safety) {
    if (safety.status !== "pass") {
      failures.push({
        id: `safety:${safety.id}`,
        category: "safety",
        message: `${safety.id} must pass for the candidate.`
      });
    }
  }

  for (const finding of report.findings) {
    if (finding.severity === "blocking" && finding.kind !== "safety") {
      failures.push({
        id: `blocking:${finding.id}`,
        category: "blocking",
        message: finding.message
      });
    }
  }

  for (const issue of report.issues) {
    failures.push({
      id: `blocking:${issue.id}`,
      category: "blocking",
      message: issue.message
    });
  }

  for (const baselineRouteId of Object.keys(baseline.routes)) {
    if (!report.routes.some((route) => route.id === baselineRouteId)) {
      failures.push({
        id: `blocking:missing-route:${baselineRouteId}`,
        category: "blocking",
        message: `Candidate did not produce the required frozen route ${baselineRouteId}.`
      });
    }
  }

  for (const route of report.routes) {
    const baselineRoute = baseline.routes?.[route.id];
    if (!baselineRoute || baselineRoute.targetReductionPercent <= 0) continue;
    const targetBytes = baselineRoute.candidateBudgetBytes;
    if (route.combinedStaticBytes > targetBytes) {
      failures.push({
        id: `route-budget:${route.id}`,
        category: "efficiency",
        message: `${route.id} combined static cost is ${route.combinedStaticBytes} bytes; target is at most ${targetBytes} bytes.`,
        actualBytes: route.combinedStaticBytes,
        targetBytes
      });
    }
  }

  return failures;
}

export function makeLivePlan(routes, repetitions = 2) {
  if (!Number.isInteger(repetitions) || repetitions < 1) throw new Error("repetitions must be a positive integer");
  const order = [];
  for (const route of routes) {
    for (let repetition = 1; repetition <= repetitions; repetition += 1) {
      const sequence = repetition % 2 === 1
        ? ["baseline", "candidate", "candidate", "baseline"]
        : ["candidate", "baseline", "baseline", "candidate"];
      for (const [index, side] of sequence.entries()) {
        order.push({ route: route.id, repetition, position: index + 1, side });
      }
    }
  }
  return order;
}
