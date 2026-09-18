import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".git") return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertOrdered(content, labels, message) {
  let previous = -1;
  for (const label of labels) {
    const current = content.indexOf(label);
    assert(current >= 0 && current > previous, `${message}: ${label}`);
    previous = current;
  }
}

const required = [
  "SKILL.md",
  "README.md",
  "LICENSE",
  "NOTICE",
  "references/classification.md",
  "references/codex-dispatch.md",
  "references/delivery.md",
  "references/technical-quality.md",
  "references/orchestration.md",
  "references/execution.md",
  "references/review.md",
  "references/route-manifest.json",
  "references/track-gate.md",
  "references/validation-scenarios.md",
  "references/architect/router.md",
  "references/architect/contracts.md",
  "references/architect/setup.md",
  "references/architect/discuss.md",
  "references/architect/propose.md",
  "references/architect/implement.md",
  "references/architect/review.md",
  "references/architect/status.md",
  "references/architect/track-runtime.md",
  "references/architect/defaults/delivery.md",
  "references/architect/defaults/code-style.md",
  "templates/work-order.md",
  "scripts/attestation.mjs",
  "templates/result.md",
  "templates/opencode-worker.md",
  "templates/executor-contract.md",
  "templates/reviewer-contract.md",
  "templates/codex-project-config.json",
  "scripts/codex-dispatch.mjs",
  "templates/architect/discussion.md",
  "templates/architect/spec.md",
  "templates/architect/plan.md",
  "templates/architect/metadata.md",
  "templates/architect/core-index.md",
  "templates/architect/management-section.md",
  "templates/architect/tracks.md",
  "templates/architect/registry-entry.md",
  "templates/architect/track-index.md"
];

for (const path of required) {
  assert(existsSync(join(root, path)), `Missing required package file: ${path}`);
}

const files = walk(root);
const skillFiles = files.filter((path) => basename(path) === "SKILL.md");
assert(skillFiles.length === 1, `Expected one registered Skill, found ${skillFiles.length}`);

const skill = read("SKILL.md");
assert(skill.includes("name: dev-harness"), "Skill name must be dev-harness");
assert(skill.includes("license: Apache-2.0"), "Skill license must be Apache-2.0");
assert(skill.includes('version: "2.6.0"'), "Skill version must be 2.6.0");
assert(skill.includes("Route explicit intent before classification"), "Root Skill must require automatic intent routing");
assert(skill.includes("silently inherit the main Session settings"), "Root Skill must forbid implicit child model inheritance");
assert(skill.includes("Never expose internal profile names"), "Root Skill must hide internal profiles from users");
assert(skill.includes("Track Delegation Gate"), "Root Skill must require the Track Delegation Gate");
assert(skill.includes("not a general brainstorming dependency"), "Root Skill must distinguish Track Discuss from general brainstorming");
assert(skill.includes("references/track-gate.md"), "Root Skill must load the compact Track gate");
assert(skill.includes("references/architect/track-runtime.md"), "Root Skill must load the compact Track runtime");
for (const text of [
  "Route explicit intent before classification",
  "Quick runs in the Coordinator current Session by default",
  "Scoped runs as one bounded Coordinator execution pass by default",
  "Only when dispatch is selected",
  "Record validation evidence by command, scope/input fingerprint",
  "Track lifecycle bookkeeping, external polling, deadlines, and provider status remain Coordinator work"
]) {
  assert(skill.includes(text), `Missing throughput root contract: ${text}`);
}

