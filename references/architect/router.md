# Architect Router

> Adapted from Architect Skills in `hlhr202/swe-skills` (Apache-2.0) and substantially modified for Dev Harness automatic routing and bounded execution.

## Purpose

Route durable work through the built-in Architect lifecycle without requiring separately installed `architect-*` skills or asking the user to choose an internal module.

## Single Controller

Dev Harness is the only implementation controller. Architect modules own durable artifacts and lifecycle transitions; Work Orders own one implementation unit. Never run an external Architect controller concurrently with this built-in lifecycle.

Legacy names such as `architect-setup`, `architect-discuss`, `architect-propose`, `architect-implement`, `architect-review`, and `architect-status` are accepted as intent aliases. They route to the internal modules below and are not dependencies.

## Intent Routing

Apply the first matching route:

| Intent or evidence                                             | Route                                                 |
| -------------------------------------------------------------- | ----------------------------------------------------- |
| Ask for status, progress, next task, or blockers               | `references/architect/status.md`                      |
| Ask to review a track, current diff, or revision range         | `references/architect/review.md`                      |
| Ask to initialize or repair missing core context               | `references/architect/setup.md`                       |
| Quick or Scoped implementation request                         | Standard Dev Harness path                             |
| Track request with incomplete core context                     | `references/architect/setup.md`                       |
| Track request with material unresolved direction               | `references/architect/discuss.md`                     |
| Track request with stable scope but no matching approved track | `references/architect/propose.md`                     |
| Implement, continue, or resume one valid approved track        | `references/architect/implement.md`                   |
| Malformed or conflicting durable artifacts                     | Stop with `blocked`; status may report but not repair |

Do not route ordinary local coding through Architect merely because `architect/` exists.

## Automatic Track Sequence

```text
Track candidate
  -> core ready? no -> setup
  -> material direction unresolved? yes -> discuss
  -> approved matching track exists? no -> propose
  -> implementation requested? yes -> implement
  -> final track review
  -> accepted | blocked | partial | cancelled
```

Transitions are automatic when the next stage is already authorized and has no unmet approval. A transition does not inherit permissions that belong to the next stage.

- Setup approval does not approve a proposal.
- Discussion synthesis does not approve `spec.md` or `plan.md`.
- Spec approval does not approve the plan.
- Plan approval authorizes track artifact creation, not implementation.
- Implementation authorization does not authorize commits, cleanup, archive, or deletion.
- Review authorization does not authorize fixes.

## Discuss Gate

Discuss is Dev Harness' self-contained requirements-discussion protocol for Track candidates. It does not require a separately installed brainstorming skill and does not create a second conversation when an earlier brainstorming synthesis is available.

Before entering Discuss, inspect the current conversation for an earlier requirements or brainstorming synthesis. Treat confirmed decisions as evidence, identify only remaining material gaps, and skip Discuss entirely when that evidence establishes the Track direction.

Do not route a standalone request to brainstorm, ideate, or explore into Architect unless it also establishes a Track candidate and asks for planning or implementation. Standalone exploration creates no Track artifacts and stays outside the Architect lifecycle.

Enter Discuss only when an unresolved answer can materially change one of these:

- Product scope, target user, required behavior, or success criteria.
- Architecture or system boundaries.
- Security, privacy, compliance, or audit posture.
- Data ownership, consistency, migration, or rollout.
- Public contracts, operational cost, or proposal decomposition.

Skip Discuss when the request and repository evidence already establish these decisions. A complex implementation is not automatically ambiguous.

## Core And Track Detection

Use `references/architect/contracts.md` for the canonical core-readiness, registry, metadata, plan, and path rules.

- Missing or incomplete core artifacts route to Setup for Track work.
- Missing management artifacts are recoverable only by Propose after spec and plan approval.
- A valid unique matching track routes to Implement when implementation is requested.
- A completed track requires explicit reopening confirmation.
- Duplicate, unsafe, or malformed entries block mutation; do not guess a repair.

## Continuation

Preserve the originating user intent across stages:

- `design` or `discuss`: stop after the approved synthesis unless the user also requested planning or implementation.
- `plan` or `propose`: stop after registered track creation unless implementation was also requested.
- `implement`, `build`, `continue`, or `complete`: after each required approval, continue automatically into the next eligible stage.
- `review` or `status`: remain read-only unless the user separately authorizes a later mutation.

Do not ask `Which Architect skill should I use?` or expose controller selection. Ask only the material decision or approval required by the active module.

## Track Unit Execution

Implement treats one plan task, one actionable sub-task, or one phase gate as a Track unit.

1. The Coordinator passes the Track Delegation Gate in `references/orchestration.md` before any unit state or file edit.
2. Architect lifecycle selects and marks the unit.
3. The Coordinator creates a Work Order mapped to that unit with resolved child configuration.
4. An Executor, never the Coordinator current Session, performs the bounded change under `references/execution.md`.
5. The Reviewer applies `references/review.md` to the cumulative unit diff.
6. Architect lifecycle records acceptance and selects the next unit.

Auto Mode continues across accepted units. Manual Mode pauses only at configured phase gates. A failed unit does not reset its corrective or review-fix budget by being redispatched.

## Stop Conditions

Stop and report the exact module, state, evidence, and next required decision when:

- A material user-owned decision remains unresolved.
- A required approval is absent or rejected.
- Durable artifacts are malformed, duplicated, incomplete, or unsafe.
- Worktree ownership cannot be isolated.
- Validation or review exhausts its budget.
- The next action is destructive, external, credential-dependent, or otherwise requires separate authorization.
