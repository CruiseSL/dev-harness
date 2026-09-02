---
name: dev-harness
description: Run a bounded software delivery harness with automatic Quick, Scoped, and built-in Architect Track routing. Use for implementation, project-aware planning, review, status, durable project context, delegated execution, validation, and scope control. Its internal Discuss protocol resolves material Track decisions; it is not a general brainstorming dependency.
license: Apache-2.0
metadata:
  version: "2.5.0"
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
- Architect is built in as an internal lifecycle. Do not require or invoke separately installed `architect-*` skills.
- Respect user, repository, host, safety, approval, and commit rules. This skill grants no additional permission.

## Run

1. Read `references/classification.md`, inspect only enough repository context to understand the request, and classify it as Quick, Scoped, or Track.
2. For explicit Architect status, review, setup, Track requirements discussion, propose, or implement intent, or for any Track classification, read `references/architect/router.md`. Route automatically; never ask the user to choose an internal module or controller.
3. For Quick or Scoped implementation, build one self-contained Work Order from `templates/work-order.md`.
4. For Track implementation, let the built-in Architect lifecycle select one approved plan unit. Before marking the first unit for that Track in the current Session active or editing a Track or implementation file, apply the Track Delegation Gate in `references/orchestration.md`: require a valid project-local child configuration plus a compatible direct or named-Agent dispatch route, or ask for one and pause. An unresolved Track child configuration is `blocked`; it never authorizes current-Session implementation.
5. Read `references/orchestration.md` and detect available delegation and model-selection capabilities. Quick and Scoped work may use the documented current-Session fallback. Every Track unit uses an explicitly configured child Executor, either through per-dispatch model parameters or a named host Agent with matching pinned settings; never expose internal profile names or silently inherit the main Session settings.
6. Give the Executor the complete Work Order, resolved child execution settings, and the relevant rules from `references/execution.md`. Do not rely on child context inheriting this skill or model configuration.
7. Retrieve an Executor Result matching `templates/result.md`. A dispatch is not completion; wait for or retrieve its terminal result when the runtime permits.
8. Read `references/review.md` and review the cumulative diff against the original Work Order. Track units also load `references/architect/review.md` and durable acceptance context.
9. Approve only Blocking fixes by default. Relevant improvements require a Coordinator or user decision. Send approved findings through a new bounded fix Work Order.
10. Stop after one review-fix cycle for Quick work or two for Scoped and Track units. A new Session, unit dispatch, or internal module does not reset an exhausted budget.
11. For an accepted Track unit, return control to `references/architect/implement.md` to record state, verify phases, and select the next unit when Auto Mode permits.
12. Report terminal state, durable Track state when applicable, changed scope, verification, unresolved findings, and the next required decision.

## Reference Routing

| Need                                         | Read                                 |
| -------------------------------------------- | ------------------------------------ |
| Choose Quick, Scoped, or Track               | `references/classification.md`       |
| Route built-in Architect lifecycle           | `references/architect/router.md`     |
| Validate Architect artifacts and approvals   | `references/architect/contracts.md`  |
| Delegate and select an execution profile     | `references/orchestration.md`        |
| Implement and validate within bounds         | `references/execution.md`            |
| Review, classify findings, and control fixes | `references/review.md`               |
| Maintain the Skill                           | `references/validation-scenarios.md` |

## Terminal States

- `accepted`: Acceptance criteria pass, required validation passes, scope is clean, and no Blocking finding remains.
- `blocked`: A material decision, missing capability, unsafe action, or persistent required-check failure needs the Coordinator or user.
- `partial`: Authorized work is useful but one or more acceptance criteria remain unmet; do not describe it as complete.
- `cancelled`: The user stops the run or rejects the required scope or approval.

Executor `completed` and Reviewer `changes-required` are stage states, not harness terminal states. Only the Coordinator returns a harness terminal state after review.

Stop immediately when the next action would exceed the Work Order, consume another fix cycle beyond budget, modify unrelated user work, require an unapproved destructive or external action, or turn a new independent issue into part of the current request.

Use `references/validation-scenarios.md` only when maintaining or auditing this skill; it is not required for normal execution.
