---
name: dev-harness
description: Run a bounded main-session and worker-session software development workflow. Use when implementing a coding change that needs task sizing, delegated execution, model routing, scope control, review, or Architect escalation.
license: MIT
---

# Dev Harness

Coordinate software changes without turning small requests into heavyweight projects. Use the lowest process level that safely fits, delegate through the runtime's available capabilities, and stop before investigation or repair expands beyond the approved outcome.

## Hard Boundaries

- The main session is the Coordinator and owns requirements, scope, acceptance, routing, review decisions, and completion.
- The Executor implements only a self-contained Work Order. It must not redesign the request or silently widen scope.
- Prefer no change, reuse, standard or native facilities, installed dependencies, and then the smallest new implementation that satisfies the Work Order.
- Do not remove validation, security, data-integrity handling, accessibility, or required error handling to reduce code.
- Validation is bounded by the Work Order. A discovered edge case does not authorize broader investigation or implementation.
- Review does not authorize edits. Only Coordinator-approved findings may enter a fix cycle.
- Respect user, repository, host, safety, approval, and commit rules. This skill grants no additional permission.

## Run

1. Read `references/classification.md` and inspect only enough repository context to understand the requested change.
2. Classify the work as Quick, Scoped, or Track. Default to the lowest adequate level and announce the classification in one sentence.
3. For Track work, read `references/architect-integration.md` and select exactly one implementation controller before creating any Work Order. Architect artifacts remain authoritative for durable scope and lifecycle state.
4. If Architect controlled, hand off the full Track to `architect-implement`, use its continuation and budgets, skip the remaining Dev Harness execution steps, and report its outcome without claiming per-slice control.
5. For Quick, Scoped, or Dev Harness controlled Track work, build a self-contained Work Order from `templates/work-order.md`. Keep Quick orders compact, but do not omit scope, acceptance, validation, or stop conditions.
6. Read `references/orchestration.md`, detect available delegation and model-selection capabilities, and choose the best supported execution path.
7. Give the Executor the complete Work Order and the rules in `references/execution.md`. Do not rely on the child context inheriting this skill.
8. Retrieve an Executor Result matching `templates/result.md`. A dispatch is not completion; wait for or explicitly retrieve its terminal result when the runtime permits.
9. Read `references/review.md` and review the result and diff against the Work Order. Do not run a repository-wide audit unless that was explicitly ordered.
10. Approve only Blocking fixes by default. Relevant improvements require a Coordinator or user decision. Send approved findings as a new bounded Work Order, then review the cumulative diff against the original acceptance criteria.
11. Stop after one review-fix cycle for Quick work or two for Scoped work and Dev Harness controlled Track slices. Escalate unresolved issues instead of continuing autonomously.
12. Report acceptance status, changed scope, verification performed, unresolved findings, and the next decision if blocked.

## Reference Routing

| Need                                         | Read                                  |
| -------------------------------------------- | ------------------------------------- |
| Choose Quick, Scoped, or Track               | `references/classification.md`        |
| Delegate and select an execution profile     | `references/orchestration.md`         |
| Implement and validate within bounds         | `references/execution.md`             |
| Review, classify findings, and control fixes | `references/review.md`                |
| Use durable Architect context and tracks     | `references/architect-integration.md` |

## Terminal States

- `accepted`: Acceptance criteria pass, required validation passes, scope is clean, and no Blocking finding remains.
- `blocked`: A material decision, missing capability, unsafe action, or persistent required-check failure needs the Coordinator or user.
- `partial`: Authorized work is useful but one or more acceptance criteria remain unmet; do not describe it as complete.
- `cancelled`: The user stops the workflow or rejects the required scope or approval.

Executor `completed` and Reviewer `changes-required` are stage states, not workflow terminal states. Only the Coordinator returns a workflow terminal state after review.

Stop immediately when the next action would exceed the Work Order, consume another fix cycle beyond budget, modify unrelated user work, require an unapproved destructive or external action, or turn a new independent issue into part of the current request.

Use `references/validation-scenarios.md` only when maintaining or auditing this skill; it is not required for normal execution.
