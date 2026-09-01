# Work Order: <short outcome>

## Identity

- **ID:** `<optional stable identifier>`
- **Harness mode:** `<Quick|Scoped|Track unit>`
- **Execution profile:** `<executor-economical|executor-deep>`
- **Child model:** `<resolved host model id or alias>`
- **Child reasoning:** `<resolved host reasoning depth or variant>`
- **Owner:** Coordinator

## Outcome

<One observable result. Describe behavior, not implementation ambition.>

## Acceptance Criteria

- [ ] <Observable criterion 1>
- [ ] <Observable criterion 2>

## Scope

### Owned

- `<files, directories, modules, or behaviors the Executor may change>`

### Read-Only Context

- `<context the Executor may inspect but must not modify>`

### Out of Scope

- <Explicit non-goal>
- No unrelated cleanup, refactor, hardening, compatibility work, or speculative edge-case support.

## Constraints

- Follow existing repository patterns and applicable instructions.
- Reuse existing code, native facilities, standard libraries, and installed dependencies before adding new code or packages.
- Preserve security, authorization, data integrity, accessibility, and required error handling.
- Do not change public contracts, persistence, dependencies, architecture, or deployment unless explicitly listed above.

## Implementation Context

- **Relevant paths:** `<paths>`
- **Known behavior or cause:** `<facts already established>`
- **Allowed assumptions:** `<low-risk assumptions, or none>`
- **Architect reference:** `<track ID, phase, and plan unit, or not applicable>`

## Validation

### Required Checks

1. `<focused test, reproduction, inspection, or command>`
2. `<smallest adjacent check, if justified>`

### Budget

- **Corrective cycles:** `<used/limit; initial implementation starts at 0/1 for Quick or 0/2 for Scoped/Track>`
- **Parent review-fix cycle:** `<reserved/limit; initial is 0/1 for Quick or 0/2 for Scoped/Track>`
- **Broader validation trigger:** `<named shared contract or none>`
- **Time or external-service limit:** `<limit or not applicable>`

Do not run a full suite, broad audit, browser matrix, integration environment, or external-service check unless required above or the named trigger occurs.

## Discovery Rules

- Fix only acceptance failures and regressions directly caused by this Work Order.
- Report material pre-existing, theoretical, out-of-scope, and scope-changing discoveries without fixing them.
- Stop rather than infer a missing product or architecture decision.

## Stop Conditions

- The next edit exceeds Owned scope or conflicts with unrelated work.
- Required validation fails after the corrective-cycle budget.
- Completion requires an unapproved destructive, external, migration, dependency, architecture, security, or public-contract change.
- Acceptance is satisfied and remaining work is optional improvement.

## Return Contract

Return the completed `templates/result.md` when supplied. Otherwise return these sections: Status, Summary, Changed Files, Acceptance, Validation and corrective cycles, Discoveries, Scope Deviations, Residual Risk, and Recommended Next Action. Do not claim completion without acceptance and required-check evidence.
