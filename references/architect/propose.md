# Architect Propose Module

> Adapted from Architect Propose in `hlhr202/swe-skills` (Apache-2.0); modified for automatic routing, centralized artifact contracts, and proportional interaction.

## Purpose

Turn one stable initiative into an approved and registered Track. Propose keeps `spec.md` and `plan.md` as separate schema-v1 artifacts, while presenting them with continuation mode in one concrete packet whenever approval is needed; it does not implement them.

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

No management write occurs before the combined packet is approved when approval is required. Clear implementation authorization may satisfy `plan_approved` for routine in-scope plan, registry, and metadata writes.

## Description And Type

Use the confirmed description from the request or Discuss synthesis. Ask one focused question only when the description is too generic to produce acceptance criteria.

Infer type unless it materially changes planning: `feature`, `bug`, `chore`, `refactor`, `docs`, or `test`; default to `feature` when no stronger evidence exists.

## Specification

Draft from approved context using `templates/architect/spec.md`. Ask only about scope, behavior, constraints, validation, or definition of done that remains materially unknown.

Carry established technical recommendations, constraints, and decision-specific evidence from Discuss into the spec. If a material technical choice remains unresolved, use `references/technical-quality.md` through the existing Discuss route. Do not invent a new decision record or reopen an approved choice without new contradictory evidence.

When approval is needed, present the full spec, plan outline, and continuation mode in one concrete packet and request `Approve` or `Revise`; revise until accepted. Keep spec and plan records distinct. Planning-only approval authorizes planning and Track records, not implementation. A clear implementation request with no unresolved material product choice covers routine in-scope records and implementation; it does not authorize consequential operations.

## Plan

Select status granularity automatically and announce it with the draft:

- `task`: default when parent tasks are independently reviewable and can be completed in one bounded Work Order each.
- `sub-task`: use when a parent necessarily spans multiple sessions, owners, risky checkpoints, or independently verifiable units.

The user may correct the selection during plan review; do not ask a separate granularity question when evidence is clear.

Draft from the approved spec, `architect/workflow.md`, `templates/architect/plan.md`, and repository validation conventions.

- Parent tasks use `- [ ] Task: ...`.
- Follow the selected grammar in `references/architect/contracts.md`.
- Group status-managed units by coherent outcome. A Work Order may cover adjacent units across configuration/runtime, tests, and documentation when the acceptance union remains within scope, one owner has no active collision, and authorization, rollout, and rollback boundaries are compatible.
- Put tests before behavior changes when that is the repository pattern or meaningfully reduces risk.
- End each phase with an Architect phase verification task when the delivery policy defines phase gates.

When approval is needed, present the complete plan with the spec and continuation mode and request `Approve` or `Revise`. Plan approval authorizes only the listed Track artifacts and registry updates; implementation remains limited to a clear implementation request or a later explicit authorization.

## Track Creation

After the required packet approval, or after clear implementation authorization covers routine Track records:

1. Generate `YYYYMMDD_shortname` and run full-ID, short-name, directory, and registry collision checks.
2. Create missing management paths from `templates/architect/tracks.md` and add `templates/architect/management-section.md` to `architect/index.md` when absent.
3. Create `architect/tracks/<track_id>/` from the approved spec and plan plus `templates/architect/metadata.md` and the Track index template.
4. Write the fenced JSON as `metadata.json` without the fence, set status to `new`, timestamps to current UTC, and `schema_version` to `1`.
5. Append exactly one pending registry entry from `templates/architect/registry-entry.md`.
6. Validate artifact presence, ID consistency, safe links, and registry uniqueness.

Do not inspect unrelated Tracks for completeness or block an independent proposal because another Track is unfinished. Active Track conflicts may affect later implementation, not creation.

## Continuation

Report created and updated files. If the originating intent included implementation, route through `references/track-gate.md` to `references/architect/track-runtime.md`; use Auto by default unless the user chose Manual or a mandated pause applies. Otherwise stop with the Track ready. Planning-only requests must stop before implementation.

No commit occurs without an explicit commit request. Suggested message:

```text
architect(propose): add track <track_id>
```

## Stop Conditions

Stop without partial Track creation when core context is incomplete, scope cannot support a stable spec or plan, either approval is rejected, a path or link is unsafe, a collision exists, or an operation fails after one clear correction.
