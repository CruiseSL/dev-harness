import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assessDelivery, compareDeliveries, deliveryCases, prepareDelivery, startDelivery } from "./delivery.mjs";
import { createFilesystemSource, createGitSource, readJson } from "./score.mjs";
import { evaluationContract } from "./evaluation-contract.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const [command = "plan", directory, id, evidenceFile] = process.argv.slice(2);
try {
  let result;
  if (command === "plan") {
    result = { evidenceType: "delivery-plan", modelCalls: false, cases: deliveryCases.map(({id, level, prompt, owned}) => ({id, level, prompt, owned})),
      usage: "prepare <new-directory> | start <directory> <run-id> | assess <directory> <run-id> <observations.json> | compare <directory>" };
  } else {
    if (!directory) throw new Error("An exercise directory is required.");
    if (command === "prepare") {
      const baseline = readJson(join(root, "tests/eval/baselines/v2.5.json"));
      const baselineSource = createGitSource(root, baseline.revision);
      const candidateSource = createFilesystemSource(root);
      result = prepareDelivery({ output: directory, sources: {
        baseline: { ...baselineSource, files: Object.keys(baseline.sourceHashes).filter((p) => p !== "tests/validate.mjs") },
        candidate: { ...candidateSource, files: evaluationContract.candidatePackageFiles.filter((p) => p !== "tests/validate.mjs") }
      } });
      result = { schemaVersion: result.schemaVersion, evidenceType: result.evidenceType,
        directory: resolve(directory), runs: result.runs.map(({id,side,caseId,workspace,prompt}) => ({id,side,caseId,workspace,prompt})) };
    } else if (command === "start") result = startDelivery(directory, id);
    else if (command === "assess") {
      if (!evidenceFile) throw new Error("Supply recorded session observations as JSON.");
      result = assessDelivery(directory, id, JSON.parse(readFileSync(evidenceFile)));
      if (!result.completed) process.exitCode = 1;
    } else if (command === "compare") {
      result = compareDeliveries(readdirSync(directory).filter((p) => p.endsWith(".result.json")).map((p) => JSON.parse(readFileSync(join(directory,p)))));
    } else throw new Error(`Unknown command: ${command}`);
  }
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
} catch (error) {
  process.stderr.write(`Delivery evaluation failed: ${error.message}\n`);
  process.exitCode = 1;
}
