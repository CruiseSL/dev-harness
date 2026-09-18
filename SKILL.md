---
name: dev-harness
description: Run a bounded software delivery harness with automatic Quick, Scoped, and built-in Architect Track routing. Use for implementation, project-aware planning, review, status, durable project context, delegated execution, validation, and scope control. Its internal Discuss protocol resolves material Track decisions; it is not a general brainstorming dependency.
license: Apache-2.0
metadata:
  version: "2.6.0"
---

# Dev Harness

Deliver approved outcomes with proportionate process, explicit ownership and bounded validation.

## Hard Boundaries

- The main session is the Coordinator and owns requirements, scope, acceptance, routing, review decisions, and completion.
- The Executor owns a complete deliverable through implementation, validation and in-scope repair, using a self-contained Work Order. It must not redesign the request or silently widen scope.
- Prefer no change, reuse, standard or native facilities, installed dependencies, and then the smallest new implementation that satisfies the Work Order.
- Do not remove validation, security, data-integrity handling, accessibility, or required error handling to reduce code.
- Validation is bounded by the Work Order. A discovered edge case does not authorize broader investigation or implementation.
- Review does not authorize edits. Only Coordinator-approved findings may enter a fix cycle.
- Architect is built in as an internal lifecycle. Do not require or invoke separately installed `architect-*` skills.
- Respect user, repository, host, safety, approval, and commit rules. This skill grants no additional permission.
- Quick permits one corrective re-edit and one review-fix cycle; Scoped and each Track unit permit two. Exhaustion is `blocked` or `partial`. Only the current user may approve a named increase; no Session, child, Work Order, phase, or repeated check resets a budget.

## Run

1. Route explicit intent before classification: project Status reads `references/architect/status.md` plus required contracts; current-diff or Track Review reads `references/architect/review.md`; explicit Architect lifecycle requests or work on an identified Track read `references/architect/router.md`. Ordinary verbs such as implement, fix, add, or continue do not establish Track intent: use `references/classification.md`. Keep Status and Review read-only.
2. Quick runs in the Coordinator current Session by default with a compact in-memory checklist: outcome, acceptance, owned/read-only paths, worktree baseline, focused check, named shared-contract or broad-check triggers, and `0/1` corrective plus review-fix ledgers. Do not create a child or full Work Order. Dispatch only when the user explicitly requests isolation or one concrete recorded safety or independence reason requires it.
3. Scoped runs as one bounded Coordinator execution pass by default. Dispatch only for a cross-trust boundary, independent worktree, significant technical uncertainty, or explicit user request; crossing two files or modules is not enough. A current-Session pass uses the same compact checklist with `0/2` ledgers and records any adjacent check required by the changed contract.
4. Track uses `references/architect/router.md`, the Track Delegation Gate pack at `references/track-gate.md`, and `references/architect/track-runtime.md` after the local ownership check or delegation gate. The Coordinator may execute a small bounded Track unit locally after checking ownership; substantial independent deliverables may go to a persistent Executor. Adjacent compatible plan units may share one bounded Work Order. A small canary, configuration correction, mechanical fix, or bookkeeping step inside an existing Track does not create a new Track.
5. Only when dispatch is selected, read `references/orchestration.md`, build `templates/work-order.md`, apply `references/execution.md`, and retrieve `templates/result.md`. For Track, the post-gate runtime pack supplies the bounded dispatch protocol; load review rules only after implementation evidence is available. Never expose internal profile names or silently inherit the main Session settings.
6. Record validation evidence by command, scope/input fingerprint, relevant-file fingerprint, result, and time. Reuse a passed entry when both fingerprints match. Initial work runs the focused behavior check; broader checks require a named phase/final/shared-contract trigger.
7. Load `references/review.md` only when review begins. Quick receives at most one local Coordinator review; a Reviewer child requires the same concrete independence justification as any other child.
8. Keep a one-line or mechanical correction inside the active authorized fix cycle. Do not create a new parent Work Order, Track, or Reviewer Session. Rerun only the finding's focused check and the smallest check triggered by changed scope.
9. Track lifecycle bookkeeping, external polling, deadlines, and provider status remain Coordinator work. They never create bookkeeping-only or waiting-only child Work Orders.
10. Report terminal state, durable Track state when applicable, changed scope, validation executions and reuses, exhausted budgets, unresolved findings, and the next required decision.

## Role Configuration

Resolve `coordinator`, `childAgent` and `reviewerAgent` independently via `references/orchestration.md`. The Codex example is `templates/codex-project-config.json`; preferences do not switch an active session.

## Delivery Convergence

For a material technical choice or disputed engineering feedback, load `references/technical-quality.md`. Own the recommendation; explain its business consequences.

Finish when acceptance, required checks, and review pass. For repeated checks, review scope expansion, or work reaching 15 minutes (Quick), 45 minutes (Scoped), or a Track phase checkpoint, load `references/delivery.md`. Reuse the current checklist and evidence; short tasks need no extra ledger or timing report. Checkpoints do not reset fix limits or create failure deadlines.

## Reference Routing

| Need                                         | Read                                 |
| -------------------------------------------- | ------------------------------------ |
| Choose Quick, Scoped, or Track               | `references/classification.md`       |
| Route built-in Architect lifecycle           | `references/architect/router.md`     |
| Check Track child configuration before mutation | `references/track-gate.md`        |
| Dispatch a passed Track unit                 | `references/architect/track-runtime.md` |
| Validate Architect artifacts and approvals   | `references/architect/contracts.md`  |
| Delegate and select an execution profile     | `references/orchestration.md`        |
| Implement and validate within bounds         | `references/execution.md`            |
| Review, classify findings, and control fixes | `references/review.md`               |
| Maintain the Skill                           | `references/validation-scenarios.md` |
| Resolve delivery checkpoints and stopping   | `references/delivery.md`             |

## Terminal States

- `accepted`: Acceptance criteria pass, required validation passes, scope is clean, and no Blocking finding remains.
- `blocked`: A material decision, missing capability, unsafe action, or persistent required-check failure needs the Coordinator or user.
- `partial`: Authorized work is useful but one or more acceptance criteria remain unmet; do not describe it as complete.
- `cancelled`: The user stops the run or rejects the required scope or approval.

Executor `completed` and Reviewer `changes-required` are stage states, not harness terminal states. Only the Coordinator returns a harness terminal state after review.

Stop immediately when the next action would exceed the Work Order, consume another fix cycle beyond budget, modify unrelated user work, require an unapproved destructive or external action, or turn a new independent issue into part of the current request.

Load `references/validation-scenarios.md` only for skill maintenance.
