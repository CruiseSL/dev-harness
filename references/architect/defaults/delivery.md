# Default Architect Delivery Policy

> Adapted from the default Architect process in `hlhr202/swe-skills` (Apache-2.0); modified for bounded Dev Harness Work Orders and repository-defined quality targets.

## Outcome

Complete approved Tracks through traceable plan states, bounded implementation units, phase verification, project-context synchronization, and final review.

## Principles

- `plan.md` is the durable source of implementation scope and progress.
- Each status-managed outcome should fit one independently reviewable coherent Work Order. Adjacent units may share a batch when acceptance remains within scope and ownership, authorization, rollout, and rollback boundaries are compatible.
- Use tests before implementation when they clarify behavior or reduce regression risk; do not force ceremonial TDD where no suitable test boundary exists.
- Follow repository-defined coverage requirements. Without one, cover changed behavior proportionately rather than inventing a numeric threshold.
- Prefer non-interactive, CI-safe validation.
- Significant stack, public-contract, data, security, or rollout decisions require approval before implementation.

## Unit Delivery

1. Resume active work before selecting pending work.
2. Mark the selected unit active before implementation edits.
3. Create and execute one bounded Work Order.
4. Run focused validation and cumulative unit review.
5. Apply only authorized fixes within the active repair ledger and any explicit user hard limit.
6. Mark the unit complete with a summary and `no-commit` or an explicitly authorized SHA.
7. Verify the phase before later-phase work.

## Modes

- Manual pauses for phase-level human verification.
- Auto performs or substitutes phase verification and continues across accepted batches; Auto is the default for clearly authorized implementation unless Manual or a mandated pause applies.
- Neither mode authorizes commits, cleanup, deployment, migration, external sends, or destructive actions.

## Phase Verification

Verify phase acceptance, tests, relevant coverage, manual behavior, and named residual limitations. Production and migration specs name the requested completion tier, target environment, and minimum normal path; validate a thin target-runtime path early when authorized. Use the closest safe substitute when direct verification is unavailable. Missing authorized live evidence makes only dependent completion partial or blocked. Stop or replan on repeated same-cause failure with unchanged evidence or an explicit user hard limit.

## Commits

Commit only after an explicit current-user request or standing user/repository authorization. Stage inspected Track-owned files or hunks only, verify the staged diff, and preserve unrelated changes; report exact preserved dirty attribution, reason, and next owner when a scoped commit cannot close it.
