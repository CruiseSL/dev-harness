# Architect Contracts

> Adapted from Architect Skills in `hlhr202/swe-skills` (Apache-2.0) and substantially modified to centralize contracts shared by Dev Harness Architect modules.

## Authority

Apply this precedence:

1. User instructions, repository policy, host permissions, and safety rules.
2. Approved Architect product context, `spec.md`, and `plan.md`.
3. This shared lifecycle contract and the active Architect module.
4. The current Work Order and its bounded validation and review budget.

Lower levels may narrow scope but may not weaken a higher-level approval or safety boundary.

## Safe Paths

- Architect-managed writes stay under the workspace-relative `architect/` directory.
- Reject absolute paths, parent traversal (`..`), links outside `architect/`, and symlinks that resolve outside the workspace.
- Registered track links resolve only to `./tracks/<track_id>/` or `architect/tracks/<track_id>/`.
- Use reviewable edits. Do not use shell redirection for managed artifacts.
- Preserve unrelated existing work and never use broad staging such as `git add .` or `git add -A`.

## Core Context

Core is ready only when every item exists and is non-empty:

- `architect/product.md`
- `architect/product-guidelines.md`
- `architect/tech-stack.md`
- At least one direct child Markdown file in `architect/code_styleguides/`
- `architect/workflow.md`
- `architect/index.md`

`architect/index.md` links to all five context areas. Existing projects created by the upstream Architect suite remain schema version 1 and require no rewrite.

## Track Management

Management is ready when both exist:

- `architect/tracks.md`
- `architect/tracks/`

Registry entries use exactly one state marker and one safe link:

```text
---

- [ ] **Track: <description>**
  *Link: [./tracks/<track_id>/](./tracks/<track_id>/)*
```

Valid markers are `[ ]`, `[~]`, and `[x]`. A track ID matches `^[0-9]{8}_[a-z0-9_]+$` and uses `YYYYMMDD_shortname` with at most four meaningful ASCII words.

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

Allowed forward transitions are `[ ] -> [~] -> [x]`. Reopening `[x] -> [~]` requires explicit confirmation.

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
| Write or replace core context                   | Approval of the presented draft or diff                         |
| Advance a material Discuss decision             | Explicit decision or safe explicit deferral                     |
| Save or overwrite a discussion draft            | Exact relative path; overwrite requires exact confirmation      |
| Use spec for planning                           | Explicit spec approval                                          |
| Create track artifacts                          | Explicit plan approval after spec approval                      |
| Reopen completed track                          | Exact track confirmation                                        |
| Start implementation                            | Implementation intent plus Manual or Auto mode selection        |
| Apply review findings                           | Coordinator-approved Blocking finding or explicit user approval |
| Significant stack or sensitive guideline change | Explicit approval before mutation                               |
| Any Git commit                                  | Explicit commit request in the current conversation             |
| Archive or delete                               | Explicit confirmation of the exact action and path              |

Authorization is not inherited across rows. Auto Mode controls continuation and phase confirmation only; it never grants commit, cleanup, external-send, deployment, migration, or destructive permissions.

## Commit Contract

- Never infer commit authorization from setup, proposal, implementation, Auto Mode, review, `go ahead`, or `complete the track` alone.
- Stage only inspected files or hunks owned by the active Track and verify the staged diff.
- Do not create empty commits or mix unrelated changes.
- Suggested messages may be reported without committing.
- Commit failure or unsafe isolation blocks only the commit-dependent terminal state; preserve verified uncommitted work and report it accurately.

## Retry And Budget Contract

- Correct one obvious path, command, or environment mistake once when the correction is clear.
- Product or implementation re-edits consume the active Work Order corrective budget.
- Quick units allow one corrective and one review-fix cycle.
- Scoped and Track units allow two corrective and two review-fix cycles.
- Track finalization is a dedicated unit with two corrective and two review-fix cycles; it begins only after all implementation units are accepted.
- A review-fix Work Order gets one corrective cycle and does not reset the parent count.
- Creating a new Session, Work Order, phase, or module does not reset an exhausted unit budget.

## Cleanup Contract

Do not offer cleanup as a routine completion step. Run archive or delete only when the user explicitly requests it.

- Inspect and report expected files, extra files, and uncommitted changes first.
- Archive fails closed when the destination exists.
- Delete confirmation names the exact directory and states that deletion is permanent.
- Remove a registry entry only after the filesystem operation succeeds and is verified.
- Cleanup commits require separate explicit authorization.

## Validation And Recovery

Validate each durable write before continuing. Retry one clearly recoverable operation error once; otherwise stop. Status is best-effort and read-only. Setup may repair incomplete core context only. Propose may create missing management paths after approvals. No module silently repairs malformed or incomplete existing Track artifacts.
