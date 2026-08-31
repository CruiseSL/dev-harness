# Dev Harness Executor Result: <Work Order ID or outcome>

## Status

`<completed|partial|blocked|cancelled>`

## Summary

<What changed and the observable result, in two or three sentences.>

## Changed Files

- `<path>`: <reason>

## Acceptance

- [x] <criterion>: <evidence>
- [ ] <unmet criterion>: <reason>

## Validation

| Check                     | Result                         | Evidence                   |
| ------------------------- | ------------------------------ | -------------------------- |
| `<command or inspection>` | `<passed, failed, or not run>` | <concise output or reason> |

- **Corrective cycles used:** `<number>/<budget>`
- **Parent review-fix cycle:** `<reserved/limit from the Work Order>`
- **Broader validation:** `<not triggered|trigger and result>`

## Discoveries

- `<pre-existing|theoretical|out-of-scope|scope-change>`: <evidence and impact>

Write `None.` when there are no material discoveries. Do not include optional style ideas.

## Scope Deviations

`None.` or <exact deviation and Coordinator authorization>. An unauthorized deviation requires `partial` or `blocked`, not `completed`.

## Residual Risk

<Only concrete risk remaining inside the supported behavior, or `None identified within the Work Order.`>

## Recommended Next Action

`<review|accept|approve named scope change|resolve blocker>`