const orchestration = read("references/orchestration.md");
for (const text of [
  ".agents/dev-harness.json",
  "Current Session",
  "Current Project",
  "Every Dispatch",
  "ask for the model, reasoning value, and reuse scope",
  "Never ask the user to select, configure, or understand a profile",
  '"childAgent"',
  "Version 1 files with a `profiles` object are legacy",
  "Do not use a global default",
  "main Session's model or reasoning depth",
  "verify that the child was created with those exact settings",
  "## Track Delegation Gate",
  "## Internal Model Routing",
  "### OpenCode Named-Agent Adapter",
  'subagent_type: "dev-harness-worker"',
  "verified matching named host Agent",
  "Do not use a generic Agent",
  "## Dispatch Rules",
  "Complete the Work Order Execution Attestation immediately before dispatch",
  "schema version 2",
  "executionBinding",
  "returned envelope is already the complete stdin for `verify`",
  "binds execution identity and Track gate evidence",
  "Reject a missing, placeholder, stale, or ambiguous attestation before dispatch",
  "An Executor never commits, pushes, publishes or tags",
  "the Work Order is not Executor authorization"
]) {
  assert(orchestration.includes(text), `Missing child execution configuration contract: ${text}`);
}
assert(!orchestration.includes("preserve the role and scope constraints and use the available model"), "Orchestration must not silently use an inherited model");
assertOrdered(
  orchestration,
  [
    "## Track Delegation Gate",
    "Before dispatching a delegated unit or allowing child writes:",
    "Stop the delegated unit with `blocked` while its configuration is unresolved",
    "Do not silently replace a required independent Executor with the Coordinator."
  ],
  "Track child configuration must block edits"
);

const workOrder = read("templates/work-order.md");
assert(workOrder.includes("**Internal execution profile:**"), "Work Order must mark execution profiles as internal");
assert(workOrder.includes("**Child model:**"), "Work Order must record the concrete child model");
assert(workOrder.includes("**Child reasoning:**"), "Work Order must record the concrete child reasoning depth");
assert(workOrder.includes("**Child Agent:**"), "Work Order must record the named host Agent or direct dispatch");
assert(workOrder.includes("**Child configuration source:**"), "Work Order must record the child configuration source");
for (const text of [
  "## Execution Attestation",
  "**Verifier:**",
  "**Baseline status:**",
  "### Verification Envelope",
  "complete `envelope` object",
  "schema version 2",
  "already the complete stdin"
]) {
  assert(workOrder.includes(text), `Work Order must include attestation field: ${text}`);
}
for (const text of ["**Shared-contract trigger:**", "**Broad-check gate:**", "### Evidence Ledger", "**External validation:**"]) {
  assert(workOrder.includes(text), `Work Order must include validation ledger field: ${text}`);
}

const openCodeWorker = read("templates/opencode-worker.md");
assert(openCodeWorker.replace(/^---\n[\s\S]*?\n---\n/, "").trim() === read("templates/executor-contract.md").trim(), "OpenCode and Codex must share the same canonical Executor contract");
for (const text of [
  "mode: subagent",
  "model: <childAgent.model>",
  "variant: <childAgent.reasoning>",
  "skill: deny",
  "task: deny",
  "question: deny",
  "Reject the Work Order as `blocked` with zero writes",
  "complete, unmodified schema version 2 Verification Envelope",
  "already the complete CLI input",
  "reports any mismatch or invalid attestation",
  "Do not load Dev Harness, `SKILL.md`, or another controller",
  "Do not commit, push, publish or tag, deploy, send externally, run a migration, clean up, delete, or perform another destructive action.",
  "Return the requested operation to the Coordinator",
  "Do not claim harness-level acceptance"
]) {
  assert(openCodeWorker.includes(text), `OpenCode worker template must include: ${text}`);
}

const reviewProtocol = read("references/review.md");
for (const text of [
  "## Inputs",
  "Local review, including small Track units",
  "original compact checklist",
  "current-Session changed-file list and cumulative diff",
  "Delegated review",
  "approved Work Order, Executor Result"
]) {
  assert(reviewProtocol.includes(text), `Review must support local and delegated input contracts: ${text}`);
}

