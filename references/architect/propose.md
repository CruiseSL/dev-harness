# Architect Propose Module

> Adapted from Architect Propose in `hlhr202/swe-skills` (Apache-2.0); modified for automatic routing, centralized artifact contracts, and proportional interaction.

## Purpose

Turn one stable initiative into an approved and registered Track. Propose creates durable artifacts only after separate specification and plan approvals; it does not implement them.

## Preconditions

- Core context satisfies `references/architect/contracts.md`.
- Scope is proposal-sized and has no unresolved direction-changing decision. Otherwise route to `references/architect/discuss.md`.
- A collision-free Track ID can be generated.

Missing `architect/tracks.md` or `architect/tracks/` is recoverable after approvals. Missing or malformed core context is not.

## State Model

```text
context_ready
  -> spec_draft
  -> spec_approved
  -> granularity_selected
  -> plan_draft
  -> plan_approved
  -> track_created
  -> registered
```

No management write occurs before `plan_approved`.

## Description And Type

Use the confirmed description from the request or Discuss synthesis. Ask one focused question only when the description is too generic to produce acceptance criteria.

Infer type unless it materially changes planning: `feature`, `bug`, `chore`, `refactor`, `docs`, or `test`; default to `feature` when no stronger evidence exists.

## Specification

Draft from approved context using `templates/architect/spec.md`. Ask only about scope, behavior, constraints, validation, or definition of done that remains materially unknown.

Present the full draft and request explicit `Approve` or `Revise`. Revise the full draft until approved. Spec approval authorizes planning only.

## Plan

Select status granularity automatically and announce it with the draft:

- `task`: default when parent tasks are independently reviewable and can be completed in one bounded Work Order each.
- `sub-task`: use when a parent necessarily spans multiple sessions, owners, risky checkpoints, or independently verifiable units.

The user may correct the selection during plan review; do not ask a separate granularity question when evidence is clear.

Draft from the approved spec, `architect/workflow.md`, `templates/architect/plan.md`, and repository validation conventions.

- Parent tasks use `- [ ] Task: ...`.
- Follow the selected grammar in `references/architect/contracts.md`.
- Keep each status-managed unit suitable for one Work Order.
- Put tests before behavior changes when that is the repository pattern or meaningfully reduces risk.
- End each phase with an Architect phase verification task when the delivery policy defines phase gates.

Present the complete plan and request explicit `Approve` or `Revise`. Plan approval authorizes only the listed Track artifacts and registry updates.

## Track Creation

After both approvals:

1. Generate `YYYYMMDD_shortname` and run full-ID, short-name, directory, and registry collision checks.
2. Create missing management paths from `templates/architect/tracks.md` and add `templates/architect/management-section.md` to `architect/index.md` when absent.
3. Create `architect/tracks/<track_id>/` from the approved spec and plan plus `templates/architect/metadata.md` and the Track index template.
4. Write the fenced JSON as `metadata.json` without the fence, set status to `new`, timestamps to current UTC, and `schema_version` to `1`.
5. Append exactly one pending registry entry from `templates/architect/registry-entry.md`.
6. Validate artifact presence, ID consistency, safe links, and registry uniqueness.

Do not inspect unrelated Tracks for completeness or block an independent proposal because another Track is unfinished. Active Track conflicts may affect later implementation, not creation.

## Continuation

Report created and updated files. If the originating intent included implementation, route to `references/architect/implement.md`; it will confirm the exact Track and implementation mode. Otherwise stop with the Track ready.

No commit occurs without an explicit commit request. Suggested message:

```text
architect(propose): add track <track_id>
```

## Stop Conditions

Stop without partial Track creation when core context is incomplete, scope cannot support a stable spec or plan, either approval is rejected, a path or link is unsafe, a collision exists, or an operation fails after one clear correction.
