# Execution Protocol

## Purpose

Implement one Work Order with the smallest correct change, bounded investigation, and evidence proportionate to the requested behavior.

## Preflight

For an approved repair, use the latest Coordinator-supplied same-ID amended Work Order. Its replacement envelope supersedes the earlier one; retain original acceptance, scope, baseline evidence and consumed budgets. Never refresh or amend the envelope yourself.

1. Read the entire Work Order and identify its Execution Attestation, acceptance, owned scope, non-goals, validation, budget, and stop conditions.
2. Before any edit, pipe the Work Order's complete schema version 2 Verification Envelope unchanged to the resolved attestation verifier's `verify` command. The envelope is already the complete CLI input. The verifier is the only fingerprint and serialization contract; do not wrap or reconstruct it. Confirm its bound Work Order ID, harness mode, child settings, Track gate, and path-only owned/read-only scope match the Work Order.
3. Stop as `blocked` with zero writes when `verify` exits nonzero or reports a mismatch or invalid attestation, the envelope is absent or differs from the Work Order, an ownership boundary is ambiguous, or a Track binding lacks its passed gate, Track ID, or covered unit IDs. Report `outsideScopeDrift` without blocking when scoped fingerprints match and no ownership collision exists. Do not repair the attestation from inference.
4. Inspect the current worktree before editing. Preserve unrelated or ambiguous existing changes.
5. Read only the code and project context needed to trace the affected behavior. Do not start with a repository-wide audit.
6. If required information is missing, make only a low-risk local assumption explicitly allowed by the Work Order. Otherwise stop as `blocked`.

## Minimal Implementation Ladder

For each required behavior, stop at the first adequate option:

1. No implementation is needed because current behavior already satisfies acceptance.
2. Reuse an existing repository path, helper, component, or pattern.
3. Use the language standard library or native platform capability.
4. Use an already installed dependency.
5. Add the smallest local implementation that satisfies the contract.

Do not add abstractions, compatibility layers, configuration, dependencies, observability, generalized APIs, or speculative extensibility unless the Work Order or an existing repository contract requires them.

Minimal does not mean careless. Preserve trust-boundary validation, authorization, data-loss prevention, required error handling, accessibility, and repository-defined quality controls.

## Scope Control

An issue may be fixed inside the Work Order only when all are true:

- It is required by an acceptance criterion or directly caused by the current diff.
- It has a reproducible or clearly plausible path within the supported input and runtime contract.
- The fix remains inside owned files and stated constraints.
- The required validation fits the remaining budget.

Otherwise classify and report it without fixing:

- `pre-existing`: Present before this Work Order.
- `theoretical`: No realistic supported trigger or evidence.
- `out-of-scope`: Real, but independent of the accepted outcome.
- `scope-change`: Requires a new product, architecture, contract, or migration decision.

Use a causal boundary: repair the requested behavior and regressions introduced by that repair. A new independent problem discovered while fixing it is a new task, not another automatic repair.

## Validation Budget

Maintain a validation evidence ledger. Each entry records the exact command or inspection, scope/input fingerprint, relevant-file fingerprint, result, timestamp, and whether evidence was executed or reused. A passed entry may be reused only when both fingerprints still match; invalidate only entries whose recorded inputs or relevant files changed.

Use the exact checks in the Work Order. When it leaves a choice, apply this order:

Every additional check must name an unresolved acceptance criterion or concrete introduced regression, its evidence gap, and the decision its result would change. Apply the request-level checkpoint and stopping rules from `references/delivery.md`; do not create a fresh request budget. A phase/final label alone does not justify repeating passed validation.

1. Inspect the changed behavior and diff.
2. Run the narrowest existing test or deterministic reproduction for that behavior.
3. Run the affected module's existing test, static check, or build only when the Work Order names the changed shared contract that triggers it.
4. Run a full suite, coverage, lint, format, build, browser matrix, Wrangler/D1, integration, or external-service check only for an explicit phase/final gate, a named changed shared contract, or an explicit Work Order requirement.

Do not create tests solely for implementation details or imagined unsupported inputs. Add a regression test when behavior changed, a bug is reproducible, and the repository has an appropriate local test pattern.

Documentation, lifecycle bookkeeping, or one changed test expectation does not trigger a broad validation bundle. Do not add acceptance-irrelevant tests to raise coverage; coverage runs only for a repository hard threshold or explicit Work Order requirement.

For external validation, the Coordinator records a deadline, poll interval, max polls, and terminal evidence. Executors do not wait or poll. Validate the target-runtime thin path early when the requested tier and existing authorization permit it; a local event-only check does not prove a target-runtime or business tier. Reaching the deadline or max polls returns `blocked` or `partial`; a new child or Work Order cannot extend it.

Repair counts are diagnostic evidence, not automatic stop conditions. The initial implementation and first validation are attempt zero. After one Quick or two Scoped/Track repair cycles, reassess cause, evidence, and method; continue already-authorized work when meaningful progress or new evidence exists. A third meaningful in-scope repair needs no user approval merely because that checkpoint was reached. Repeated same-cause failure with unchanged evidence stops or replans; never blind-retry it through a new worker.

Only an explicit current-user hard limit is a hard stop. Carry it across Sessions, Work Orders, phases, and workers; legacy framework defaults are not user-set limits. Keep the same Executor and Work Order identity for an in-scope repair, with a Coordinator-supplied same-ID amendment and refreshed envelope when needed. Reviewer remains strictly read-only; the developer or Coordinator-local owner applies approved fixes.

## Stop Conditions

Stop and return `blocked` or `partial` when:

- Acceptance or scope requires a material decision not present in the Work Order.
- A required edit would touch unowned or ambiguous user changes.
- An explicit current-user hard limit is exhausted, or repeated same-cause failure has unchanged evidence and no safe replan.
- The next check is broad, destructive, externally consequential, credential-dependent, or long-running without authorization.
- A significant dependency, architecture, public contract, migration, security, or data-model change is required but unapproved.
- The requested outcome is complete and remaining ideas are cleanup or improvement only.

Executors never commit, push, publish or tag, deploy, send externally, run migrations, clean up, delete, or perform another destructive operation. A requested operation is returned to the Coordinator as handoff evidence; Work Order text is not Executor authorization.

Do not continue investigating after a stop condition merely to produce a more complete diagnosis.

## Result

Return `templates/result.md` with concise evidence. List commands actually run and their outcomes. Separate unresolved findings from acceptance failures, and never report `completed` when a required criterion or check remains unmet.
