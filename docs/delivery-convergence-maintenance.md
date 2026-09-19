# Delivery Convergence Maintenance — 2026-09-07

> 历史记录：本文描述 2026-09-07／08 当时的实现、方案和实验，不代表当前状态。文中的“未提交”、模型配置、修复次数与验收门槛按当时语境保留；当前收口状态见 [开发收口记录](development-closure-2026-09-19.md)。旧方案不作为新的执行指令。

## Outcome

Added request-level progress checkpoints, decision-based check admission and cross-phase evidence reuse. Completed the compact Track lifecycle and unified Propose routing. Added three real-edit exercises with independent acceptance probes and observed delivery timing. Fixed the input-cost evaluator so failed efficiency does not return completed. Reported later Track review/final protocol bytes separately from initial loading.

No commit, push, publication, consumer upgrade, external message, or paid model evaluation was performed. Existing user changes were preserved. External review was not performed (local Skill maintenance). The host does not expose a verified main-session model/effort in this execution record; no assumed profile is reported.

## Baseline And Patch

- Repository: `/Users/a1/Documents/生龙的 AI 产品库/dev-harness`
- Branch: `feat/progressive-disclosure-evals`
- HEAD: `9d88df9814e303046d7ff05e9cf42b31af2e10bb`
- Pre-edit staged diff: empty; 13 modified tracked files plus existing untracked candidate files.
- Baseline diff command: `git diff --binary HEAD -- .`
- Baseline diff SHA-256: `ff6adda9ff72e20be80a6070d848f5e400917ab2e0839ed94c4167b55f6d0978`
- Pre-edit source snapshot: `/private/tmp/dev-harness-delivery-baseline/source` (includes relevant untracked source; excludes host config and dependencies).
- Current-turn source patch: `/private/tmp/dev-harness-delivery-baseline/current-turn.patch`
- Current-turn patch SHA-256: `0743b7a3d2a2443593f563cfd4dbb3047118c09ea445e658dc11bbffd28fdce6` (excludes this report).
- Recorded at: `2026-09-07T07:51:58.070121+00:00`

## Validation

- `node tests/validate.mjs`: passed.
- Initial `node --test tests/eval/*.test.mjs`: 56/58 passed. Two failures were the same static byte-budget excess; wording was shortened without changing thresholds.
- After correction: `node --test tests/eval/delivery.test.mjs tests/eval/convergence.test.mjs tests/eval/layered.test.mjs tests/eval/static.test.mjs`: 22/22 passed.
- After final delivery receipt and efficiency-status changes: `node --test tests/eval/delivery.test.mjs tests/eval/layered.test.mjs`: 10/10 passed, including the new efficiency-status regression.
- `node tests/eval/run-static.mjs --compare v2.5`: passed existing initial-stage budgets and static invariants.
- `node tests/eval/run-layered.mjs`: static 18/18 passed, dry run only.
- `git diff --check`: passed.
- The delivery tests execute real local fixture probes with deterministic test solutions and synthetic timestamps. These are evaluator tests, not measurements of an agent completing the exercises.

## Measurements And Limits

- Quick/Scoped initial protocol: 19,864 B (public baseline 38,146 B for the matching ordinary routes).
- Track initial protocol: 41,076 B; declared later review/final stages bring it to 51,552 B. The old 36,736 B figure omitted later stages and is not an equivalent complete-flow cost.
- These values are declared UTF-8 bytes, not provider tokens, observed loading, or measured task latency. Existing efficiency gates apply to initial declarations; they do not establish full-delivery savings.
- Checkpoints and validation budgets remain Coordinator instructions, not host-enforced controls. No live speedup or Track behavioral equivalence is claimed.
- Runtime/model metadata and process counts in delivery reports come from observed caller-supplied evidence; independent probes establish fixture acceptance and final file scope only.
- Three-case entry point and instructions: `docs/delivery-evaluation.md`. Real paired agent runs remain unexecuted. Fixed-output live results are explicitly not delivery or release evidence.

## Changed Source Files

- `README.md`
- `SKILL.md`
- `docs/delivery-evaluation.md`
- `references/architect/implement.md`
- `references/architect/propose.md`
- `references/architect/track-runtime.md`
- `references/delivery.md`
- `references/execution.md`
- `references/review.md`
- `references/route-manifest.json`
- `templates/result.md`
- `templates/work-order.md`
- `tests/eval/convergence.test.mjs`
- `tests/eval/delivery.mjs`
- `tests/eval/delivery.test.mjs`
- `tests/eval/evaluation-contract.mjs`
- `tests/eval/layered.mjs`
- `tests/eval/layered.test.mjs`
- `tests/eval/live.mjs`
- `tests/eval/report.mjs`
- `tests/eval/run-delivery.mjs`
- `tests/eval/run-layered.mjs`
- `tests/eval/score.mjs`
- `tests/eval/static.test.mjs`
- `tests/validate.mjs`
