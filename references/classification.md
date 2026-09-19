# Task Classification Protocol

## Purpose

Select the minimum process weight from risk, uncertainty, reversibility, and coordination needs. File count and estimated code size are supporting signals, not the deciding factors.

## Classification Dimensions

Assess only dimensions that are not already obvious from the request or repository:

- **Clarity:** Are behavior and acceptance criteria already specific?
- **Reach:** Is the change local, cross-module, or cross-system?
- **Contract impact:** Does it affect a public API, persisted data, deployment, authentication, authorization, billing, privacy, or another external boundary?
- **Reversibility:** Can the change be reverted without migration or user-data consequences?
- **Technical uncertainty:** Does implementation require a new design decision, unfamiliar subsystem, or experiment?
- **Coordination:** Can one bounded Work Order deliver it, or does it need ordered slices and durable state?

## Levels

### Quick

Use Quick when all material facts are clear and the change is local, reversible, and low risk. Typical examples are a small bug with a known cause, copy or configuration correction, localized UI behavior, or a mechanical refactor with existing tests.

Quick defaults:

- One compact in-memory Coordinator checklist, not a full Work Order document.
- Current Session execution and local review; zero child dispatches by default.
- A child only for explicit user-requested isolation or a concrete recorded safety or independence reason.
- Focused validation only.
- One review-fix count is a diagnostic checkpoint; it is not an automatic stop.
- No Architect artifacts and no persistent task document unless requested.

### Scoped

Use Scoped when the outcome is clear but implementation has moderate risk or uncertainty, crosses a trust boundary, or benefits from explicit boundaries and acceptance checks. Crossing two files or modules alone does not require delegation or Track.

Scoped defaults:

- One bounded Coordinator execution pass by default.
- A child only for a cross-trust boundary, independent worktree, significant technical uncertainty, or explicit user request.
- Focused behavior validation; run an adjacent static or build check only for a named shared-contract trigger.
- Two review-fix counts are a diagnostic checkpoint; they are not an automatic stop.
- No Architect track unless durable multi-slice coordination is actually needed.

### Track

Use Track when the work changes public or durable contracts, changes a security or data-integrity policy, requires migration or staged rollout, introduces a significant architecture decision, or needs multiple ordered Work Orders over time.

Track defaults:

- One durable built-in Architect Track for the initiative.
- Automatic Setup, Discuss, Propose, Implement, Review, and Status routing as required by evidence and intent.
- Complete coherent delivery batches mapped to approved plan units. A batch may include configuration/runtime, tests, documentation, and repairs when its acceptance union remains within scope, one owner has no active collision, and authorization, rollout, and rollback boundaries are compatible. Small batches may execute locally; delegated batches keep one Executor through implementation, tests and fixes.
- Architect artifacts own durable specification, plan, status, and project-context synchronization; Dev Harness remains the single implementation controller.
- Merge adjacent plan units into one Work Order when the acceptance union remains within scope, ownership is singular with no active collision, and authorization, rollout, and rollback boundaries are compatible; validation may be combined when it still proves the union.

## Decision Rule

Choose the lowest level whose controls cover every material risk. Do not upgrade merely because the repository is large, the model can imagine edge cases, or validation tools are available.

An unresolved stack/dependency choice, changed data or service boundary, or disputed engineering feedback triggers `references/technical-quality.md`. The Coordinator recommends a path using repository evidence and business constraints. The user's technical experience does not determine the level. A settled design or a small change using existing patterns needs no new comparison, decision document, or approval; technical assessment alone creates no Track.

Touching a security, persistence, or data-integrity code path does not by itself require Track. A bounded fix that preserves the existing contract may be Quick or Scoped with proportionate review. Use Track when the contract, policy, schema, migration, rollout, or durable project coordination changes.

Sending one canary message to one explicitly named internal recipient is Scoped when it introduces no public contract, migration, persistence policy, security policy, or architecture decision. The external send still requires exact current-conversation authorization; that approval boundary does not by itself make the implementation a Track.

Do not create a new Track merely because a small correction belongs to an existing Track. A single configuration correction, one-line test expectation fix, or lifecycle bookkeeping update stays in its current authorized unit or Coordinator lifecycle step.

Announce the result using:

```text
Harness: <Quick|Scoped|Track> - <one sentence naming the decisive factor>.
```

Ask the user only when two classifications would produce materially different scope, cost, approval, or persistence and repository evidence cannot decide.

## Escalation

Escalate during execution only when new evidence reveals one of these conditions:

- The accepted behavior is materially ambiguous.
- A public, persisted, security, privacy, billing, or deployment contract must change.
- Safe completion requires an irreversible action or migration.
- The Work Order cannot be isolated from unrelated work.
- More than one additional independently verifiable slice is required.

Stop the current Work Order and return the evidence. The Executor may recommend escalation but cannot perform it.

Do not escalate for a theoretical edge case, optional cleanup, style preference, pre-existing defect, or a failure outside the causal path of the current change.
