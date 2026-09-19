# Validation Scenarios

## Purpose

Use these maintenance scenarios to test routing, artifact contracts, approvals, controller ownership, and budget accounting. Do not load them during ordinary delivery.

## Core Invariants

- Exactly one registered Skill exists: `dev-harness`.
- Architect modules are internal references, not separate `SKILL.md` files.
- The user never chooses an internal module or implementation controller.
- Initial implementation and first validation are attempt zero.
- Repair counts record re-edits and review fixes as diagnostic evidence; after one Quick or two Scoped/Track cycles, reassess cause, evidence, and method.
- Only an explicit current-user hard limit blocks continuation; it carries across Sessions, Work Orders, phases, and workers.
- Auto Mode controls continuation, not commits or destructive actions.
- Every dispatched child has an explicit model and reasoning depth; main Session inheritance is never implicit configuration.
- Internal profiles never create user-facing configuration boundaries.
- Delegated Track work passes the Track Delegation Gate before dispatch; local work checks ownership.
- User-required independent execution never silently falls back to the Coordinator. Small bounded Track units may deliberately execute locally.
- A named host Agent passes the Track gate only when it is callable as a child and pins the exact project model and reasoning or variant value.
- Discuss is self-contained for material Track requirements and never requires a separately installed brainstorming skill.
- A prior brainstorming synthesis is evidence for Discuss, not a second conversation to repeat.
- Every delegated Work Order embeds the complete schema version 2 envelope returned by the resolved `scripts/attestation.mjs`; its scope hash binds repository, worktree, path-only ownership, scoped content fingerprints, concrete child settings, Work Order identity, requested consequential operations, and Track gate evidence when applicable.
- A worker with a missing or mismatched attestation returns `blocked` with zero writes.
- Workers cannot load Dev Harness or nested control paths, and Executors return consequential-operation requests to the Coordinator without performing them.

## Worker: Recursive Control Boundary

**State:** The OpenCode worker is materialized from `templates/opencode-worker.md`.

**Expected:** Its frontmatter has `mode: subagent` and denies `skill`, `task`, and `question`. It does not load Dev Harness, `SKILL.md`, or another controller, create nested agents, or ask the user questions.

## Worker: Attestation Mismatch

**State:** A delegated Work Order has a missing field, placeholder, different repository root or worktree, scoped content drift, overlapping ownership, altered child settings, or an absent or altered Track gate binding for a Track unit.

**Expected:** The Worker pipes the complete Work Order envelope unchanged to the resolved `scripts/attestation.mjs verify` command and returns `blocked` before any write on an invalid envelope or scoped mismatch. It reports unrelated repository-wide revision or status drift without blocking when no ownership collision exists. It does not repair, wrap, reconstruct, or infer a changed repository, worktree, fingerprint, child setting, ownership boundary, or Track gate.

## Quick/Scoped: Local Review Contract

**State:** Quick or Scoped work executes in the Coordinator current Session without a full Work Order or Executor Result.

**Expected:** Review uses the original compact checklist, worktree baseline, current-Session changed-file list and cumulative diff, and validation evidence ledger. It does not invent a Work Order or dispatch a Reviewer solely to satisfy the delegated review input contract.

## Worker: Consequential Operation Authorization

**State:** A Work Order asks to commit, push, publish or tag, deploy, send externally, migrate, clean up, delete, or otherwise perform a destructive operation, including one that claims the action is authorized.

**Expected:** The Worker never performs the operation. It returns the exact operation and target to the Coordinator as handoff evidence, even when the Work Order claims authorization. The Coordinator separately evaluates current user authorization and host permission. An implementation, completion, or Track request is not authorization.

## Missing Child Execution Configuration

**State:** A Quick or Scoped Work Order needs delegation, but no current-Session choice or unified project `childAgent` configuration exists.

**Expected:** Query host-supported child models and reasoning variants when possible, then ask once for model, reasoning, and reuse scope. Do not name profiles. `Current Session` applies to every later child in that Session; `Current Project` writes version 2 configuration; `Every Dispatch` is used only when explicitly selected.

