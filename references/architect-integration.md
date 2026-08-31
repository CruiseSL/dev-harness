# Architect Integration Protocol

## Purpose

Use Architect only for durable, multi-slice, high-risk work while keeping each implementation handoff small and bounded.

## Authority Boundary

When Architect context is active:

1. Approved `spec.md` defines durable outcome and non-goals.
2. Approved `plan.md` defines ordered implementation scope and lifecycle.
3. Architect workflow and status rules own track state, documentation synchronization, approvals, commits, and cleanup.
4. Dev Harness owns delegation shape, self-contained Work Orders, minimal implementation, validation budget, finding classification, and per-slice stop conditions unless they conflict with Architect.

Architect wins for durable scope, approvals, lifecycle state, commits, and cleanup. The selected implementation controller owns execution continuation and budgets. Do not duplicate or independently rewrite Architect status in Dev Harness documents.

## Implementation Controller

Choose exactly one controller before implementation:

- **Dev Harness controlled:** The Coordinator dispatches one approved plan slice at a time, applies Dev Harness budgets and review gates, and synchronizes slice status through the Architect lifecycle rules. Do not start an autonomous `architect-implement` run concurrently.
- **Architect controlled:** Hand the full track to `architect-implement`. Its Manual or Auto continuation, verification, and fix budgets apply; Dev Harness may provide minimal-implementation guidance but must not claim per-slice budget control.

Do not mix controllers in one active implementation run. `architect-implement` Auto Mode is a whole-track controller and cannot be used as the Executor for one bounded Work Order. If the runtime cannot support the selected controller, stop as `blocked` and ask the Coordinator to choose the available mode.

## Track Shape

Create one Track for one durable initiative. Do not create a Track for every implementation slice.

For implementation:

- Map each Work Order to one coherent approved plan task or tightly related task group.
- Include the relevant spec acceptance criteria and plan references in the Work Order.
- Keep each slice independently reviewable and verifiable.
- Synchronize plan and track state through the selected controller and Architect lifecycle rules.
- Do not let an Executor edit Architect artifacts unless the Work Order explicitly assigns that responsibility under the active Architect protocol.

Use Architect review for final Track readiness. Dev Harness review may still gate an individual slice before the next plan task begins.

## Entry and Exit

Enter Track mode only for the criteria in `classification.md`. If Architect is installed but core context or an approved track is missing, stop and route through the applicable Architect setup, discussion, or proposal workflow. Do not invent partial track artifacts.

If Architect is unavailable, report that durable Track management is unavailable and ask whether to:

- Continue as explicitly bounded Scoped Work Orders with no durable Track state.
- Pause until a compatible project-context workflow is installed.

Do not silently downgrade migration, security, data-integrity, public-contract, or irreversible work to Scoped.

A Track may finish through multiple Work Orders. A Work Order finishing does not mean the Track is complete. Track completion remains subject to its approved plan, final verification, documentation, and review protocol.

When an accepted diagnostic slice reveals a product or data decision needed by a later slice, accept the diagnostic Work Order, leave the Track `in_progress`, and stop before dispatching the dependent slice. This consumes no review-fix cycle. If the current slice itself requires the missing decision to satisfy acceptance, return the current Work Order as `blocked` instead.

## Documentation Discipline

Persist only information with future value:

- Architect: product constraints, architecture decisions, public contracts, approved plans, milestones, and unresolved durable risks.
- Work Order: current slice scope, acceptance, validation, and handoff evidence. Keep it in session context unless persistence is required for a cross-session handoff, audit, or user request.
- Review: unresolved Blocking or explicitly deferred Relevant findings. Do not create a permanent ledger of theoretical observations.

This prevents documentation maintenance from becoming another form of over-development.