const router = read("references/architect/router.md");
for (const route of [
  "references/architect/setup.md",
  "references/architect/discuss.md",
  "references/architect/propose.md",
  "references/architect/implement.md",
  "references/architect/review.md",
  "references/architect/status.md"
]) {
  assert(router.includes(route), `Router must include internal route: ${route}`);
}
assert(router.includes("Dev Harness is the only implementation controller"), "Router must define one controller");
assert(router.includes("material direction unresolved? yes -> discuss"), "Router must include the Discuss gate");
assert(router.includes("Legacy names"), "Router must preserve legacy intent aliases");
assert(router.includes("Do not ask `Which Architect skill should I use?`"), "Router must forbid exposed module selection");

const contracts = read("references/architect/contracts.md");
for (const text of [
  "Any Git commit",
  "Explicit commit request",
  "Legacy metadata without `schema_version`",
  "User Manual Verification",
  "Phase Verification",
  "Track finalization is a dedicated unit"
]) {
  assert(contracts.includes(text), `Missing shared contract: ${text}`);
}
assert(contracts.includes("Only the current user may explicitly approve a larger limit"), "Budget extension must require current-user approval");

const classification = read("references/classification.md");
assert(classification.includes("One compact in-memory Coordinator checklist"), "Quick must avoid a full Work Order by default");
assert(classification.includes("Sending one canary message to one explicitly named internal recipient is Scoped"), "Internal canary must classify as Scoped");
assert(classification.includes("external send still requires exact current-conversation authorization"), "Canary send must retain exact authorization");

const discuss = read("references/architect/discuss.md");
assert(discuss.includes("automatic material-ambiguity gate"), "Discuss must support automatic entry");
assert(!discuss.includes("Require explicit `architect-discuss` invocation"), "Discuss must not require its legacy name");
assert(discuss.includes("self-contained requirements-discussion protocol"), "Discuss must be self-contained");
assert(
  discuss.includes("standalone request to brainstorm, ideate, or explore without a Track candidate is not a Discuss trigger"),
  "Discuss must not claim standalone brainstorming"
);
assert(discuss.includes("Never repeat a settled question"), "Discuss must reuse existing brainstorming conclusions");

const propose = read("references/architect/propose.md");
assert(propose.includes("separate specification and plan approvals"), "Propose must preserve separate approvals");
assert(propose.includes("No management write occurs before `plan_approved`"), "Propose must defer writes until approval");
assertOrdered(propose, ["spec_approved", "plan_approved", "track_created"], "Proposal state order is invalid");

const implement = read("references/architect/implement.md");
assert(implement.includes("self-contained Track Work Order"), "Implement must use bounded Work Orders");
assert(implement.includes("Implementation does not authorize a commit"), "Implement must not infer commit permission");
assert(implement.includes("## Track Delegation Gate"), "Implement must define the Track Delegation Gate");
assert(implement.includes("The Coordinator may execute a small bounded Track unit locally"), "Implement must allow ownership-checked local Track work");
assert(implement.includes("Invoke that Agent by name for the Work Order"), "Implement must invoke a verified named host Agent");
assert(implement.includes("1. Confirm local ownership or that the Track Delegation Gate has passed for delegation."), "Unit execution must confirm the Track gate before mutating state");
assertOrdered(
  implement,
  ["## Track Delegation Gate", "The gate must pass before delegated Work Order creation or child edits.", "## Unit Execution"],
  "Track gate must precede unit execution"
);
assertOrdered(implement, ["units_complete", "docs_synchronized", "finalization_review", "track_completed"], "Track must not complete before final review");
assert(implement.includes("A blocker before step 8 leaves the Track `in_progress`"), "Finalization failure must preserve active Track state");
assert(implement.includes("Adjacent pending units may be merged into one bounded Work Order only when"), "Compatible Track units must support bounded merging");
assert(implement.includes("never dispatch a bookkeeping-only child"), "Track bookkeeping must remain Coordinator-owned");

const execution = read("references/execution.md");
for (const text of [
  "Maintain a validation evidence ledger",
  "invalidate only entries whose recorded inputs or relevant files changed",
  "Documentation, lifecycle bookkeeping, or one changed test expectation does not trigger a broad validation bundle",
  "Executors do not wait or poll",
  "Budget limits are hard stop conditions",
  "Only the current user may explicitly approve a new limit"
]) {
  assert(execution.includes(text), `Missing throughput execution contract: ${text}`);
}

