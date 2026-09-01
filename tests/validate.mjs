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
assert(skill.includes('version: "2.1.0"'), "Skill version must be 2.1.0");
assert(skill.includes("Route automatically"), "Root Skill must require automatic routing");
assert(skill.includes("never silently inherit the main Session settings"), "Root Skill must forbid implicit child model inheritance");

const orchestration = read("references/orchestration.md");
for (const text of [
  ".agents/dev-harness.json",
  "An explicit user choice in the current conversation",
  "Ask the user before dispatch",
  "Do not use a global default",
  "main Session's model or reasoning depth",
  "current-run configuration only",
  "verify that the child was created with those exact settings"
]) {
  assert(orchestration.includes(text), `Missing child execution configuration contract: ${text}`);
}
assert(!orchestration.includes("preserve the role and scope constraints and use the available model"), "Orchestration must not silently use an inherited model");

const workOrder = read("templates/work-order.md");
assert(workOrder.includes("**Child model:**"), "Work Order must record the concrete child model");
assert(workOrder.includes("**Child reasoning:**"), "Work Order must record the concrete child reasoning depth");

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

const propose = read("references/architect/propose.md");
assert(propose.includes("separate specification and plan approvals"), "Propose must preserve separate approvals");
assert(propose.includes("No management write occurs before `plan_approved`"), "Propose must defer writes until approval");
assertOrdered(propose, ["spec_approved", "plan_approved", "track_created"], "Proposal state order is invalid");

const implement = read("references/architect/implement.md");
assert(implement.includes("self-contained Track Work Order"), "Implement must use bounded Work Orders");
assert(implement.includes("Implementation does not authorize a commit"), "Implement must not infer commit permission");
assertOrdered(implement, ["units_complete", "docs_synchronized", "finalization_review", "track_completed"], "Track must not complete before final review");
assert(implement.includes("A blocker before step 8 leaves the Track `in_progress`"), "Finalization failure must preserve active Track state");

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