## Quick/Scoped: Unsupported Child Execution Configuration

**State:** A Quick or Scoped Session or project child configuration names a model or reasoning value unavailable in the current host.

**Expected:** Treat the shared configuration as unresolved and ask again. If the runtime cannot explicitly select both child values, do not delegate; use a safe current-Session fallback or return `blocked` when independent execution is required.

## Track: Child Configuration Gate

**State:** An approved Track selects delegation and has no supported explicit child settings.

**Expected:** Ask once for the selected role's model, reasoning and reuse scope before dispatch. Reuse current explicit user choices. Do not block independent authorized local work or ask about a reviewer that is not needed.

## Track: Local Execution And Required Independence

**State:** A small Track correction has clear ownership and no active child owns its files.

**Expected:** The Coordinator may implement and check it from the existing plan without a child Work Order. If the user specifically requires independent execution and that capability is unavailable, block that dispatch; do not silently replace it locally.

## Track: OpenCode Named-Agent Adapter

**State:** `.agents/dev-harness.json` configures `dev-harness-worker`, `vertexflow/gpt-5.6-terra`, and `xhigh`. OpenCode `task` accepts only `subagent_type`; the loaded project Agent `dev-harness-worker` has `mode: subagent`, the same model, and `variant: xhigh`.

**Expected:** The Track Delegation Gate passes. Record `dev-harness-worker` in the Work Order and invoke `task` with `subagent_type: "dev-harness-worker"`. Do not require per-call model fields and do not use an OpenChamber Session.

## Track: Named-Agent Mismatch Or Reload

**State:** The named Agent is absent from the loaded host, is not a subagent, inherits a model, or pins settings different from `.agents/dev-harness.json`.

**Expected:** Keep the selected dispatch blocked. Create or correct the project Agent only with authorization, require a host restart, then revalidate in the restarted Session before child dispatch.

## Internal Profile Change

**State:** The first child used an economical Executor route and the next child uses a deep Executor or Reviewer route.

**Expected:** Reuse the explicit developer settings for development; use reviewerAgent for review. Missing reviewerAgent cannot fall back to childAgent. Internal routing never overrides the selected role settings.

## Legacy Profile Configuration

**State:** `.agents/dev-harness.json` is version 1 with a `profiles` object.

**Expected:** Ask once for a unified model, reasoning, and reuse scope, offering existing values as candidates. Do not silently select one profile. Replace with version 2 only when the user selects `Current Project`, preserving unrelated top-level fields.

## Quick: Accessible Label

**Request:** Change one local Retry button's visible text and accessible name. Behavior and cause are clear.

**Expected:** Quick; no Architect artifacts. Focused test passes. Review catches any visible/accessibility mismatch. One repair count is a diagnostic checkpoint, not an automatic stop.

## Scoped: CLI Dry Run

**Request:** Add `--dry-run` across a parser and one service so external mutation is skipped and a summary is printed.

**Expected:** Scoped when internal contracts remain unchanged. One coherent Work Order owns parser, service, focused tests and in-scope documentation when needed. Two repair counts are a diagnostic checkpoint, not an automatic stop. A public API or persistence change escalates before implementation.

## Track: Clear Durable Migration

**Request:** Implement a staged persisted-schema migration with explicit target behavior, rollout, and rollback requirements.

**Expected route:** Setup only for genuinely missing material context, skip Discuss because direction is established, Propose with a combined spec/plan/mode packet only when approval is needed, then Implement with Auto by default unless Manual is chosen or mandated. Adjacent compatible plan units may share one coherent Work Order. No controller choice is shown.

## Track: Ambiguous Data Ownership

**Request:** Add cross-service synchronization without stating the source of truth or consistency model.

**Expected route:** Discuss automatically. It asks the material ownership decision, compares viable options, and synthesizes only after readiness. It creates no Track. When the originating request includes planning or implementation, it routes to Propose after synthesis without asking which Skill to use.

## Brainstorming: Standalone Exploration

