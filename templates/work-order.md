# Work Order: <short outcome>

## Identity

- **ID:** `<optional stable identifier>`
- **Harness mode:** `<Quick|Scoped|Track unit>`
- **Internal execution profile:** `<executor-economical|executor-deep>`
- **Child model:** `<resolved host model id or alias>`
- **Child reasoning:** `<resolved host reasoning depth or variant>`
- **Child Agent:** `<verified host Agent name or direct dispatch>`
- **Child configuration source:** `<project config|current Session answer|per-dispatch answer>`
- **Owner:** Coordinator

## Execution Attestation

- **Verifier:** `<resolved path to this installed Skill's scripts/attestation.mjs>`
- **Baseline status:** `<clean, or concise pre-existing changes and their related/unrelated classification>`

### Verification Envelope

```json
<paste the complete `envelope` object returned by the capture command without modification>
```

Immediately before dispatch, the Coordinator runs the resolved verifier's `capture` command with schema version 2, path-only owned/read-only scope, and an execution binding containing this Work Order ID, harness mode, concrete child settings, requested consequential operations, and Track gate evidence. Embed its returned `envelope` unchanged above. The envelope is already the complete stdin for the verifier's `verify` command; neither Coordinator nor Executor wraps, reorders, or reconstructs it.

The envelope's scope hash binds every child and Track gate field to the repository and scoped-content fingerprints. Placeholders, omitted fields, scoped drift, a mismatch, or an ambiguous ownership boundary block dispatch. Repository-wide HEAD or status drift outside owned/read-only paths is diagnostic unless it creates an ownership collision. Requested consequential operations are handoff evidence only: an Executor never commits, pushes, publishes or tags, deploys, sends externally, migrates, cleans up, deletes, or performs another destructive operation.

## Outcome

<One observable result. Describe behavior, not implementation ambition.>

## Acceptance Criteria

- [ ] <Observable criterion 1>
- [ ] <Observable criterion 2>

## Scope

### Owned

- `<must match verificationEnvelope.attestation.ownedPaths>`

### Read-Only Context

- `<must match verificationEnvelope.attestation.readOnlyPaths>`

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
- For a material technical decision, include its settled choice, constraints, required evidence, and source here; omit this entry for ordinary changes. The Executor follows that decision and reports contrary evidence without reselecting the stack.

## Validation

### Required Checks

1. `<focused test, reproduction, inspection, or command>`
2. `<smallest adjacent check, only when triggered>`

- **Shared-contract trigger:** `<exact changed contract and required adjacent check, or none>`
- **Broad-check gate:** `<phase|final|repository hard threshold|explicit requirement|none>`
- **Reusable evidence:** `<matching validation-ledger entry IDs, or none>`
- **External validation:** `<none, or Coordinator-owned deadline, poll interval, max polls, and terminal evidence>`

### Evidence Ledger

| ID | Command or inspection | Scope/input fingerprint | Relevant-file fingerprint | Result | Time | Source |
| -- | --------------------- | ----------------------- | ------------------------- | ------ | ---- | ------ |
| `<id>` | `<exact check>` | `<hash>` | `<hash>` | `<passed|failed|blocked>` | `<UTC>` | `<executed|reused>` |

### Budget

- **Corrective cycles:** `<used/limit; initial implementation starts at 0/1 for Quick or 0/2 for Scoped/Track>`
- **Parent review-fix cycle:** `<reserved/limit; initial is 0/1 for Quick or 0/2 for Scoped/Track>`
- **Broader validation trigger:** `<named shared contract or none>`
- **Time or external-service limit:** `<limit or not applicable>`
- **Request ledger:** `<original request ID, start time, elapsed time, checkpoint, and any user-set hard deadline; inherited across fixes and units>`

Before an additional check, name its unresolved acceptance or introduced regression, evidence gap, and delivery decision. Omit checks that cannot change acceptance. Phase/final labels alone do not justify reruns. At a soft checkpoint report progress and the smallest remaining path; only missing decisions/capabilities or exhausted hard limits block continuation. Return timing and check counts without inventing unavailable measurements.

Do not run a full suite, broad audit, browser matrix, integration environment, or external-service check unless required above or the named trigger occurs.

The Coordinator owns external polling. An Executor does not poll or wait for provider state and does not receive another Work Order to extend a deadline.

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
