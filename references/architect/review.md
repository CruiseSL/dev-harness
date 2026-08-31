# Architect Review Module

> Adapted from Architect Review in `hlhr202/swe-skills` (Apache-2.0); modified to reuse Dev Harness finding classes, bounded fixes, and explicit commit rules.

## Purpose

Review a Track, one Track unit, current changes, or an explicit revision range against durable intent and repository evidence. Review is read-only unless the Coordinator or user authorizes named findings.

## Scope

Supported scopes:

- Exact Track ID or exact unique Track description.
- Sole active Track when none is named.
- One Track unit selected by Implement.
- Explicit `current` staged and unstaged changes.
- Explicit Git revision range.

Adopt exact or high-confidence scope and announce evidence without redundant confirmation. Ask once for a fuzzy match, multiple active Tracks, or uncertain revision range. Never silently substitute current changes for a requested Track review.

## Context And Diff

For Track review, validate `references/architect/contracts.md`, then load core context, direct child style guides, selected Track artifacts, and the adopted diff.

Derive Track diff in this order:

1. Explicit user-provided revision range.
2. Recorded commit SHAs whose ancestry, sequence, and footprint match the Track.
3. One inferred coherent range anchored by Track artifacts, Track ID, metadata timestamps, and relevant commit subjects.
4. Current changes only after explicit selection or when reviewing the active unit baseline.

Record provenance as `explicit`, `recorded`, `inferred`, or `current`, with confidence `high` or `user-confirmed`. If no defensible diff exists, stop.

Review large diffs iteratively by relevant source, config, test, and documentation chunks. Chunking is not a scope expansion.

## Analysis

Apply the standard `references/review.md` order and finding classes. Add these Track checks:

- Specification and plan compliance.
- Registry, metadata, task marker, granularity, and phase-gate consistency.
- Product, tech-stack, guideline, and direct style-guide alignment.
- Missing required tests or validation evidence.
- Unexplained files, commits, or behavior outside Track scope.

Run the narrowest reliable non-interactive checks. Ask before destructive, external, credential-dependent, integration-heavy, or unusually long commands.

## Report

Return findings first, ordered by impact. Each Blocking or Relevant finding includes path, evidence, impact, and smallest correction. Use `references/review.md` classes rather than creating a second severity policy.

Include:

- Adopted scope, provenance, and confidence.
- Spec and plan compliance.
- Context and style compliance.
- Tests and validation run.
- Findings or `No findings.`
- Limitations and residual risk.
- Readiness decision.

## Fixes And Recording

- Review never authorizes edits by itself.
- Coordinator-approved Blocking fixes become bounded Work Orders and consume the active review-fix budget.
- Relevant findings require explicit approval and must not displace required fixes.
- Never fix Scope-change, Pre-existing, Out-of-scope, or Theoretical findings in the current run.
- Rerun affected checks and review the cumulative diff against original Track acceptance.

When the user explicitly requests durable recording, append or reuse a `## Phase: Review Fixes` plan section and record accepted fixes with `no-commit` or an explicitly authorized commit SHA. Recording does not itself authorize a commit.

Suggested commit messages, only after explicit commit authorization:

```text
architect(review): apply fixes for track <track_id>
architect(plan): record review fixes for track <track_id>
```

Cleanup is outside review unless explicitly requested and exactly confirmed under `references/architect/contracts.md`.

## Stop Conditions

Stop when scope remains ambiguous, Track paths or artifacts are unsafe, no reviewable diff exists, a required check cannot run, a fix exceeds reported findings or budget, worktree isolation fails, or review and authorized follow-up are complete.
