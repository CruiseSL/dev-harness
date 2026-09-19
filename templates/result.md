# Dev Harness Executor Result: <Work Order ID or outcome>

## Status

`<completed|partial|blocked|cancelled>`

## Summary

<What changed and the observable result for the complete coherent delivery batch, in two or three sentences.>

## Changed Files

- `<path>`: <reason>

## Acceptance

- [x] <criterion>: <evidence>
- [ ] <unmet criterion>: <reason>

- **Requested completion tier:** `<code|deployed|live|business|local-only>`
- **Target environment:** `<environment or not applicable>`
- **Minimum normal-path evidence:** `<evidence or missing gap>`

## Validation

| Check | Scope/input fingerprint | Relevant-file fingerprint | Result | Time | Source | Evidence |
| ----- | ----------------------- | ------------------------- | ------ | ---- | ------ | -------- |
| `<command or inspection>` | `<hash>` | `<hash>` | `<passed, failed, blocked, or not run>` | `<UTC>` | `<executed|reused>` | <concise output or reason> |

- **Repair counts:** `<corrective/review-fix counts; diagnostic checkpoint status>`
- **Explicit user hard limit:** `<none or exact limit and authority>`
- **Broader validation:** `<not triggered|trigger and result>`
- **Validation executions:** `<count>`
- **Validation reuses:** `<count>`
- **Broad checks:** `<count>`
- **External polls:** `<Coordinator-owned count; Executor must return 0>`
- **Request elapsed / first implementation complete:** `<observed times, or unavailable; keep the original request start>`
- **Remaining acceptance / next check decision:** `<unmet criterion and missing evidence, or none: ready for review>`

## Git Closure

`<staged/commit evidence, or exact preserved dirty files, reason they remain, and next owner>`

## Discoveries

- `<pre-existing|theoretical|out-of-scope|scope-change>`: <evidence and impact>

Write `None.` when there are no material discoveries. Do not include optional style ideas.

## Scope Deviations

`None.` or <exact deviation and Coordinator authorization>. An unauthorized deviation requires `partial` or `blocked`, not `completed`.

## Residual Risk

<Only concrete risk remaining inside the supported behavior, or `None identified within the Work Order.`>

## Recommended Next Action

`<review|accept|approve named scope change|resolve blocker>`
