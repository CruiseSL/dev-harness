import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { buildCodexDispatch } from "../../scripts/codex-dispatch.mjs";

const input = {config: {version: 2, childAgent: {model: "gpt-5.6-luna", reasoning: "xhigh"}}, taskName: "bounded_review", workOrder: "Read-only review. Owned writes: none. Return the concrete finding and stop."};

test("native payload pins settings, avoids custom roles/history and carries the shared contract", () => {
  const p = buildCodexDispatch(input);
  assert.deepEqual({...p, message: undefined}, {task_name: "bounded_review", agent_type: "default", model: "gpt-5.6-luna", reasoning_effort: "xhigh", fork_turns: "none", message: undefined});
  assert.ok(p.message.startsWith(readFileSync("templates/executor-contract.md", "utf8").trim()));
  assert.ok(p.message.endsWith(input.workOrder + "\n"));
  const other = buildCodexDispatch({...input, config: {version: 2, childAgent: {model: "host-model", reasoning: "high"}}});
  assert.equal(other.model, "host-model");
  assert.equal(other.reasoning_effort, "high");
});

test("executor and reviewer roles resolve separate explicit settings", () => {
  const config = {
    version: 2,
    coordinator: {model: "gpt-6-astra", reasoning: "medium"},
    childAgent: {model: "gpt-5.6-luna", reasoning: "xhigh"},
    reviewerAgent: {model: "gpt-5.6-sol", reasoning: "high"}
  };
  const executor = buildCodexDispatch({...input, config});
  const reviewer = buildCodexDispatch({...input, config, role: "reviewer"});

  assert.equal(executor.model, config.childAgent.model);
  assert.equal(executor.reasoning_effort, config.childAgent.reasoning);
  assert.ok(executor.message.startsWith(readFileSync("templates/executor-contract.md", "utf8").trim()));
  assert.equal(reviewer.model, config.reviewerAgent.model);
  assert.equal(reviewer.reasoning_effort, config.reviewerAgent.reasoning);
  assert.ok(reviewer.message.startsWith(readFileSync("templates/reviewer-contract.md", "utf8").trim()));
  assert.notEqual(executor.message, reviewer.message);
});

test("reviewer dispatch requires its own valid configuration and never falls back to executor", () => {
  assert.throws(
    () => buildCodexDispatch({...input, role: "reviewer"}),
    /Expected version 2 reviewerAgent configuration\./
  );
  for (const reviewerAgent of [
    {model: "gpt-5.6-sol"},
    {reasoning: "high"},
    {model: "<model>", reasoning: "high"},
    {model: "gpt-5.6-sol", reasoning: "high", agent: "reviewer"}
  ]) {
    assert.throws(
      () => buildCodexDispatch({...input, config: {...input.config, reviewerAgent}, role: "reviewer"}),
      reviewerAgent.agent ? /Direct dispatch requires omitting childAgent\.agent/ : undefined
    );
  }
});

test("coordinator and unknown roles are rejected", () => {
  assert.throws(() => buildCodexDispatch({...input, role: "coordinator"}), /Unsupported dispatch role: coordinator/);
  assert.throws(() => buildCodexDispatch({...input, role: "auditor"}), /Unsupported dispatch role: auditor/);
});

test("reviewer contract is bounded and read-only", () => {
  const p = buildCodexDispatch({
    ...input,
    config: {
      version: 2,
      childAgent: input.config.childAgent,
      reviewerAgent: {model: "gpt-5.6-sol", reasoning: "high"}
    },
    role: "reviewer"
  });
  for (const text of [
    "read-only review",
    "Do not edit",
    "Do not spawn nested agents",
    "Do not load Dev Harness, `SKILL.md`, or another controller",
    "external mutation",
    "scoped to the supplied Work Order",
    "do not authorize edits or a fix workflow"
  ]) assert.match(p.message, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(p.message, /Return one review decision/);
  assert.ok(!p.message.includes("Before any edit, pipe"));
});

test("missing settings and named roles cannot silently become native defaults", () => {
  for (const config of [
    {version: 1, childAgent: input.config.childAgent},
    {version: 2, childAgent: {model: "gpt-5.6-luna"}},
    {version: 2, childAgent: {model: "<model>", reasoning: "xhigh"}},
    {version: 2, childAgent: {...input.config.childAgent, agent: "luna-worker"}},
    {version: 2, childAgent: {...input.config.childAgent, agent: null}}
  ]) assert.throws(() => buildCodexDispatch({...input, config}));
  assert.throws(() => buildCodexDispatch({...input, workOrder: " "}));
});

test("project template records coordinator, executor and reviewer settings without named agents", () => {
  const config = JSON.parse(readFileSync("templates/codex-project-config.json", "utf8"));
  assert.deepEqual(config, {
    version: 2,
    coordinator: {model: "gpt-6-astra", reasoning: "medium"},
    childAgent: {model: "gpt-5.6-luna", reasoning: "xhigh"},
    reviewerAgent: {model: "gpt-5.6-sol", reasoning: "high"}
  });
  for (const key of ["coordinator", "childAgent", "reviewerAgent"]) assert.equal(Object.hasOwn(config[key], "agent"), false);
});

test("payload CLI is non-executing and independent of caller working directory", () => {
  const script = `${process.cwd()}/scripts/codex-dispatch.mjs`;
  const cliInput = {
    ...input,
    config: {
      version: 2,
      childAgent: input.config.childAgent,
      reviewerAgent: {model: "gpt-5.6-sol", reasoning: "high"}
    },
    role: "reviewer"
  };
  const p = spawnSync(process.execPath, [script], {cwd: "/private/tmp", input: JSON.stringify(cliInput), encoding: "utf8"});
  assert.equal(p.status, 0, p.stderr);
  assert.deepEqual(JSON.parse(p.stdout), buildCodexDispatch(cliInput));
});
