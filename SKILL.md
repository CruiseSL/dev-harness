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
- Prefer reuse, native facilities, installed dependencies, then the smallest new implementation. Preserve validation, security, data integrity, accessibility, and required error handling.
- Validation is bounded by the Work Order; a discovered edge case does not authorize broader investigation.
- Review does not authorize edits. Only Coordinator-approved findings may enter a fix cycle.
- Architect is built in as an internal lifecycle. Do not require or invoke separately installed `architect-*` skills.
- Respect user, repository, host, safety, approval, and commit rules. This skill grants no additional permission.
- Repair counts are soft diagnostic checkpoints, not automatic stop conditions. After one Quick or two Scoped/Track repair cycles, reassess cause, evidence, and method; continue already-authorized work when meaningful progress or new evidence exists. Only an explicit current-user hard limit is a hard stop, and it carries across Sessions, Work Orders, phases, and workers. Legacy framework defaults are not user-set limits.

## Run

1. Route explicit intent before classification: project Status reads `references/architect/status.md` plus required contracts; current-diff or Track Review reads `references/architect/review.md`; explicit Architect lifecycle requests or work on an identified Track read `references/architect/router.md`. Ordinary verbs such as implement, fix, add, or continue do not establish Track intent: use `references/classification.md`. Keep Status and Review read-only.
2. Quick runs in the Coordinator current Session by default with a compact in-memory checklist: outcome, acceptance, owned/read-only paths, worktree baseline, focused check, named shared-contract or broad-check triggers, and repair/review diagnostic counts. Do not create a child or full Work Order. Dispatch only when the user explicitly requests isolation or one concrete recorded safety or independence reason requires it.
3. Scoped runs as one bounded Coordinator execution pass by default. Dispatch only for a cross-trust boundary, independent worktree, significant technical uncertainty, or explicit user request; crossing two files or modules is not enough. A current-Session pass uses the same compact checklist with repair diagnostic counts and records any adjacent check required by the changed contract.
4. Track uses `references/architect/router.md`, the Track Delegation Gate pack at `references/track-gate.md`, and `references/architect/track-runtime.md` after the local ownership check or delegation gate. Astra coordinates a coherent delivery batch; Luna or the Coordinator-local owner carries the complete outcome through configuration/runtime, tests, documentation, and in-scope repairs. Adjacent approved units may share one Work Order when their acceptance union remains within scope, one owner has no active collision, and authorization, rollout, and rollback boundaries are compatible. A small canary, configuration correction, mechanical fix, or bookkeeping step inside an existing Track does not create a new Track.
5. Only when dispatch is selected, read `references/orchestration.md`, build `templates/work-order.md`, apply `references/execution.md`, and retrieve `templates/result.md`. For Track, the post-gate runtime pack supplies the bounded dispatch protocol; load review rules only after implementation evidence is available. Never expose internal profile names or silently inherit the main Session settings.
6. Record validation evidence by command, scope/input fingerprint, relevant-file fingerprint, result, and time. Reuse a passed entry when both fingerprints match. Initial work runs the focused behavior check; broader checks require a named phase/final/shared-contract trigger.
7. Load `references/review.md` only when review begins. Quick receives at most one local Coordinator review; a Reviewer child requires the same concrete independence justification as any other child.
8. Keep a one-line or mechanical correction inside the active authorized repair. Do not create a new parent Work Order, Track, or Reviewer Session merely because a diagnostic checkpoint was reached. Rerun only the finding's focused check and the smallest check triggered by changed scope.
9. Track lifecycle bookkeeping, external polling, deadlines, and provider status remain Coordinator work. They never create bookkeeping-only or waiting-only child Work Orders.
10. Report terminal state, durable Track state when applicable, changed scope, validation executions and reuses, repair diagnostic counts, explicit hard-limit status, unresolved findings, and the next required decision.

## Role Configuration

Resolve `coordinator`, `childAgent` and `reviewerAgent` independently via `references/orchestration.md`; `templates/codex-project-config.json` is an example and does not switch an active session.

## Delivery Convergence

For a material technical choice or disputed engineering feedback, load `references/technical-quality.md` and own the business recommendation. Finish when requested-tier evidence, acceptance, checks, and review pass; load `references/delivery.md` for repeated checks, review expansion, or the 15-minute Quick, 45-minute Scoped, or Track phase checkpoint. Checkpoints are diagnostic and do not reset an explicit user hard limit.

## Reference Routing

Use `references/classification.md` for level, `references/architect/router.md` for lifecycle, `references/track-gate.md` and `references/architect/track-runtime.md` for Track execution, `references/architect/contracts.md` for artifacts/approvals, `references/orchestration.md` for delegation, `references/execution.md` for implementation, `references/review.md` for findings, `references/validation-scenarios.md` for maintenance, and `references/delivery.md` for checkpoints.

## Terminal States

- `accepted`: requested-tier evidence, acceptance, validation, and review pass with no Blocking finding.
- `blocked`: a material decision, missing capability, unsafe action, repeated failure, or explicit hard limit needs resolution.
- `partial`: authorized work is useful but acceptance or requested-tier evidence remains unmet.
- `cancelled`: the user stops or rejects the scope/approval.

Executor `completed` and Reviewer `changes-required` are stage states; only the Coordinator returns the harness terminal state after review.

Stop immediately when the next action would exceed the Work Order, hit an explicit user hard limit, modify unrelated user work, require an unapproved destructive or external action, or turn a new independent issue into part of the current request. Repeated same-cause failure with unchanged evidence requires a replan rather than a blind retry through another worker.

Load `references/validation-scenarios.md` only for skill maintenance.
