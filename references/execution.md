# Execution Protocol

## Purpose

Implement one Work Order with the smallest correct change, bounded investigation, and evidence proportionate to the requested behavior.

## Preflight

1. Read the entire Work Order and identify acceptance, owned scope, non-goals, validation, budget, and stop conditions.
2. Inspect the current worktree before editing. Preserve unrelated or ambiguous existing changes.
3. Read only the code and project context needed to trace the affected behavior. Do not start with a repository-wide audit.
4. If required information is missing, make only a low-risk local assumption explicitly allowed by the Work Order. Otherwise stop as `blocked`.

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

Use the exact checks in the Work Order. When it leaves a choice, apply this order:

1. Inspect the changed behavior and diff.
2. Run the narrowest existing test or deterministic reproduction for that behavior.
3. Run the affected module's existing tests or static check when the change can influence adjacent behavior.
4. Run a broad suite, integration environment, browser matrix, or external-service check only when the Work Order requires it or a changed shared contract makes it necessary.

Do not create tests solely for implementation details or imagined unsupported inputs. Add a regression test when behavior changed, a bug is reproducible, and the repository has an appropriate local test pattern.

A corrective cycle is one re-edit after the initial implementation fails a required check, followed by rerunning the relevant required validation. The initial implementation and its first validation are attempt zero and do not consume a corrective cycle. Defaults:

- Quick: one corrective cycle.
- Scoped: two corrective cycles.
- Dev Harness controlled Track slice: two corrective cycles.

For a review fix Work Order, applying the approved finding is attempt zero; one corrective cycle permits one re-edit only if that fix then fails its required validation. The Work Order may set a smaller budget. It may set a larger budget only for a named risk and explicit Coordinator decision. Correct one obvious command or environment mistake once without counting it as a product fix; repeated environment failure is a blocker.

## Stop Conditions

Stop and return `blocked` or `partial` when:

- Acceptance or scope requires a material decision not present in the Work Order.
- A required edit would touch unowned or ambiguous user changes.
- Validation still fails after the corrective-cycle budget.
- The next check is broad, destructive, externally consequential, credential-dependent, or long-running without authorization.
- A significant dependency, architecture, public contract, migration, security, or data-model change is required but unapproved.
- The requested outcome is complete and remaining ideas are cleanup or improvement only.

Do not continue investigating after a stop condition merely to produce a more complete diagnosis.

## Result

Return `templates/result.md` with concise evidence. List commands actually run and their outcomes. Separate unresolved findings from acceptance failures, and never report `completed` when a required criterion or check remains unmet.
