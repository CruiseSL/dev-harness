# Validation Scenarios

## Purpose

Use these maintenance scenarios to test routing, artifact contracts, approvals, controller ownership, and budget accounting. Do not load them during ordinary delivery.

## Core Invariants

- Exactly one registered Skill exists: `dev-harness`.
- Architect modules are internal references, not separate `SKILL.md` files.
- The user never chooses an internal module or implementation controller.
- Initial implementation and first validation are attempt zero.
- A corrective cycle is consumed only by a re-edit after required validation fails.
- A review-fix cycle is reserved before an authorized fix and never reset by redispatch.
- Auto Mode controls continuation, not commits or destructive actions.
- Every dispatched child has an explicit model and reasoning depth; main Session inheritance is never implicit configuration.
- Internal profiles never create user-facing configuration boundaries.

## Missing Child Execution Configuration

**State:** A Quick or Scoped Work Order needs delegation, but no current-Session choice or unified project `childAgent` configuration exists.

**Expected:** Query host-supported child models and reasoning variants when possible, then ask once for model, reasoning, and reuse scope. Do not name profiles. `Current Session` applies to every later child in that Session; `Current Project` writes version 2 configuration; `Every Dispatch` is used only when explicitly selected.

## Unsupported Child Execution Configuration

**State:** The Session or project child configuration names a model or reasoning value unavailable in the current host.

**Expected:** Treat the shared configuration as unresolved and ask again. If the runtime cannot explicitly select both child values, do not delegate; use a safe current-Session fallback or return `blocked` when independent execution is required.

## Internal Profile Change

**State:** The first child used an economical Executor route and the next child uses a deep Executor or Reviewer route.

**Expected:** Reuse the current Session or project model and reasoning without asking again. Internal routing may shape the initial recommendation but never exposes profile names or overrides the user's shared choice.

## Legacy Profile Configuration

**State:** `.agents/dev-harness.json` is version 1 with a `profiles` object.

**Expected:** Ask once for a unified model, reasoning, and reuse scope, offering existing values as candidates. Do not silently select one profile. Replace with version 2 only when the user selects `Current Project`, preserving unrelated top-level fields.

## Quick: Accessible Label

**Request:** Change one local Retry button's visible text and accessible name. Behavior and cause are clear.

**Expected:** Quick; no Architect artifacts. Focused test passes. Review catches any visible/accessibility mismatch. Maximum one corrective and one review-fix cycle.

## Scoped: CLI Dry Run

**Request:** Add `--dry-run` across a parser and one service so external mutation is skipped and a summary is printed.

**Expected:** Scoped when internal contracts remain unchanged. One bounded Work Order owns parser, service, and focused tests. Maximum two corrective and two review-fix cycles. A public API or persistence change escalates before implementation.

## Track: Clear Durable Migration

**Request:** Implement a staged persisted-schema migration with explicit target behavior, rollout, and rollback requirements.

**Expected route:** Setup when core is absent, skip Discuss because direction is established, Propose with separate spec and plan approvals, then Implement after mode selection. Each plan unit is a bounded Work Order. No controller choice is shown.

## Track: Ambiguous Data Ownership

**Request:** Add cross-service synchronization without stating the source of truth or consistency model.

**Expected route:** Discuss automatically. It asks the material ownership decision, compares viable options, and synthesizes only after readiness. It creates no Track. When the originating request includes planning or implementation, it routes to Propose after synthesis without asking which Skill to use.

## Track: Existing Approved Plan

**Request:** Continue exact Track `20260831_delivery_state`; artifacts are valid and one unit is active.

**Expected route:** Implement directly. Resume the active unit before pending work. Auto Mode may continue across accepted units; Manual Mode pauses at phase gates. Neither mode commits without explicit commit authorization.

## Status: Partial Management

**State:** Core context is ready and `architect/tracks.md` exists, but `architect/tracks/` does not.

**Expected:** Status reports `Needs Attention` read-only. It does not create the directory or route silently into Propose.

## Review: Bounded Track Fix

**State:** Final Track review finds one acceptance regression and one unrelated cleanup opportunity.

**Expected:** Regression is Blocking and may receive a bounded fix Work Order. Cleanup is Out-of-scope and is not fixed. Review uses the cumulative diff and original Track acceptance. Commit and cleanup remain unapproved.

## Legacy Compatibility

**State:** Track metadata lacks `schema_version`; plan lacks a granularity declaration and uses nested checkbox sub-tasks.

**Expected:** Treat both as schema version 1 and `sub-task`. Preserve unknown metadata fields. Do not rewrite artifacts solely to modernize format.

**Phase gates:** Recognize both upstream `Architect - User Manual Verification ... (Protocol in workflow.md)` and the Dev Harness `Architect - Phase Verification ... (Protocol in architect/workflow.md)` alias. New plans emit the upstream form.

## Conflict Protection

**State:** Separately installed `architect-implement` is discoverable while Dev Harness is active.

**Expected:** Dev Harness does not dispatch it. The built-in router remains authoritative and reports that duplicate standalone Architect Skills should be uninstalled. No concurrent controller starts.

## Budget Exhaustion

**State:** A Track unit still fails required validation after two corrective cycles.

**Expected:** Unit and Track remain in progress or blocked with exact evidence. A new Session, phase, or Work Order does not reset the unit budget. Later plan units do not start.

## Finalization Blocker

**State:** All implementation units pass, but final review finds a Blocking documentation or acceptance defect.

**Expected:** Registry and metadata remain `in_progress`. Use the dedicated finalization unit's `0/2` review-fix budget. Mark the Track completed only after final review passes and durable state is validated.
