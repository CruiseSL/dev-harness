# Orchestration Protocol

## Purpose

Define Dev Harness coordination, implementation, and review roles while remaining portable across runtimes with different Session, Subagent, and model-selection capabilities.

## Roles

- **Coordinator:** Clarifies the outcome, classifies work, writes the Work Order, selects capabilities, reviews results, approves fixes, and owns the final answer.
- **Executor:** Implements one Work Order and returns evidence. It does not own requirements or process escalation.
- **Reviewer:** Compares the Work Order, diff, and validation evidence. It reports findings but does not edit without a new approved Work Order.

The Coordinator may also act as Reviewer. Prefer role separation over spawning another reviewer for Quick work.

## Capability Discovery

Before dispatch, inspect the runtime's available tools. Delegation is valid only when both the child model and reasoning depth can be selected explicitly. Resolve child settings only when a child will actually be created; an intentional current-Session execution does not need child configuration. Choose the first supported path:

1. **Persistent Session with model and reasoning selection:** Create or reuse a worker Session with the resolved settings, send the Work Order, and retrieve its terminal result.
2. **Subagent with model and reasoning selection:** Spawn one bounded Executor with the resolved settings and wait for its result.
3. **No explicit child selection:** Do not spawn a child that silently inherits the main Session. Execute in the current Session with an explicit phase boundary and separate Reviewer pass, or return `blocked` when role separation is required for safety.
4. **No delegation:** Execute in the current Session, then create an explicit phase boundary, reread the Work Order, inspect the diff, and perform a separate Reviewer pass.

Do not name runtime-specific tools in the Work Order. A missing preferred capability is a routing condition, not an implementation failure.

If the available fallback cannot safely handle the task, return `blocked` with the missing capability instead of pretending delegation occurred.

## Model Routing

Route by role and uncertainty, not by expected lines of code:

| Profile               | Use                                                                    |
| --------------------- | ---------------------------------------------------------------------- |
| `planner-high`        | Ambiguous product or architecture decisions; normally the main Session |
| `executor-economical` | Clear, local, reversible implementation                                |
| `executor-deep`       | Bounded implementation with meaningful technical uncertainty           |
| `reviewer-high`       | Contract, security, data, concurrency, or broad behavioral review      |
| `reviewer-standard`   | Quick and ordinary Scoped diff review                                  |

Each dispatched child profile must resolve to two concrete values:

- **Model:** A host-supported model identifier or alias.
- **Reasoning:** A host-supported reasoning depth, effort, or variant value.

Resolve them in this order:

1. An explicit user choice in the current conversation for this child profile.
2. The matching profile in project-local `.agents/dev-harness.json`.
3. Ask the user before dispatch.

Do not use a global default, host default, previously unrelated project choice, or the main Session's model or reasoning depth as an implicit child setting. An abstract profile name such as `executor-deep` is routing intent, not a complete execution configuration.

When asking, first query the runtime for available child models and reasoning values when that capability exists. Ask for both missing values together, recommend options consistent with the profile, and state which child role will use them. If the host cannot enumerate reasoning values, ask for the host-specific reasoning/variant name rather than inventing one.

Treat the answer as current-run configuration only. Write or update `.agents/dev-harness.json` only when the user explicitly asks to persist the choice; config persistence is a project file edit and follows normal scope and review rules. A configured value that the host does not support is unresolved and must be asked again.

The project configuration shape is:

```json
{
  "version": 1,
  "profiles": {
    "executor-economical": {
      "model": "<host model id or alias>",
      "reasoning": "<host reasoning depth or variant>"
    },
    "executor-deep": {
      "model": "<host model id or alias>",
      "reasoning": "<host reasoning depth or variant>"
    },
    "reviewer-standard": {
      "model": "<host model id or alias>",
      "reasoning": "<host reasoning depth or variant>"
    },
    "reviewer-high": {
      "model": "<host model id or alias>",
      "reasoning": "<host reasoning depth or variant>"
    }
  }
}
```

Only profiles actually dispatched need configuration. Map the concrete values to the runtime's model and reasoning/variant parameters. Never expand scope merely to justify a stronger model.

## Dispatch Rules

- Give the Executor the full self-contained Work Order. Do not assume it inherits this skill, prior discussion, repository findings, or model configuration.
- Record the resolved model and reasoning depth in the Work Order before dispatch, and verify that the child was created with those exact settings.
- Ensure the Executor and Coordinator share the intended repository or worktree. State isolation expectations when the runtime creates separate worktrees.
- Use one Executor for overlapping files. Parallelize only independent Work Orders with disjoint ownership and validation.
- The Coordinator must not concurrently edit files owned by an active Executor.
- Require the Executor Result template. Retrieve messages or status without sending a second implementation prompt when the runtime distinguishes waiting from sending.
- A child recommendation is evidence, not authorization. Scope changes return to the Coordinator.

## State Handoff

Use stage-specific states without treating them as interchangeable:

```text
Work Order -> Executor completed|partial|blocked|cancelled
Executor result -> Reviewer accepted|changes-required|blocked|partial
Reviewer decision -> Coordinator accepted|blocked|partial|cancelled
```

Executor `completed` means the implementation stage claims its acceptance and checks are complete. It does not bypass review or equal harness `accepted`.

## Handoff Contract

The dispatch message contains:

1. The complete Work Order.
2. A statement that the Work Order is authoritative for scope.
3. A request to follow `execution.md` rules embedded or summarized in the order.
4. The required Executor Result format.
5. An instruction to stop and report rather than infer missing product decisions.

When a fix is approved, reserve one parent review-fix cycle before dispatch and create a new Work Order limited to named findings. The reserved cycle remains consumed if dispatch or implementation fails. A fix Work Order gets one corrective cycle and does not reset the parent run's review-fix count. Do not tell the Executor to generally improve, clean up, harden, or address anything else it notices.
