# Architect Status Module

> Adapted from Architect Status in `hlhr202/swe-skills` (Apache-2.0); modified to use centralized artifact contracts and Dev Harness routing.

## Purpose

Report durable project status, progress, next action, blockers, and artifact integrity without changing any file.

## Hard Boundary

Status is strictly read-only. Never create, repair, edit, move, delete, archive, commit, or convert a report into an implementation action.

## Artifact States

| State                | Evidence                                                             | Result                                                |
| -------------------- | -------------------------------------------------------------------- | ----------------------------------------------------- |
| `not_initialized`    | Any core criterion in `references/architect/contracts.md` is missing | Report incomplete core and next Setup artifact        |
| `core_ready`         | Core ready; neither management artifact exists                       | Report ready for Discuss or Propose                   |
| `partial_management` | Exactly one management artifact exists                               | `Needs Attention`; parse only safe available evidence |
| `tracked`            | Registry and Track directory exist                                   | Parse safe Tracks                                     |

Status reports malformed entries and continues with other safe entries. Mutating modules fail closed on the same defects.

## Parsing

1. Parse registry sections using `references/architect/contracts.md`; report duplicates, invalid IDs, missing fields, and unsafe links.
2. For each safe Track, read `plan.md` and `metadata.json` when present.
3. Validate registry-marker and metadata alignment.
4. Resolve plan granularity; absent means legacy `sub-task`, invalid values are reported and counted best-effort as `sub-task`.
5. Count task units using the central plan grammar without double-counting parents and sub-tasks.
6. Compute completion as `completed / total * 100`; use `0%` with explanation when total is zero.

## Status Precedence

Apply the first matching state:

1. `Needs Attention`: malformed, duplicate, unsafe, missing, or inconsistent artifacts; multiple active Tracks; invalid plan grammar.
2. `Blocked`: an explicit active blocker exists.
3. `Complete`: every safe parsed Track and counted unit is complete.
4. `In Progress`: any Track or counted unit is active, or complete and pending units coexist.
5. `Not Started`: no counted unit is active or complete.

Treat explicit `[BLOCKED]`, `Blocked:`, or `Blocker:` markers as active blockers. Incidental prose containing those words is only a note.

## Current And Next

- Current Track is the sole registry-active Track, otherwise the first safe Track containing active work.
- Current phase and task are the phase and first active counted unit.
- For `task`, next is the first active parent, otherwise first pending parent.
- For `sub-task`, next is the first active sub-task, then pending sub-task under active parent, then active parent awaiting completion, then first pending counted unit.
- Multiple active Tracks produce `Needs Attention`, not an arbitrary choice.

## Output

```markdown
# Architect Status

## Summary

- **Project Status**: <Needs Attention|Blocked|Complete|In Progress|Not Started>
- **Progress**: <completed>/<total> units (<percentage>%)
- **Tracks**: <completed>/<total> completed, <active> active, <pending> pending
- **Granularity**: <task|sub-task|mixed>

## Current Work

- **Track**: <track or none>
- **Phase**: <phase or none>
- **Unit**: <unit or none>

## Next Action

- <next action>

## Blockers

- <blockers or None detected>

## Track Details

- `<marker>` <track_id>: <description> - <completed>/<total> (<percentage>%); <granularity>

## Integrity Notes

- <issues or None>
```

Stop after the report. A later repair request returns to `references/architect/router.md` as a separate authorized action.
