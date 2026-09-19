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
| Implement, continue, or resume one valid approved track        | `references/architect/track-runtime.md`               |
| Malformed or conflicting durable artifacts                     | Stop with `blocked`; status may report but not repair |

Do not route ordinary local coding through Architect merely because `architect/` exists.

## Automatic Track Sequence

```text
Track candidate
  -> core ready? no -> setup
  -> material direction unresolved? yes -> discuss
  -> approved matching track exists? no -> propose
  -> implementation requested? yes -> track runtime
  -> final track review
  -> accepted | blocked | partial | cancelled
```

Transitions are automatic when the next stage is already authorized and has no unmet approval. A transition does not inherit permissions that belong to the next stage.

- Setup approval does not approve a proposal.
- Discussion synthesis does not approve `spec.md` or `plan.md`.
- When approval is needed, one concrete spec/plan packet covers both artifacts.
- A planning-only packet authorizes track artifact creation, not implementation.
- Implementation authorization covers routine in-scope records and implementation; it does not authorize commits, cleanup, archive, or deletion.
- Review remains strictly read-only; approved fixes belong to the existing developer or Coordinator-local owner.

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
- Missing management artifacts are recoverable by Propose after the required packet approval or clear implementation authorization.
- A valid unique matching track routes to the Track runtime when implementation is requested.
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

The compact runtime path treats one plan task, one actionable sub-task, or one phase gate as a Track unit. The long-form `references/architect/implement.md` remains canonical audit and reference material; it is not a Track runtime dependency.

1. The Coordinator selects a coherent local or delegated delivery batch through `references/track-gate.md`, checking ownership first and the Track Delegation Gate only for delegation.
2. Architect lifecycle selects and marks the unit.
3. The Coordinator uses the existing plan/checklist locally, or creates a Work Order for a complete delegated delivery batch with explicit role settings. Adjacent approved units may share the batch when acceptance remains within scope, one owner has no active collision, and authorization, rollout, and rollback boundaries are compatible.
4. The Coordinator or assigned Executor performs the bounded change through `references/architect/track-runtime.md`; keep one owner through implementation and fixes.
5. After local implementation evidence or an Executor Result, the Coordinator or independent Reviewer applies `references/review.md` to the cumulative unit diff.
6. Architect lifecycle records acceptance and selects the next unit.

Auto Mode is the default for clearly authorized implementation and continues across accepted batches. Manual Mode pauses only at configured phase gates when chosen or mandated. Repair counts are diagnostic; an explicit current-user hard limit carries across redispatch and a failed batch does not justify blind retry with another worker.

## Stop Conditions

Stop and report the exact module, state, evidence, and next required decision when:

- A material user-owned decision remains unresolved.
- A required approval is absent or rejected.
- Durable artifacts are malformed, duplicated, incomplete, or unsafe.
- Worktree ownership cannot be isolated.
- Validation or review reaches an explicit user hard limit or repeated same-cause failure has no safe replan.
- The next action is destructive, external, credential-dependent, or otherwise requires separate authorization.
