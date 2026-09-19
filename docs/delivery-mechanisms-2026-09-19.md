# Delivery mechanism corrections — 2026-09-19

## Scope and intent

The user approved implementing the whole-project audit after the KA daily-report migration retrospective. This change keeps Astra/medium coordination, persistent Luna/xhigh implementation and Sol/high independent review. It corrects workflow and evaluation mechanisms in this source repository; it does not change the completed KA migration, install the package elsewhere, deploy, send messages, or change global model settings.

## Resulting behavior

- Framework repair counts are diagnostic checkpoints, not permission counters. New evidence and concrete progress allow in-scope repair to continue with the same owner. Explicit user hard limits remain hard; unchanged failures require a new diagnosis or approach.
- Work is grouped into coherent delivery batches across implementation, configuration, tests and documentation. Different check commands alone do not require a new child. Meaningful ownership, authorization, rollout and rollback boundaries remain separate.
- Existing repository context may satisfy Architect readiness without duplicating six context files. Clear implementation authorization covers routine planning records and implementation. When a decision is needed, present a concrete spec/plan packet. Manual pauses are respected; authorized implementation otherwise continues automatically.
- Review remains read-only. The original developer applies accepted fixes. Final reconciliation reuses valid evidence and includes requested business acceptance and Git closure; a passed local test is not live delivery.
- Attestation includes explicitly declared ignored files. Declared directories include their descendants; choose narrow input paths to avoid hashing unrelated caches. Scope symlinks are rejected: declare the real in-worktree input instead of representing its contents by link text. Schema version 2 remains readable, but pre-change envelopes need a new Coordinator capture because the scope fingerprint now covers more inputs.
- Live input-cost evaluation has bounded subprocess execution and incremental recovery records. It retains completed samples across interruptions and refuses silent replay of an unresolved potentially paid invocation. It remains a fixed-output OpenCode microbenchmark, not a Codex delivery-speed test.

## Evaluation changes

The throughput simulator now separates execution ownership from the Track label and counts independent review after local implementation. Merge decisions retain compatible approved outcome/owner/rollout boundaries while accepting complementary files and checks. Repair scenarios distinguish progress checkpoints, blind repetition, and user hard limits.

The static manifest adds candidate-only local Track, native Executor and independent Reviewer routes. Their byte totals have no equivalent frozen v2.5 comparison. Existing frozen baseline files and efficiency thresholds are preserved. Static core coverage increases from 18 to 21 cases.

The optional scheduled-report exercise enters through the actual local handler, including nonzero seconds, source aggregation, dry run, deduplication and failed-send bookkeeping. All external services are injected local fakes. It tests a coherent implementation batch, not every Track lifecycle transition or real cloud operation. See [delivery-evaluation.md](./delivery-evaluation.md).

Delivery observations now support human interventions, model responses and uncached input/output tokens. Comparisons require observed developer/reviewer model settings or an explicit unused-role marker. Missing measurements remain unavailable; they are never replaced with zero or converted into billing claims.

## Validation and closure

- `node --test tests/eval/*.test.mjs`: 81 tests passed, zero failures (11.04 seconds).
- `node tests/validate.mjs`: passed.
- `node tests/eval/run-layered.mjs --json`: 21/21 static core cases passed, no candidate failures, dry run only; no provider calls executed.
- `node tests/eval/run-static.mjs --compare v2.5 --json`: no frozen-baseline differences or candidate failures. The frozen baseline and original safety/normative fixtures are unchanged.
- `git diff --check`: passed. The changed-file credential-pattern scan found no matching private-key or common access-token patterns.
- Sol/high independent review accepted the change after the original owners corrected three findings: scope symlink handling, action-specific external authorization, and independent checking of the exercise's handoff evidence labels. No Blocking finding remains.
- The original audit reproduction now detects ignored-input changes, permits local Track execution without a forced child, and counts independent review after local implementation.

The reviewed tracked patch is identified by `git diff --binary HEAD -- .` against the initial HEAD below, SHA-256 `02339b323c6174cb7b92b825b4c5ec2f06d4890727f799a550603ca9ad825701`. This hash excludes this new maintenance record to avoid a self-referential digest. Local commit scope is the 52 reviewed tracked files plus this record; the pre-existing untracked files remain outside it. No push, downstream installation, deployment, or paid live evaluation is included.

## Baseline and ownership

- Repository: `/Users/a1/Documents/生龙的 AI 产品库/dev-harness`.
- Branch: `feat/progressive-disclosure-evals`; initial HEAD: `12d2fef5fb6a408583eb95342942879e8b6344b1`.
- Baseline command: `git diff --binary HEAD -- .`; SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (no tracked baseline changes).
- Pre-existing untracked `.opencode/` and historical reports under `docs/` remain outside this change. No broad staging, reset, stash or cleanup is used.
- Local baseline and check evidence: `/private/tmp/dev-harness-mechanisms-20260919/`.
- External ChatGPT Pro review was not used; the user-selected Sol role provides independent local review. There is no external conversation URL or context ZIP.

## Remaining acceptance boundary

Passing the local regression suite establishes the implemented rules and tested script behavior. It does not prove how much time or token usage a complete business requirement will save. A representative authorized task with recorded role settings and the requested target-environment evidence is still needed before claiming stable throughput improvement. No production-readiness or percentage-speedup claim is made by this maintenance change.
