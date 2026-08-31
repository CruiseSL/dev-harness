# Task Classification Protocol

## Purpose

Select the minimum workflow weight from risk, uncertainty, reversibility, and coordination needs. File count and estimated code size are supporting signals, not the deciding factors.

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

- One compact Work Order.
- Economical Executor profile when delegation is useful and available.
- Focused validation only.
- At most one review-fix cycle.
- No Architect artifacts and no persistent task document unless requested.

### Scoped

Use Scoped when the outcome is clear but implementation crosses modules, changes internal behavior or contracts, has moderate uncertainty, or benefits from explicit boundaries and acceptance checks.

Scoped defaults:

- One full Work Order, split only when independent ownership or verification boundaries are clear.
- Deep Executor profile only when uncertainty justifies it; otherwise use the economical profile.
- Targeted tests plus the smallest relevant static or build check.
- At most two review-fix cycles.
- No Architect track unless durable multi-slice coordination is actually needed.

### Track

Use Track when the work changes public or durable contracts, changes a security or data-integrity policy, requires migration or staged rollout, introduces a significant architecture decision, or needs multiple ordered Work Orders over time.

Track defaults:

- One durable Architect track for the initiative.
- Multiple bounded Work Orders mapped to approved plan slices.
- Each Dev Harness controlled slice keeps the Scoped two-cycle limit. Architect controlled work uses its active workflow budget.
- Architect owns durable specification, plan, status, and project-context synchronization.

## Decision Rule

Choose the lowest level whose controls cover every material risk. Do not upgrade merely because the repository is large, the model can imagine edge cases, or validation tools are available.

Touching a security, persistence, or data-integrity code path does not by itself require Track. A bounded fix that preserves the existing contract may be Quick or Scoped with proportionate review. Use Track when the contract, policy, schema, migration, rollout, or durable project coordination changes.

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
