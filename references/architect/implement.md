# Architect Implement Module

> Adapted from Architect Implement in `hlhr202/swe-skills` (Apache-2.0); modified to use Dev Harness Work Orders, one controller, shared budgets, and explicit commit authorization.

## Purpose

Implement or resume one approved Track by selecting one plan unit at a time, executing it locally or delegating a complete deliverable through Dev Harness, maintaining durable state, verifying every phase, synchronizing context, and completing final review.

Runtime entry is `references/track-gate.md` then `references/architect/track-runtime.md`. This document explains the same lifecycle for maintenance; do not load it as a second execution controller or eagerly load later review stages.

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

Adjacent pending units may be merged into one bounded Work Order only when they have identical ownership, acceptance, validation, and rollback boundaries. Any mismatch keeps them separate. Record every merged plan unit in the Work Order and preserve each unit's status transition.

Registry markers, plan checkboxes, metadata, summaries, and budget ledgers are lifecycle bookkeeping owned by the Coordinator. Update them directly after the relevant gate; never dispatch a bookkeeping-only child. An Executor handles only implementation or independently valuable validation.

## Track Delegation Gate

First select local or delegated execution. The Coordinator may execute a small bounded Track unit locally after checking ownership. Apply `references/orchestration.md`'s Track Delegation Gate only before child dispatch.

- Read the valid project-local child configuration first.
- When it is absent, legacy, incomplete, or unsupported, ask for the concrete child model, reasoning value, and reuse scope, then pause with the Track `blocked`.
- When dispatch uses a named host Agent, verify that it is loaded as a child and pins the exact configured model and reasoning or variant value. Invoke that Agent by name for the Work Order.
- Do not use an earlier current-Session choice from Quick work, Scoped work, or another Track, a host default, main Session model, or internal profile to bypass the question for the first Track unit in this Session.
- Do not silently replace a required independent Executor with the Coordinator. Missing explicit child settings block that dispatch, not unrelated authorized local work.

The gate must pass before delegated Work Order creation or child edits. A `Current Project` response writes the configuration before dispatch; a `Current Session` response may be reused only for later units of this Track in this Session after the initial gate has passed.

## Unit Execution

For each selected unit:

1. Confirm local ownership or that the Track Delegation Gate has passed for delegation.
2. The Coordinator persists the parent and selected sub-task state as active before implementation edits.
3. For delegation, create a self-contained Track Work Order from `templates/work-order.md` containing the Track ID, plan unit, relevant spec acceptance, owned files, non-goals, validation, budget, and resolved child configuration source.
4. Execute a small local unit from its plan/checklist, or delegate through `references/orchestration.md`. Reuse the same Executor for implementation, tests and repairs. Never concurrently edit its owned files. The Executor must not edit Architect artifacts unless explicitly assigned.
5. Apply `references/execution.md` with the smallest correct implementation and Track-unit budget.
6. Review the cumulative unit diff under `references/review.md` plus the Track spec, plan, project context, and style guides.
7. Apply only authorized Blocking fixes within the unit budget.
8. On acceptance, the Coordinator marks every covered unit complete and records a concise summary plus an explicitly authorized short commit SHA or `no-commit`.
9. Rescan the phase before selecting later work.

Auto Mode continues to the next unit after acceptance. Task size alone is not a stop condition, but every unit remains bounded and independently reviewed.

## Phase Verification

Treat a phase gate as its own Track unit with two corrective and two review-fix cycles.

1. Mark the gate active.
2. Identify phase-changed behavior and corresponding tests.
3. Run the smallest phase-level automated checks required by the plan and delivery policy.
   Reuse valid unit evidence; a phase gate runs only missing or invalidated checks. Its label does not authorize a fresh broad suite.
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

Implementation does not authorize a commit by itself. A current user instruction requiring local commits is explicit standing authorization for this task. When authorized, stage only inspected Track-owned files and hunks, inspect the staged diff, run the repository's staged-diff check, commit, and verify. Suggested final message:

```text
architect(implement): complete track <track_id>
```

Do not offer archive or deletion automatically. Route an explicit cleanup request through `references/architect/contracts.md`.

## Stop Conditions

Stop with exact Track, phase, unit, budget, and evidence when context is malformed, selection or mode is unresolved, worktree ownership is ambiguous, validation or review budget is exhausted, a required decision or approval is missing, a phase gate fails, an external or destructive action is unapproved, or a commit cannot be isolated when commit completion was explicitly required.