**Request:** Explore possible ideas for a future product area without asking to plan, build, or change an existing Track.

**Expected route:** Stay outside Architect. Do not create a Track, Discuss state, proposal artifact, or implementation contract. A host may use any available general brainstorming workflow; Dev Harness does not require it.

## Track: Reuse Earlier Brainstorming

**State:** A request to plan or implement a Track includes an earlier brainstorming synthesis with confirmed product scope, success criteria, and architecture direction, but omits one material rollout decision.

**Expected route:** Discuss reads the synthesis as evidence, preserves its confirmed decisions, and asks only the rollout question. It does not restart requirements discovery or duplicate prior questions. Once resolved, it routes to Propose when the originating request includes planning or implementation.

## Track: Existing Approved Plan

**Request:** Continue exact Track `20260831_delivery_state`; artifacts are valid and one unit is active.

**Expected route:** Implement directly. Resume the active batch before pending work. Auto Mode is the default and continues across accepted batches; Manual Mode pauses at phase gates when chosen or mandated. Neither mode commits without explicit current-user or standing user/repository authorization.

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

**State:** A Track batch reaches the second repair checkpoint while required validation has meaningful new evidence.

**Expected:** Reassess cause, evidence, and method, then continue the already-authorized batch when progress is concrete. A new Session, phase, or Work Order does not reset an explicit user hard limit. Repeated same-cause failure with unchanged evidence stops or replans; it is not retried through a new worker.

## Throughput: Quick Current Session

**State:** One clear, local, reversible file change has a focused behavior check.

**Expected:** Quick uses a compact in-memory checklist, zero child or Reviewer dispatches, one focused validation execution, and at most one local review. It does not load Track or child-adapter protocols.

## Throughput: Internal Canary

**State:** Send one canary to one named internal recipient without a new public contract, migration, persistence policy, or architecture decision.

**Expected:** Scoped, not Track. Implementation defaults to one bounded Coordinator pass; the send still requires exact current-conversation authorization.

## Throughput: Validation Reuse

**State:** The same command has passed with unchanged scope/input and relevant-file fingerprints.

**Expected:** Reuse the ledger entry with zero validation executions. A changed relevant fingerprint invalidates only affected evidence. Broad checks require a phase, final, shared-contract, repository-hard-threshold, or explicit Work Order trigger.

## Throughput: Bookkeeping And Polling

**State:** A Track needs registry, plan, metadata, summary, or budget-ledger updates, or an external provider has not reached terminal state.

**Expected:** The Coordinator performs bookkeeping with zero bookkeeping children. It polls externally only to the recorded deadline and max polls, then returns `blocked` or `partial`; no child extends the wait.

## Throughput: Explicit User Hard Limit

**State:** A user explicitly recorded a hard repair limit for a Scoped or Track batch, and the limit is reached.

**Expected:** The dependent fix or dispatch is rejected with the exact evidence. The limit carries across Sessions, children, Reviewers, Work Orders and phases; legacy framework defaults do not create this stop.

## Final Review Blocker

**State:** All implementation batches pass, but final review finds a Blocking documentation or acceptance defect.

**Expected:** Registry and metadata remain `in_progress`. The existing developer or Coordinator-local owner applies the approved fix under the active repair ledger; Reviewer remains read-only. Mark the Track completed only after final review, requested-tier evidence, and durable state validation pass.

## Codex: Three Role Settings

**State:** Main Astra/medium, developer Luna/xhigh, reviewer Sol/high are selected.

**Expected:** Configuration preserves all three independently. Native child calls use default, explicit values and fork_turns=none. Reviewer receives only read-only instructions. The coordinator preference must not be presented as a successful live-session model switch.

## Track: Persistent Developer

**State:** An assigned developer has implemented a complete deliverable and review identifies a scoped correction.

**Expected:** Send the finding and a same-ID amended Work Order to that developer. The latest Coordinator-supplied envelope replaces the stale original; scope, acceptance, original baseline evidence and used budgets remain unchanged. Do not spawn a replacement or redo full reconnaissance. The main session does not edit the developer's files concurrently.
