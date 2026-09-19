# Role-based dispatch and delivery ownership — 2026-09-19

> 阶段记录：下文的提交、推送、安装及发布状态描述本阶段结束时的情况。后续正式发布状态以 [GitHub Releases](https://github.com/CruiseSL/dev-harness/releases) 为准；历史验证结果不等于新的业务效率验收。

## Accepted scope

Current user selected coordinator gpt-6-astra/medium, developer gpt-5.6-luna/xhigh and independent reviewer gpt-5.6-sol/high. Apply these in this dev-harness project; keep completed KA production untouched. The main runtime's most recent turn_context (2026-09-18T17:59:08.015Z) already reports Astra/medium. A project preference does not switch a running session.

Version 2 remains compatible for developer-only configuration. reviewerAgent is independent and never falls back to childAgent. Invalid/missing roles and named-role overrides are rejected. Codex children use default with explicit values and no inherited conversation. Review uses a distinct read-only contract; this is an instruction contract, not a new host sandbox. User models are the example/project choice, not hardcoded helper defaults.

Small owned Track work may execute locally. Substantial independent deliverables retain their developer through implementation, tests and fixes; the main session never concurrently edits that developer's files. Independent reviews are optional and scoped. Delegation gates protect requested child execution, not unrelated local work. Frozen v2.5 evaluation data is unchanged; current normative cases reflect the approved routing change.

The original hard corrective/review-cycle budgets are not changed in this scoped role/ownership update. This release does not claim all migration-retrospective recommendations are implemented or demonstrate an end-to-end speedup.

## Execution and validation

- Luna/xhigh child implemented dispatch helper, reviewer contract, configuration example and tests.
- Sol/high child independently reviews the scoped change against the pre-turn snapshot; final review result recorded below before commit.
- Full local command `node --test tests/eval/*.test.mjs`: 71/71 passed, about 8.9 seconds; no live benchmark/provider calls.
- After one review-driven amendment repair, dispatch + attestation + worker-safety targeted tests: 24/24 passed. Earlier wording assertions were updated to the new local-review input contract.
- `node tests/validate.mjs` and `git diff --check`: passed. Static regression tests retain the previous efficiency targets rather than loosening them.
- No dependency additions. Candidate committed-file credential-pattern scan found no matches; it is a best-effort scan.
- External ChatGPT Pro review was not used; no external conversation URL or context ZIP.

## Baseline and change protection

Repository: /Users/a1/Documents/生龙的 AI 产品库/dev-harness.
Branch: feat/progressive-disclosure-evals; initial HEAD: 9d88df9814e303046d7ff05e9cf42b31af2e10bb.
Baseline command: `git diff --binary HEAD -- .`; SHA-256: 76209977ed876160bc01bfdb2945bab50606e2af6f875efad5ed9cd5469b7846.
Scoped current-turn binary no-index patch (excludes this report): /private/tmp/dev-harness-roles-20260919/role-change.patch; SHA-256: 48abed489bf2d5a9205995ec6115c4392ad23e785668317208cc67ffdeebb0bc.
Before snapshot and raw local checks: /private/tmp/dev-harness-roles-20260919/.

The initial worktree contained earlier completed, uncommitted work from this conversation: conditional delivery/technical guidance, native dispatch and attestation, evaluation tools and their fixtures. These are runtime/test dependencies of the current package and are included in local closure after ownership and diff inspection. Historical evaluation reports remain separate; the existing OpenCode named-agent local file is preserved and not used by the native config. No reset/stash/delete or unrelated repository edits.

## Release boundary

This is a local source/package update and local commit under the user's standing closeout instruction. No push, merge, deployment, installation into KA Pages or global Codex model change. The KA project previously disabled dev-harness; this task does not re-enable it.

## Independent review

Sol/high accepted after one correction. It found the original envelope would become stale during persistent same-child repairs; the protocol now defines a same-ID Work Order amendment with a replacement Coordinator-captured envelope while retaining original scope, acceptance, baseline evidence and consumed budgets. Canonical/OpenCode contracts remain identical. Read-only reviewer inputs accept a local checklist instead of requiring a fabricated Executor Result. Validator success is printed only after every assertion. No remaining Blocking finding.
