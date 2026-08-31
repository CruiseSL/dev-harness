# Validation Scenarios

## Purpose

Use these minimal scenarios as a maintenance check for classification, stage states, stop conditions, and budget accounting. Do not load them during ordinary implementation.

## Shared Budget Semantics

- Initial implementation and first validation are attempt zero.
- A corrective cycle is consumed only by a re-edit after required validation fails.
- A parent review-fix cycle is reserved when the Coordinator authorizes a fix, before dispatch.
- Every review fix Work Order has one corrective cycle and never resets the parent count.
- Post-fix review uses the cumulative diff and original acceptance criteria.

## Quick: Retry Button Label

**Task:** Change one local Retry button's visible text and accessible name from `Retry now` to `Retry sync`. Own only the component and focused test. Do not change behavior or refactor.

**Validation:** Run the focused component test. Initial corrective budget `0/1`; parent review-fix `0/1`.

**Simulation:**

1. Initial execution changes visible text and passes the focused test: Executor `completed`, corrective `0/1`, parent `0/1`.
2. Review finds the explicit `aria-label` still says `Retry now`: Blocking, `changes-required`.
3. Coordinator authorizes one fix: reserve parent `1/1`; fix Work Order starts corrective `0/1`.
4. Fix changes only the accessible name and passes: corrective remains `0/1`.
5. Final review sees a pre-existing tooltip not covered by acceptance: classify Pre-existing and omit unless materially useful.
6. Terminal harness state: `accepted`. No further fix may be authorized because parent budget is `1/1`.

## Scoped: CLI Dry Run

**Task:** Add `--dry-run` across a CLI parser and service. With the flag, perform no external send, send-ledger write, or retry-queue mutation and print a summary. Without it, preserve behavior. Own the parser, service, and focused tests.

**Validation:** Run focused parser and service tests plus typecheck. Initial corrective budget `0/2`; parent review-fix `0/2`.

**Simulation:**

1. Initial result passes required checks: Executor `completed`, corrective `0/2`, parent `0/2`.
2. Review finds a ledger write: Blocking. Authorize fix 1 and reserve parent `1/2`; fix passes with corrective `0/1`.
3. Cumulative review finds retry-queue mutation: Blocking. Authorize fix 2 and reserve parent `2/2`; fix passes with corrective `0/1`.
4. Final review notes missing dry-run metrics, which are outside scope and acceptance: Out-of-scope, not a fix.
5. Terminal harness state: `accepted` at `2/2`.
6. If final review instead finds another Blocking defect, terminal state is `blocked`; a third fix Work Order is not authorized.

## Track: Non-Null Recipient Migration Preflight

**Task:** Under an approved Architect track to make persisted `recipient_id` non-null, run slice 1 as a read-only diagnostic that reports null rows. Migration, backfill, deletion, rejection policy, and schema changes are out of scope for this slice.

**Validation:** Run the focused diagnostic check. Initial corrective budget `0/2`; parent review-fix `0/2`. Use Dev Harness controlled implementation for this simulation.

**Simulation:**

1. Track and slice are `in_progress`; the Executor reports real null rows without mutation.
2. Because slice acceptance is detection and reporting, Executor is `completed` and review is `accepted`; both budgets remain `0/2`.
3. Backfill versus rejection is a scope-changing product/data decision for a later slice.
4. Stop before dispatching that slice. The Track remains `in_progress`; the current run is `blocked` pending the decision.
5. Completing the diagnostic Work Order does not complete the Track and consumes no review-fix cycle.
6. If Architect controlled implementation was selected instead, use Architect continuation and budgets; do not claim this per-slice sequence.
