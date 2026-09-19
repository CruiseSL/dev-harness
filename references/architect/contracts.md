# Architect Contracts

> Adapted from Architect Skills in `hlhr202/swe-skills` (Apache-2.0) and substantially modified to centralize contracts shared by Dev Harness Architect modules.

## Authority

Precedence: user instructions, repository policy, host permissions and safety; approved product context/spec/plan; this shared contract and active module; then the bounded Work Order.

Lower levels may narrow scope but may not weaken a higher-level approval or safety boundary.

## Safe Paths

Architect writes stay under workspace-relative `architect/`; reject absolute/parent-traversal paths, unsafe links, and outside symlinks. Registered links resolve only to `./tracks/<track_id>/` or `architect/tracks/<track_id>/`. Use reviewable edits, preserve unrelated work, and never broadly stage with `git add .` or `git add -A`.

## Core Context

Core readiness covers six context areas: product, guidelines, technology, code style, delivery workflow, and an index. Each needs non-empty evidence, either in a conventional file or an existing repository-native document/configuration linked or mapped from `architect/index.md` or a Track `index.md`. Do not duplicate mapped context; mappings must point to reviewable existing entries.

The conventional files remain supported:

- `architect/product.md`
- `architect/product-guidelines.md`
- `architect/tech-stack.md`
- At least one direct child Markdown file in `architect/code_styleguides/`
- `architect/workflow.md`
- `architect/index.md`

Use conventional files only when a material area is missing or durable copies are explicitly requested. Existing upstream Architect projects remain schema version 1; setup must not create a parallel state format.

## Track Management

Management is ready when `architect/tracks.md` and `architect/tracks/` exist.

Registry entries use exactly one state marker and one safe link:

```text
---

- [ ] **Track: <description>**
  *Link: [./tracks/<track_id>/](./tracks/<track_id>/)*
```

Markers are `[ ]`, `[~]`, and `[x]`. Track IDs match `^[0-9]{8}_[a-z0-9_]+$` and use `YYYYMMDD_shortname` with at most four meaningful ASCII words.

Reject duplicate IDs, duplicate normalized descriptions when selecting by description, unsafe links, and full-ID or short-name collisions. Read-only Status reports malformed entries best-effort; mutating modules stop.

## Track Artifacts

Each `architect/tracks/<track_id>/` contains:

- `spec.md`: approved outcome, requirements, acceptance, non-goals, and risks.
- `plan.md`: approved ordered implementation units and verification gates.
- `metadata.json`: lifecycle status and identity.
- `index.md`: links to the other three artifacts.

Metadata schema version 1:

```json
{
  "schema_version": 1,
  "track_id": "<track_id>",
  "type": "<feature|bug|chore|refactor|docs|test>",
  "status": "<new|in_progress|completed>",
  "created_at": "<UTC ISO-8601 timestamp>",
  "updated_at": "<UTC ISO-8601 timestamp>",
  "description": "<description>"
}
```

Legacy metadata without `schema_version` is version 1. Unknown fields are preserved. Invalid required fields block mutation.

Registry and metadata move together:

| Registry | Metadata      |
| -------- | ------------- |
| `[ ]`    | `new`         |
| `[~]`    | `in_progress` |
| `[x]`    | `completed`   |

Allowed transitions are `[ ] -> [~] -> [x]`; reopening `[x] -> [~]` requires explicit confirmation.

## Plan Grammar

Near the top of every new plan, record:

```markdown
> Task status granularity: `<task|sub-task>`
```

Legacy plans without the declaration default to `sub-task`. Any other declared value is malformed.

- A phase is a Markdown heading beginning with `##`.
- A parent task is a non-indented line such as `- [ ] Task: ...`.
- In `task` granularity, nested bullets are required details without checkboxes.
- In `sub-task` granularity, actionable nested units use indented checkboxes.
- State-managed units follow `[ ] -> [~] -> [x]` and active units resume before pending units.
- Recognize the upstream v1 gate `Task: Architect - User Manual Verification '<Phase Name>' (Protocol in workflow.md)` and the Dev Harness alias `Task: Architect - Phase Verification '<Phase Name>' (Protocol in architect/workflow.md)` as equivalent phase gates.
- New plans emit the upstream v1 form for maximum compatibility. Do not rewrite an accepted alias solely to normalize its label.

