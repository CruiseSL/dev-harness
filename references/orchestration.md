# Orchestration Protocol

## Purpose

Define Dev Harness coordination, implementation, and review roles while remaining portable across runtimes with different Session, Subagent, and model-selection capabilities.

## Roles

- **Coordinator:** Clarifies the outcome, classifies work, writes the Work Order, selects capabilities, reviews results, approves fixes, and owns the final answer.
- **Executor:** Implements one Work Order and returns evidence. It does not own requirements or process escalation.
- **Reviewer:** Compares the Work Order, diff, and validation evidence. It reports findings but does not edit without a new approved Work Order.

The Coordinator may also act as Reviewer. Prefer role separation over spawning another reviewer for Quick work.

## Capability Discovery

Before dispatch, inspect the runtime's available tools and choose the first supported path:

1. **Persistent Session with model selection:** Create or reuse a worker Session, select the requested execution profile, send the Work Order, and retrieve its terminal result.
2. **Subagent with model selection:** Spawn one bounded Executor with the requested profile and wait for its result.
3. **Session or Subagent without model selection:** Delegate with the available model. Reduce the Work Order to a safe size if model capability is uncertain.
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

Map these profiles to local model and reasoning settings when the runtime supports it. If it does not, preserve the role and scope constraints and use the available model. Never expand scope merely to justify a stronger model.

Map profiles to the host's available models and reasoning settings. Prefer the strongest suitable reasoning capability for planning and high-risk review, an economical capable model for clear local work, and a deeper implementation model for bounded technical uncertainty. Keep repository-specific model aliases in host configuration, not in this portable Skill.

## Dispatch Rules

- Give the Executor the full self-contained Work Order. Do not assume it inherits this skill, prior discussion, repository findings, or model configuration.
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