const standardReview = read("references/review.md");
assert(standardReview.includes("Do not create a new parent Work Order, Track, or Reviewer Session"), "Mechanical review fixes must stay in the active cycle");
assert(standardReview.includes("Coordinator cannot turn `2/2` into `3/3` or `4/4`"), "Review budgets must not auto-expand");

const scenarios = read("references/validation-scenarios.md");
assert(scenarios.includes("## Track: Child Configuration Gate"), "Validation scenarios must cover the first Track-unit configuration gate");
assert(scenarios.includes("## Track: Local Execution And Required Independence"), "Validation scenarios must cover local work and required independent execution");
assert(scenarios.includes("## Track: OpenCode Named-Agent Adapter"), "Validation scenarios must accept a matching OpenCode named Agent");
assert(scenarios.includes("## Track: Named-Agent Mismatch Or Reload"), "Validation scenarios must reject mismatched or unloaded named Agents");
assert(scenarios.includes("## Brainstorming: Standalone Exploration"), "Validation scenarios must keep standalone brainstorming outside Architect");
assert(scenarios.includes("## Track: Reuse Earlier Brainstorming"), "Validation scenarios must reuse prior brainstorming evidence");
assert(scenarios.includes("## Worker: Recursive Control Boundary"), "Validation scenarios must forbid worker recursive control paths");
assert(scenarios.includes("## Worker: Attestation Mismatch"), "Validation scenarios must reject invalid worker attestations");
assert(scenarios.includes("## Worker: Consequential Operation Authorization"), "Validation scenarios must require exact consequential-operation authorization");

assert(router.includes("Track Delegation Gate"), "Router must route Track units through the delegation gate");
assert(router.includes("The Coordinator or assigned Executor"), "Router must support local or delegated Track work");
assert(router.includes("references/track-gate.md"), "Router must route Track units through the compact gate");
assert(router.includes("references/architect/track-runtime.md"), "Router must route passed Track units through the compact runtime");
assert(router.includes("self-contained requirements-discussion protocol for Track candidates"), "Router must make Discuss self-contained");
assert(router.includes("Do not route a standalone request to brainstorm, ideate, or explore into Architect"), "Router must keep standalone brainstorming outside Architect");
assert(router.includes("skip Discuss entirely when that evidence establishes the Track direction"), "Router must reuse prior brainstorming evidence");
assertOrdered(
  router,
  ["The Coordinator selects local or delegated work", "Architect lifecycle selects and marks the unit", "The Coordinator or assigned Executor"],
  "Router must gate Track mutation before Executor work"
);

const trackGate = read("references/track-gate.md");
for (const text of [
  "version 2",
  "childAgent.model",
  "childAgent.reasoning",
  "fails closed",
  "named Agent",
  "pins the exact configured model and reasoning or variant",
  "Do not silently replace a required independent Executor with the Coordinator."
]) {
  assert(trackGate.includes(text), `Track gate runtime must include: ${text}`);
}
assertOrdered(
  trackGate,
  [
    "query available child models and reasoning variants when possible",
    "ask the user once for a concrete model, reasoning value, and reuse scope",
    "While that question is unanswered, return the delegated unit `blocked`",
    "record a `Current Project` choice in `.agents/dev-harness.json` before dispatch"
  ],
  "Track gate must ask once and pause before configuration writes or dispatch"
);

const trackRuntime = read("references/architect/track-runtime.md");
for (const text of [
  "resume the active approved unit",
  "The Coordinator owns lifecycle bookkeeping",
  "self-contained Work Order",
  "Do not begin review before implementation evidence exists",
  "Redispatch, a new Work Order, a new Session, or a later phase never resets a unit budget",
  "requires exact current-conversation authorization"
]) {
  assert(trackRuntime.includes(text), `Track runtime must include: ${text}`);
}

