# Track Runtime

Use this pack after the local ownership check or delegated configuration gate in `references/track-gate.md`. It owns the complete runtime lifecycle below under `references/architect/contracts.md`. The longer Implement document is explanatory reference, not an additional controller. Load review rules at review time.

## Enter Or Resume

Require ready core context, one uniquely selected approved Track, complete spec/plan/metadata/index, consistent registry state, and an ownership-checked worktree baseline that respects project workspace rules. Reject malformed plan grammar or unsafe paths; reopening a completed Track requires explicit confirmation.

Use the user's existing Manual or Auto choice. If neither is established, ask once before implementation: Manual pauses at phase verification; Auto continues through accepted units. Neither mode authorizes consequential operations. Retain the request start, checkpoints, validation evidence, and used unit budgets when resuming.

## Select And Dispatch

1. Complete an earlier unfinished phase gate whose implementation is ready before later work. Otherwise resume the active approved unit when one exists, then the next approved pending unit. Respect task/sub-task granularity; never count a parent and its actionable children twice. Do not invent, merge, or reactivate a unit outside its approved ownership, acceptance, validation, and rollback boundaries.
2. The Coordinator owns lifecycle bookkeeping, including unit state, plan markers, metadata, evidence ledgers, deadlines, provider status, and acceptance records. Do not dispatch a bookkeeping-only or waiting-only child.
3. For delegated work, after the gate passes, mark the Track in progress and selected unit active. Build one self-contained Work Order from `templates/work-order.md`. Bind the selected unit, owned and read-only paths, acceptance criteria, non-goals, validation, hard corrective and review-fix budgets, exact child configuration, passed gate evidence, and any requested consequential operation. Capture its verification envelope immediately before dispatch. Preserve the original request ledger.
4. For a small local unit, the Coordinator records acceptance, owned paths, baseline and focused checks in the existing plan and implements directly; no child Work Order or Executor Result is needed. For delegated work, use only the configured child, retain that Executor through implementation and in-scope fixes, and retrieve `templates/result.md`. Do not split configuration, tests or repairs into new children merely to follow process. Never edit an active Executor's files concurrently.

## Result And Review

Do not begin review before implementation evidence exists: a local cumulative diff and checks, or an Executor Result. Load `references/review.md` and inspect the cumulative unit diff against original acceptance. Review remains read-only until a Coordinator-approved finding enters the active review-fix cycle; an Executor Result is not Track acceptance. Use `reviewerAgent` only for independently valuable review; the Coordinator may review a small local change. On acceptance, mark every covered unit complete with evidence and `no-commit` or an explicitly authorized SHA. Rescan the phase; Auto continues, Manual pauses only at its phase gate.

## Phase And Final Completion

A phase gate is a Track unit with the shared two-cycle corrective and review-fix limits. Reconcile phase acceptance with existing evidence and execute only missing or invalidated checks through the configured Executor. Coordinator-only evidence reconciliation and bookkeeping do not require a child. Manual waits for the agreed human verification; Auto uses feasible CLI/browser/API/inspection substitutes and records limitations. Required safety checks cannot be waived; named non-safety limitations require explicit user acceptance. Finish the gate before advancing.

After all implementation units and phase gates pass, retain registry `[~]` and metadata `in_progress`. Synchronize routine factual documentation only within approved scope; significant stack, guideline, or scope changes need approval. Open the dedicated finalization unit with its own two corrective/two review-fix limits. Load `references/architect/review.md` for final spec, plan, context, and state reconciliation, reusing valid evidence. Delegate only substantive implementation or independently valuable validation; the Coordinator owns review decisions and lifecycle writes.

Mark registry `[x]`, metadata `completed`, and refresh `updated_at` only after documentation, required checks, and final review pass; validate their consistency. Any earlier blocker leaves the Track in progress. Do not add cleanup or another audit after acceptance.

Redispatch, a new Work Order, a new Session, or a later phase never resets a unit budget. On exhaustion, return `blocked` or `partial`. A commit, push, publication, deployment, external send, migration, cleanup, deletion, or other destructive operation requires exact current-conversation authorization; otherwise the Executor reports it to the Coordinator without performing it.
