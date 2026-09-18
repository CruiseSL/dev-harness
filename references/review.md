# Review Protocol

## Purpose

Determine whether one bounded change is ready to accept without converting review into a repository audit or an open-ended improvement loop.

## Inputs

Choose exactly one input contract:

- **Local review, including small Track units:** The original compact checklist with outcome, acceptance, owned/read-only paths, worktree baseline, named shared-contract or broad-check triggers, and corrective/review-fix ledgers; the current-Session changed-file list and cumulative diff from that baseline; and the validation evidence ledger.
- **Delegated review:** The approved Work Order, Executor Result, cumulative diff from the Work Order baseline, and required validation evidence.

Both contracts also include existing repository rules directly applicable to the changed files. The selected checklist or Work Order remains the review authority for scope and acceptance.

After any fix, retain original acceptance and baseline; append the finding and latest evidence. Review the cumulative change, not just the fix diff.

If the diff cannot be isolated from unrelated work, stop and ask the Coordinator for a safe scope. Do not silently review or repair the entire worktree.

## Review Order

1. Confirm every changed file and behavior belongs to the approved checklist or Work Order scope.
2. Check each acceptance criterion against code and evidence.
3. Check direct regressions, realistic boundary behavior, security, authorization, privacy, data integrity, destructive failure, concurrency, and accessibility only where the changed path makes them relevant.
4. Check whether the implementation reused repository patterns and avoided unnecessary code, dependencies, abstractions, and compatibility behavior.
5. Evaluate the specified validation. Do not broaden it because additional tests exist.

For disputed technical choices or engineering feedback, use `references/technical-quality.md`; test concrete impact, preserve finding classes, and reuse established decisions.

Before expanding review, name the unmet acceptance or introduced regression, evidence gap, and delivery decision. Finish when none remains. Phase/final review reconciles existing evidence; it does not restart an audit. Rerun only missing or invalidated checks.

## Finding Classes

Every observation must use exactly one class. Apply this precedence and stop at the first match:

- `Blocking`: Acceptance fails; the diff directly introduces a regression; required validation fails; or there is a realistic security, authorization, privacy, data-loss, destructive, or contract defect on the changed path.
- `Scope-change`: A real product, architecture, contract, migration, or policy decision is required for later work but not for the current Work Order's acceptance. When current acceptance depends on it, classify it as Blocking instead.
- `Relevant`: A concrete in-scope improvement with evidence, but acceptance and safety do not require it.
- `Pre-existing`: The issue exists independently of the Work Order.
- `Out-of-scope`: The issue is real but belongs to another task or decision.
- `Theoretical`: The concern lacks a realistic supported trigger, evidence, or proportionate impact.

Only Blocking findings prevent current Work Order acceptance. Scope-change stops dependent work until the Coordinator resolves it but does not invalidate an already satisfied Work Order. Relevant findings do not become fixes automatically. Pre-existing, Theoretical, and Out-of-scope findings are recorded only when they materially help a future decision; otherwise omit them.

An independent issue known to exist before the Work Order is Pre-existing even when it is also outside scope. Use Out-of-scope for a real independent issue whose prior existence is not established. Use Theoretical only when a realistic supported trigger or evidence is missing.

Each Blocking or Relevant finding must include a concrete path, impact, evidence, and smallest suggested correction. Do not report style preferences as defects unless an applicable repository rule requires them.

## Fix Authorization

Review is read-only by default. The Coordinator decides which findings to fix. Use `reviewerAgent` for independent review, never developer settings. Review a complete deliverable and reuse its reviewer for finding verification.

- Approve Blocking findings by default when the correction stays inside the original Work Order.
- Ask the user or Coordinator before applying Relevant findings that alter behavior, scope, architecture, or cost.
- Never fix Scope-change, Pre-existing, Theoretical, or Out-of-scope findings in the current loop.
- Reserve the parent review-fix cycle when the Coordinator authorizes the fix, before dispatch. Failed or cancelled dispatch does not refund it.
- Keep a one-line or mechanical correction in the same authorized local or delegated fix cycle. Do not create a new parent Work Order, Track, or Reviewer Session. Send a same-ID amended Work Order with a fresh embedded envelope to the existing Executor; preserve ownership, validation and consumed budgets.
- Give each fix Work Order one corrective cycle. Creating a new Session or Work Order does not reset the total review-fix count.
- After a fix, rerun only the focused check that proves the finding and the smallest adjacent check triggered by its changed scope. Reuse matching validation-ledger evidence; do not rerun a broad bundle by habit.

The total loop budget includes all review-triggered fixes:

- Quick: one review-fix cycle.
- Scoped: two review-fix cycles.
- Track unit: two review-fix cycles.
- Track finalization unit: two review-fix cycles.

When the budget is exhausted, return unresolved evidence and a recommendation. Do not lower finding severity to claim success and do not continue autonomously.

Only the current user may approve a larger limit for one named finding or risk. Record the approval and new limit; the Coordinator cannot turn `2/2` into `3/3` or `4/4` on its own.

## Acceptance Decision

Return one decision:

- `accepted`: Acceptance and required validation pass, scope is clean, and no Blocking finding remains.
- `changes-required`: One or more Blocking findings remain and budget is available.
- `blocked`: A decision, capability, isolation problem, or exhausted budget prevents safe continuation.
- `partial`: Useful authorized work exists, but acceptance is incomplete and the Coordinator chooses to preserve it.

When no Blocking finding exists, say so explicitly and finish. Do not invent improvements to make the review appear substantive.
