# Default Architect Delivery Policy

> Adapted from the default Architect process in `hlhr202/swe-skills` (Apache-2.0); modified for bounded Dev Harness Work Orders and repository-defined quality targets.

## Outcome

Complete approved Tracks through traceable plan states, bounded implementation units, phase verification, project-context synchronization, and final review.

## Principles

- `plan.md` is the durable source of implementation scope and progress.
- Each status-managed unit should fit one independently reviewable Work Order.
- Use tests before implementation when they clarify behavior or reduce regression risk; do not force ceremonial TDD where no suitable test boundary exists.
- Follow repository-defined coverage requirements. Without one, cover changed behavior proportionately rather than inventing a numeric threshold.
- Prefer non-interactive, CI-safe validation.
- Significant stack, public-contract, data, security, or rollout decisions require approval before implementation.

## Unit Delivery

1. Resume active work before selecting pending work.
2. Mark the selected unit active before implementation edits.
3. Create and execute one bounded Work Order.
4. Run focused validation and cumulative unit review.
5. Apply only authorized fixes within budget.
6. Mark the unit complete with a summary and `no-commit` or an explicitly authorized SHA.
7. Verify the phase before later-phase work.

## Modes

- Manual pauses for phase-level human verification.
- Auto performs or substitutes phase verification and continues across accepted units.
- Neither mode authorizes commits, cleanup, deployment, migration, external sends, or destructive actions.

## Phase Verification

Verify phase acceptance, tests, relevant coverage, manual behavior, and named residual limitations. Use the closest safe substitute when direct verification is unavailable. Stop when required safety or contract behavior cannot be verified within budget.

## Commits

Commit only after an explicit request in the current conversation. Stage inspected Track-owned files or hunks only, verify the staged diff, and preserve unrelated changes.
