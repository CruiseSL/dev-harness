import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const contract = () => readFileSync(new URL("../templates/executor-contract.md", import.meta.url), "utf8").trim();
const reviewerContract = () => readFileSync(new URL("../templates/reviewer-contract.md", import.meta.url), "utf8").trim();
const concrete = value => typeof value === "string" && value.trim() && !/[<>\r\n]/.test(value);
const namedRoleError = "Direct dispatch requires omitting childAgent.agent; do not silently replace a named role.";

// Constructs a call payload only. The Coordinator verifies host capabilities,
// Work Order completeness and attestation separately before invoking the host.
export function buildCodexDispatch({ config, taskName, workOrder, role = "executor" }) {
  if (role !== "executor" && role !== "reviewer") {
    throw new Error(`Unsupported dispatch role: ${String(role)}. Only executor or reviewer may be spawned.`);
  }

  const configKey = role === "reviewer" ? "reviewerAgent" : "childAgent";
  const child = config?.[configKey];
  if (config?.version !== 2 || !child) {
    throw new Error(`Expected version 2 ${configKey} configuration.`);
  }
  if (Object.hasOwn(child, "agent")) throw new Error(namedRoleError);
  if (!concrete(child.model) || !concrete(child.reasoning)) throw new Error("Explicit concrete model and reasoning are required.");
  if (!/^[a-z][a-z0-9_]*$/.test(taskName ?? "")) throw new Error("Supply a lowercase taskName.");
  if (typeof workOrder !== "string" || !workOrder.trim()) throw new Error("Supply the complete self-contained Work Order.");
  return {
    task_name: taskName, agent_type: "default", model: child.model,
    reasoning_effort: child.reasoning, fork_turns: "none",
    message: `${(role === "reviewer" ? reviewerContract() : contract())}\n\n---\n\n${workOrder.trim()}\n`
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(JSON.stringify(buildCodexDispatch(JSON.parse(readFileSync(0, "utf8"))), null, 2) + "\n");
  } catch (error) {
    process.stderr.write(`Codex dispatch preparation failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