const plan = read("templates/architect/plan.md");
assert(plan.includes("User Manual Verification"), "New plans must emit the upstream v1 phase gate");
assert(plan.includes("Protocol in workflow.md"), "New phase gates must preserve the v1 protocol reference");

const registry = read("templates/architect/registry-entry.md");
assert(/- \[ \] \*\*Track: <Track Description>\*\*/.test(registry), "Registry template must contain one pending marker");
assert(/\.\/tracks\/<track_id>\//.test(registry), "Registry template must contain a safe relative Track link");

const metadataDocument = read("templates/architect/metadata.md");
const metadataMatch = metadataDocument.match(/```json\n([\s\S]+?)\n```/);
assert(metadataMatch, "Metadata template must contain one fenced JSON object");
const metadataTemplate = JSON.parse(metadataMatch[1]);
assert(metadataTemplate.schema_version === 1, "Metadata template must declare schema version 1");
assert(metadataTemplate.status === "new", "Metadata template must begin in new state");
assert(metadataDocument.includes("Modified from hlhr202/swe-skills"), "Metadata template must carry a modified-file notice");

for (const path of [
  "templates/architect/discussion.md",
  "templates/architect/spec.md",
  "templates/architect/plan.md",
  "templates/architect/core-index.md",
  "templates/architect/management-section.md",
  "templates/architect/tracks.md",
  "templates/architect/registry-entry.md",
  "templates/architect/track-index.md"
]) {
  assert(read(path).includes("Modified from hlhr202/swe-skills"), `Missing modified-file notice: ${path}`);
}

for (const path of [
  "references/architect/router.md",
  "references/architect/contracts.md",
  "references/architect/setup.md",
  "references/architect/discuss.md",
  "references/architect/propose.md",
  "references/architect/implement.md",
  "references/architect/review.md",
  "references/architect/status.md",
  "references/architect/defaults/delivery.md",
  "references/architect/defaults/code-style.md"
]) {
  assert(read(path).includes("hlhr202/swe-skills"), `Missing upstream attribution notice: ${path}`);
}

for (const file of files.filter((path) => path.endsWith(".md"))) {
  const content = readFileSync(file, "utf8");
  for (const match of content.matchAll(/`((?:references|templates)\/[^`]+)`/g)) {
    const target = match[1];
    assert(existsSync(join(root, target)), `Broken package-root reference in ${relative(root, file)}: ${target}`);
  }
}

const packageText = files
  .filter((path) => path.endsWith(".md"))
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");

for (const forbidden of [
  "Dev Harness controlled",
  "Architect controlled",
  "hand off the full Track to `architect-implement`",
  "Architect is unavailable",
  "more than 80% coverage"
]) {
  assert(!packageText.includes(forbidden), `Forbidden legacy contract text: ${forbidden}`);
}



for (const path of ["SKILL.md", "references/orchestration.md", "references/track-gate.md", "references/architect/track-runtime.md", "references/architect/implement.md", "references/architect/router.md"]) {
  const content = read(path);
  assert(!/Coordinator current Session (never executes|must not execute)|Do not execute a Track unit in the current Session/.test(content), `${path} retains mandatory delegation`);
}
assert(orchestration.includes("Missing `reviewerAgent` blocks only reviewer dispatch"), "Missing reviewer must not inherit developer settings");
assert(trackRuntime.includes("Never edit an active Executor's files concurrently"), "Local execution must preserve child ownership");
assert(orchestration.includes("Keep the same Executor for a deliverable"), "Fixes should reuse developer context");
assert(read("README.md").includes("does not switch an already running Codex session"), "Main preference is not a live switch");

for (const path of ["references/orchestration.md", "references/execution.md", "templates/executor-contract.md", "references/review.md", "references/validation-scenarios.md"]) {
  assert(read(path).includes("same-ID amend"), `${path} must support same-owner repair amendments`);
}
console.log(
  `Validated dev-harness package: ${files.length} files, one registered Skill, automatic Architect routing, v1 compatibility, bounded finalization, explicit approvals, and Apache-2.0 attribution.`
);