Status counting:

- `task`: count parent tasks only.
- `sub-task`: count actionable sub-tasks when a parent has them; otherwise count the parent once.
- Never count a parent and its actionable sub-tasks in the same percentage.

## Approval Matrix

| Action                                          | Required authorization                                          |
| ----------------------------------------------- | --------------------------------------------------------------- |
| Write or replace core context                   | Approval unless clear implementation authorization covers the material change |
| Advance a material Discuss decision             | Explicit decision or safe explicit deferral                     |
| Save or overwrite a discussion draft            | Exact relative path; overwrite requires exact confirmation      |
| Use spec for planning                           | Approved spec/plan packet when needed                            |
| Create track artifacts                          | Approved packet or clear implementation authorization for routine records |
| Reopen completed track                          | Exact track confirmation                                        |
| Start implementation                            | Clear intent; Auto by default unless Manual or a mandated pause applies |
| Apply review findings                           | Coordinator-approved finding; developer/local owner applies it |
| Significant stack or sensitive guideline change | Explicit approval before mutation                               |
| Any Git commit                                  | Explicit current-user request or standing user/repository commit authorization already recorded |
| Archive or delete                               | Explicit confirmation of the exact action and path              |

One clear implementation request may cover routine plan, registry, metadata, and in-scope writes. Action-specific boundaries remain: commits need explicit current-user or standing user/repository authorization; Auto Mode never grants cleanup, external-send, deployment, migration, or destructive permissions.

## Commit Contract

- Never infer commit authorization from setup, proposal, implementation, Auto Mode, review, `go ahead`, or `complete the track` alone.
- A commit requires explicit current-user request or standing user/repository commit authorization already recorded.
- That authorization need not be re-asked; it does not authorize push or deployment.
- Stage only inspected files or hunks owned by the active Track and verify the staged diff.
- Do not create empty commits or mix unrelated changes.
- Suggested messages may be reported without committing.
- Commit failure or unsafe isolation blocks only the commit-dependent terminal state; preserve verified uncommitted work and report it accurately.

## Retry And Budget Contract

This is the canonical retry and approval definition; other protocols reference it rather than adding numeric caps.

- Correct one obvious path, command, or environment mistake once when clear.
- Repair counts are diagnostic. After one Quick or two Scoped/Track cycles, reassess cause, evidence, and method; continue authorized work with meaningful progress or new evidence. A third meaningful in-scope repair does not require user approval.
- Same-cause failure with unchanged evidence stops or replans; never blind-retry through another worker, Session, Work Order, phase, or module.
- Only an explicit current-user hard limit is a hard `blocked` or `partial` stop. Carry it across Sessions, Work Orders, phases, and workers; legacy framework defaults are not user-set limits. Existing recorded hard limits remain in force.
- Keep the same Executor and Work Order identity for repairs. The Coordinator refreshes the envelope in a same-ID amendment when needed. Reviewer is strictly read-only; developer/local owner applies the fix.
Final review is a reconciliation boundary; no dedicated finalization Work Order or budget by default.

## Cleanup Contract

Do not offer cleanup routinely; archive or delete only on explicit request. Inspect expected/extra files and uncommitted changes first, fail closed on an existing archive destination, name permanent deletion exactly, verify filesystem success before removing registry entries, and authorize cleanup commits separately.

## Validation And Recovery

Validate each durable artifact transition before continuing. Retry a clearly recoverable operation error once when the cause and correction are unchanged and bounded; otherwise stop or replan. Status is best-effort and read-only. Setup may repair incomplete core context only. Propose may create missing management paths after the required packet approval or clear implementation authorization. No module silently repairs malformed or incomplete existing Track artifacts.
