# Architect Implement Module

> Adapted from Architect Implement in `hlhr202/swe-skills` (Apache-2.0); modified to use Dev Harness Work Orders, one controller, repair ledgers, and explicit commit authorization.

## Purpose

Implement or resume one approved Track by selecting a coherent delivery batch, executing it locally or delegating the complete outcome through Dev Harness, maintaining durable state, verifying genuine phase/final boundaries, synchronizing context, and completing final review.

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
- **Auto:** perform or safely substitute phase verification and continue through accepted batches without phase-level confirmation. Commits still require explicit authorization.

Use Auto by default when implementation is clearly authorized. Use Manual only when the user chose it or a repository/process rule mandates a pause. Mode selection controls continuation only and never authorizes consequential operations.

## State Model

```text
selected
  -> continuation_ready
  -> track_in_progress
  -> unit_loop
  -> phase_verified (repeat)
  -> units_complete
  -> docs_synchronized
  -> final_review
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

Adjacent pending units may be merged into one coherent Work Order when the acceptance union remains within scope, one accountable owner has no active collision, and authorization, rollout, and rollback boundaries are compatible. Different filenames or check commands do not force a split. Record every covered plan unit in the Work Order and preserve each unit's status transition.

Registry markers, plan checkboxes, metadata, summaries, and repair ledgers are lifecycle bookkeeping owned by the Coordinator. Update them directly after the relevant gate; never dispatch a bookkeeping-only child. An Executor handles only implementation or independently valuable validation.

## Track Delegation Gate

First select local or delegated execution. The Coordinator may execute a small bounded Track unit locally after checking ownership. Apply `references/orchestration.md`'s Track Delegation Gate only before child dispatch.

- Read the valid project-local child configuration first.
- When it is absent, legacy, incomplete, or unsupported, ask for the concrete child model, reasoning value, and reuse scope, then pause with the Track `blocked`.
- When dispatch uses a named host Agent, verify that it is loaded as a child and pins the exact configured model and reasoning or variant value. Invoke that Agent by name for the Work Order.
- Reuse a valid explicit current-Session choice for this role. Do not use a host default, main Session model, or internal profile as child configuration.
- Do not silently replace a required independent Executor with the Coordinator. Missing explicit child settings block that dispatch, not unrelated authorized local work.

The gate must pass before delegated Work Order creation or child edits. A `Current Project` response writes the configuration before dispatch; a `Current Session` response may be reused only for later units of this Track in this Session after the initial gate has passed.

## Unit Execution

For each selected delivery batch:

1. Confirm local ownership or that the Track Delegation Gate has passed for delegation.
2. The Coordinator persists the parent and selected sub-task state as active before implementation edits.
3. For delegation, create a self-contained Track Work Order from `templates/work-order.md` containing the Track ID, plan unit, relevant spec acceptance, owned files, non-goals, validation, budget, and resolved child configuration source.
4. Execute a small local unit from its plan/checklist, or delegate through `references/orchestration.md`. Reuse the same Executor for implementation, tests and repairs. Never concurrently edit its owned files. The Executor must not edit Architect artifacts unless explicitly assigned.
5. Apply `references/execution.md` with the smallest correct implementation and active repair ledger.
6. Review the cumulative unit diff under `references/review.md` plus the Track spec, plan, project context, and style guides.
7. Apply only authorized Blocking fixes within the unit budget.
8. On acceptance, the Coordinator marks every covered unit complete and records a concise summary plus requested-tier evidence and an explicitly authorized short commit SHA or `no-commit`; if an exact dirty attribution remains, record its reason and next owner.
9. Rescan the phase before selecting later work.

Auto Mode continues to the next eligible batch after acceptance. Task size alone is not a stop condition, but each coherent batch remains bounded and receives review at its genuine phase/final boundary.

## Phase Verification

Treat a genuine phase gate as a Track boundary, not an artificial retry or closeout unit.

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

## Final Review And Closure

After all status-managed units and genuine phase gates are complete:

1. Keep the registry `[~]` and metadata `in_progress`; record only that implementation units are complete.
2. Compare the completed spec with product, tech stack, and guidelines.
3. Apply routine factual documentation synchronization only when already authorized by the approved Track and repository rules.
4. Require explicit approval for significant stack decisions, sensitive product-guideline changes, or new product scope.
5. Run final Track review through `references/review.md`, `references/architect/review.md`, and this module's Track checks; the review reconciles accumulated evidence and does not create a dedicated closeout Work Order or budget by default.
6. If Blocking findings remain, return them to the existing developer or Coordinator-local owner within the active repair ledger; Reviewer remains read-only.
7. Only after documentation synchronization, requested-tier evidence, required checks, and final review pass, mark the registry `[x]`, set metadata to `completed`, and refresh `updated_at`.
8. Report accepted completion only after the completed durable state is validated. A dependent missing live or business-tier evidence leaves the Track `partial` or `blocked`.

Implementation does not authorize a commit by itself. An explicit current-user instruction or standing user/repository authorization requiring local commits is sufficient; do not ask again. When authorized, stage only inspected Track-owned files and hunks, inspect the staged diff, run the repository's staged-diff check, commit, and verify. If work remains dirty by an exact attributable scope, report the files, reason, and next owner. Suggested final message:

```text
architect(implement): complete track <track_id>
```

Do not offer archive or deletion automatically. Route an explicit cleanup request through `references/architect/contracts.md`.

## Stop Conditions

Stop with exact Track, phase, batch, repair counts, and evidence when context is malformed, selection is unresolved, worktree ownership is ambiguous, an explicit user hard limit is exhausted, a required decision or approval is missing, a genuine phase gate fails, an external or destructive action is unapproved, or a commit cannot be isolated when commit completion was explicitly required.
