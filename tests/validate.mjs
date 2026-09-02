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
  "references/orchestration.md",
  "references/execution.md",
  "references/review.md",
  "references/validation-scenarios.md",
  "references/architect/router.md",
  "references/architect/contracts.md",
  "references/architect/setup.md",
  "references/architect/discuss.md",
  "references/architect/propose.md",
  "references/architect/implement.md",
  "references/architect/review.md",
  "references/architect/status.md",
  "references/architect/defaults/delivery.md",
  "references/architect/defaults/code-style.md",
  "templates/work-order.md",
  "templates/result.md",
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
assert(skill.includes('version: "2.4.0"'), "Skill version must be 2.4.0");
assert(skill.includes("Route automatically"), "Root Skill must require automatic routing");
assert(skill.includes("silently inherit the main Session settings"), "Root Skill must forbid implicit child model inheritance");
assert(skill.includes("never expose internal profile names"), "Root Skill must hide internal profiles from users");
assert(skill.includes("Track Delegation Gate"), "Root Skill must require the Track Delegation Gate");
assert(skill.includes("not a general brainstorming dependency"), "Root Skill must distinguish Track Discuss from general brainstorming");

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
  "For the first unit that the current Session executes for each Track",
  "only a valid project-local `.agents/dev-harness.json` `childAgent` configuration suppresses the configuration question",
  "For Track, capability-discovery routes 3 and 4 are not available",
  "must not execute a Track unit in the current Session"
]) {
  assert(orchestration.includes(text), `Missing child execution configuration contract: ${text}`);
}
assert(!orchestration.includes("preserve the role and scope constraints and use the available model"), "Orchestration must not silently use an inherited model");
assertOrdered(
  orchestration,
  [
    "## Track Delegation Gate",
    "Before marking the first unit active, creating its Work Order, or editing any Track or implementation file",
    "Stop with the Track `blocked` state while that question is unanswered",
    "For Track, capability-discovery routes 3 and 4 are not available"
  ],
  "Track child configuration must block edits"
);

const workOrder = read("templates/work-order.md");
assert(workOrder.includes("**Internal execution profile:**"), "Work Order must mark execution profiles as internal");
assert(workOrder.includes("**Child model:**"), "Work Order must record the concrete child model");
assert(workOrder.includes("**Child reasoning:**"), "Work Order must record the concrete child reasoning depth");
assert(workOrder.includes("**Child configuration source:**"), "Work Order must record the child configuration source");

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

const discuss = read("references/architect/discuss.md");
assert(discuss.includes("automatic material-ambiguity gate"), "Discuss must support automatic entry");
assert(!discuss.includes("Require explicit `architect-discuss` invocation"), "Discuss must not require its legacy name");
assert(discuss.includes("self-contained requirements-discussion protocol"), "Discuss must be self-contained");
assert(discuss.includes("standalone request to brainstorm, ideate, or explore without a Track candidate is not a Discuss trigger"), "Discuss must not claim standalone brainstorming");
assert(discuss.includes("Never repeat a settled question"), "Discuss must reuse existing brainstorming conclusions");

const propose = read("references/architect/propose.md");
assert(propose.includes("separate specification and plan approvals"), "Propose must preserve separate approvals");
assert(propose.includes("No management write occurs before `plan_approved`"), "Propose must defer writes until approval");
assertOrdered(propose, ["spec_approved", "plan_approved", "track_created"], "Proposal state order is invalid");

const implement = read("references/architect/implement.md");
assert(implement.includes("self-contained Track Work Order"), "Implement must use bounded Work Orders");
assert(implement.includes("Implementation does not authorize a commit"), "Implement must not infer commit permission");
assert(implement.includes("## Track Delegation Gate"), "Implement must define the Track Delegation Gate");
assert(implement.includes("Do not execute a Track unit in the current Session"), "Implement must forbid Track current-Session execution");
assert(implement.includes("1. Confirm the Track Delegation Gate has passed."), "Unit execution must confirm the Track gate before mutating state");
assertOrdered(
  implement,
  [
    "## Track Delegation Gate",
    "The gate must pass before any Track state, Work Order, or implementation edit.",
    "## Unit Execution"
  ],
  "Track gate must precede unit execution"
);
assertOrdered(implement, ["units_complete", "docs_synchronized", "finalization_review", "track_completed"], "Track must not complete before final review");
assert(implement.includes("A blocker before step 8 leaves the Track `in_progress`"), "Finalization failure must preserve active Track state");

const scenarios = read("references/validation-scenarios.md");
assert(scenarios.includes("## Track: Child Configuration Gate"), "Validation scenarios must cover the first Track-unit configuration gate");
assert(scenarios.includes("## Track: No Current-Session Fallback"), "Validation scenarios must reject Track current-Session fallback");
assert(scenarios.includes("## Brainstorming: Standalone Exploration"), "Validation scenarios must keep standalone brainstorming outside Architect");
assert(scenarios.includes("## Track: Reuse Earlier Brainstorming"), "Validation scenarios must reuse prior brainstorming evidence");

assert(router.includes("Track Delegation Gate"), "Router must route Track units through the delegation gate");
assert(router.includes("An Executor, never the Coordinator current Session"), "Router must forbid the Coordinator from executing Track units");
assert(router.includes("self-contained requirements-discussion protocol for Track candidates"), "Router must make Discuss self-contained");
assert(router.includes("Do not route a standalone request to brainstorm, ideate, or explore into Architect"), "Router must keep standalone brainstorming outside Architect");
assert(router.includes("skip Discuss entirely when that evidence establishes the Track direction"), "Router must reuse prior brainstorming evidence");
assertOrdered(
  router,
  [
    "The Coordinator passes the Track Delegation Gate",
    "Architect lifecycle selects and marks the unit",
    "An Executor, never the Coordinator current Session"
  ],
  "Router must gate Track mutation before Executor work"
);

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

console.log(
  `Validated dev-harness package: ${files.length} files, one registered Skill, automatic Architect routing, v1 compatibility, bounded finalization, explicit approvals, and Apache-2.0 attribution.`
);
