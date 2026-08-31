# Architect Implement Module

> Adapted from Architect Implement in `hlhr202/swe-skills` (Apache-2.0); modified to use Dev Harness Work Orders, one controller, shared budgets, and explicit commit authorization.

## Purpose

Implement or resume one approved Track by selecting one plan unit at a time, delegating it through Dev Harness, maintaining durable state, verifying every phase, synchronizing context, and completing final review.

Read `references/architect/contracts.md`, `references/architect/router.md`, `references/execution.md`, and `references/review.md` before implementation.

## Preconditions

- Core context and Track management satisfy `references/architect/contracts.md`.
- One valid Track is selected by exact ID, unique exact description, or sole active Track.
- `spec.md`, `plan.md`, `metadata.json`, and Track `index.md` are complete and consistent.
- Completed Tracks require explicit reopening confirmation.
- The worktree baseline is captured and existing changes are classified as related, unrelated, or ambiguous.

Ask once when a fuzzy match, multiple candidate Tracks, or overlapping ambiguous hunk prevents unique selection. Never infer an unsafe Track or mixed commit boundary.

## Implementation Mode

- **Manual:** pause at phase verification for human confirmation. Commits still require explicit authorization.
- **Auto:** perform or safely substitute phase verification and continue through accepted units without phase-level confirmation. Commits still require explicit authorization.

Use an explicitly requested mode. Otherwise ask once because the pause behavior is user-visible. Mode selection authorizes implementation continuation only.

## State Model

```text
selected
  -> mode_selected
  -> track_in_progress
  -> unit_loop
  -> phase_verified (repeat)
  -> units_complete
  -> docs_synchronized
  -> finalization_review
  -> track_completed
  -> accepted | blocked | partial | cancelled
```

Registry, metadata, parent tasks, sub-tasks, and phase gates follow `references/architect/contracts.md`. Resume active units before pending units. Never begin a later phase while an earlier phase gate is incomplete.

## Unit Selection

1. Select an earlier incomplete phase gate whose non-meta work is complete.
2. Otherwise resume the first active parent task.
3. Otherwise select the next pending parent task.
4. For `sub-task` granularity, resume the first active actionable sub-task or select the next pending one.
5. For `task` granularity, execute the parent and its nested details as one unit.
6. A malformed declaration, mixed grammar, or unrecognized unfinished checkbox structure blocks mutation.

## Unit Execution

For each selected unit:

1. Persist the parent and selected sub-task state as active before implementation edits.
2. Create a self-contained Track Work Order from `templates/work-order.md` containing the Track ID, plan unit, relevant spec acceptance, owned files, non-goals, validation, and budget.
3. Delegate through `references/orchestration.md`. The Executor must not edit Architect artifacts unless the Work Order explicitly assigns a precise lifecycle write.
4. Apply `references/execution.md` with the smallest correct implementation and Track-unit budget.
5. Review the cumulative unit diff under `references/review.md` plus the Track spec, plan, project context, and style guides.
6. Apply only authorized Blocking fixes within the unit budget.
7. On acceptance, mark the unit complete and record a concise summary plus an explicitly authorized short commit SHA or `no-commit`.
8. Rescan the phase before selecting later work.

Auto Mode continues to the next unit after acceptance. Task size alone is not a stop condition, but every unit remains bounded and independently reviewed.

## Phase Verification

Treat a phase gate as its own Track unit with two corrective and two review-fix cycles.

1. Mark the gate active.
2. Identify phase-changed behavior and corresponding tests.
3. Run the smallest phase-level automated checks required by the plan and delivery policy.
4. Generate concrete manual verification from product context and phase acceptance.
5. Manual Mode waits for confirmation.
6. Auto Mode executes feasible browser, CLI, API, test, or inspection substitutes and records limitations.
7. Mark the gate complete only after required checks pass or the user explicitly accepts a named non-safety limitation.

Checkpoint commits are optional and occur only when explicitly authorized. Suggested message:

```text
architect(checkpoint): complete phase <phase_name>
```

## Finalization

After all status-managed units and phase gates are complete:

1. Keep the registry `[~]` and metadata `in_progress`; record only that implementation units are complete.
2. Compare the completed spec with product, tech stack, and guidelines.
3. Apply routine factual documentation synchronization only when already authorized by the approved Track and repository rules.
4. Require explicit approval for significant stack decisions, sensitive product-guideline changes, or new product scope.
5. Open one Track finalization unit with two corrective cycles and two review-fix cycles. Its first documentation validation and final review are attempt zero.
6. Run final Track review through `references/review.md`, `references/architect/review.md`, and this module's Track checks.
7. If Blocking findings remain, create bounded finalization fix Work Orders and consume the finalization budget. Do not borrow or reset a prior unit budget.
8. Only after documentation synchronization, required checks, and final review pass, mark the registry `[x]`, set metadata to `completed`, and refresh `updated_at`.
9. Report accepted completion only after the completed durable state is validated. A blocker before step 8 leaves the Track `in_progress`.

Implementation does not authorize a commit. When the user explicitly requests one, stage only inspected Track-owned files and hunks, inspect the staged diff, run the repository's staged-diff check, commit, and verify. Suggested final message:

```text
architect(implement): complete track <track_id>
```

Do not offer archive or deletion automatically. Route an explicit cleanup request through `references/architect/contracts.md`.

## Stop Conditions

Stop with exact Track, phase, unit, budget, and evidence when context is malformed, selection or mode is unresolved, worktree ownership is ambiguous, validation or review budget is exhausted, a required decision or approval is missing, a phase gate fails, an external or destructive action is unapproved, or a commit cannot be isolated when commit completion was explicitly required.
