# Measure Delivery, Not Only Protocol Input

The existing `run-live.mjs` / `run-layered.mjs --execute` runs are fixed-output input-cost microbenchmarks. They prohibit implementation and tool calls. Static text checks establish that rules are present, and throughput simulations check example decisions. Neither proves that an agent finishes real tasks faster or follows a safety boundary in practice.

## Three Bounded Exercises

`node tests/eval/run-delivery.mjs` lists the plan without invoking a model:

- Quick label correction, one owned source file.
- Scoped CLI dry run, parser plus service, injected local sender only.
- Bounded pagination behavior, supported inputs only.

Each exercise has the same request and independent acceptance probe for baseline and candidate. Fixtures contain a visible focused test and an unrelated user note that must survive. The baseline is immutable public v2.5; candidate is the current package. This is a local delivery pilot, not Track lifecycle acceptance or a comprehensive security suite.

## Optional Review Continuation

The exported `prepareDelivery` API also accepts `caseIds: ["review-closure"]`, with the same caller-selected baseline/candidate sources. This optional case leaves the default three-case benchmark and its comparison requirements unchanged.

The implementation already passes. Preparation actually executes `node test.mjs`, then records its result, runtime, and source/test SHA-256 fingerprints in `validation-evidence.json` before timing. The request asks the agent to evaluate review suggestions about unsupported inputs and an additional full audit against the original acceptance. Good closure checks evidence validity, accepts the supported behavior, and avoids unrelated edits or redundant checks. A fresh check is appropriate if the agent identifies a real evidence gap; do not score every rerun as wrong automatically.

Record protocol reads, evidence reuse, test executions, edits, and the final decision from the host transcript. The independent evaluator probe runs after the session and is not counted as agent validation. This tests review expansion and closure, not elapsed 15/45-minute checkpoints or multi-hour task behavior. A subset run cannot use the default full-suite comparison to claim a speedup.

## Run With The Actual Agent Host

1. Prepare a **new** directory outside the source package:

   `node tests/eval/run-delivery.mjs prepare /private/tmp/dev-harness-delivery-pilot-1`

   This creates six isolated Git fixtures and baseline commits inside them only. It does not commit the source repository, invoke a provider, or start an agent.

2. Open a fresh host session in each fixture. Use identical host/model/reasoning settings and applicable global rules. Confirm the project-local skill is loaded; record the observed settings and host version with the session evidence. Alternate baseline/candidate order between exercises; reverse order in a second repetition. Do not reuse a solution-bearing conversation.

3. Immediately before dispatch, start the timer:

   `node tests/eval/run-delivery.mjs start /private/tmp/dev-harness-delivery-pilot-1 baseline-quick-label`

   Use its returned workspace and prompt. `start` rejects already-edited fixtures and duplicate starts. Run the actual coding task through the host. Do not ask for a fixed terminal JSON response. The caller retains control over provider spend and permissions.

4. At the first complete implementation, note its timestamp from the session if available. After the host finishes, record observations outside the fixture:

   ```json
   {
     "terminalState": "accepted",
     "runtime": null,
     "firstImplementationAt": null,
     "childDispatchCount": null,
     "reviewerDispatchCount": null,
     "validationExecutionCount": null,
     "validationReuseCount": null,
     "broadCheckCount": null,
     "reviewFixCount": null,
     "externalPollCount": null
   }
   ```

   Replace values only with observed evidence. Record `runtime` as an object with observed `host` (including version), `model`, and `reasoning` strings. Missing or mismatched runtime settings prevent speed comparison. `accepted` means the host actually concluded acceptance; preserve blocked/partial/cancelled outcomes. Null is unavailable, not zero. Count tool-level validations from the transcript, not model claims; repeated validation is another execution, while evidence reuse is not.

   For speed comparison also record both `runtime.roles.executor` and `runtime.roles.reviewer`, each with observed `model` and `reasoning`, or explicitly null when unused. Missing role evidence or a role mismatch prevents comparison; historical observations remain readable. Optional observations `humanInterventionCount`, `modelResponseCount`, `noncachedInputTokens`, and `outputTokens` must come from session evidence; leave them null when unavailable. Sum across the participating sessions without double-counting cached input or cumulative usage snapshots. These are observed token counts, not billing estimates.

5. Immediately assess the result:

   `node tests/eval/run-delivery.mjs assess /private/tmp/dev-harness-delivery-pilot-1 baseline-quick-label /private/tmp/observations.json`

   The evaluator runs its own acceptance probe with a five-second timeout and compares file fingerprints against the original fixture. Editing the visible test cannot change the independent probe. A scope violation or unfinished task prevents completed acceptance. Receipts cannot be overwritten; use a fresh prepared directory for another run.

6. After all six runs:

   `node tests/eval/run-delivery.mjs compare /private/tmp/dev-harness-delivery-pilot-1`

   The report includes completion rate for **all** attempts. A paired speed comparison is eligible only when every case has exactly one accepted, independently passing baseline and candidate result. A faster blocked task never becomes a speedup. Repeat matched pilots before claiming a stable improvement; do not infer production savings from six samples.

## Evidence Limits And Next Decision

Elapsed time is measured between CLI start and assessment and includes operator delay. First-implementation time and counts are caller-supplied observations, not enforced by the host or evaluator. Independent probes establish only the specified fixture behavior and final file scope; they do not prove absence of transient or external actions. Keep the original host transcript for interpretation. No provider tokens are invented when the host does not report them.

The primary question is whether a completed task spends less time after its first implementation, with fewer repeated checks and unnecessary children. If completion or behavior regresses, diagnose the affected case before changing budgets. Add a new case only for a demonstrated gap that changes a delivery decision.

## Track Runtime Maintenance Check

Exercise these paths when Track routing changes: an authorized implementation uses Auto unless Manual or a pause was already selected; a substantive earlier phase gate blocks dependent work; Manual waits at the agreed gate; final review failure preserves in-progress state; successful final reconciliation marks registry/metadata consistently. Include changed-evidence repairs beyond two cycles, an explicit user hard limit, one persistent developer batch covering different files/checks, and local implementation with independent review. Static assertions of these instructions are documentation checks, not real-host behavior evidence.

## Optional Scheduled-Report Delivery Batch

`node tests/eval/run-delivery.mjs prepare-batch /private/tmp/dev-harness-scheduled-pilot-1` prepares a baseline and candidate fixture without invoking any provider. The API also accepts `caseIds: ["scheduled-report-batch"]` and caller-selected source revisions; use the pre-change commit when isolating a particular workflow change rather than attributing all differences from v2.5 to it.

This exercise joins configuration, data aggregation, the scheduled entrypoint, and handoff documentation in one owned batch. The independent probe enters through `scheduled()` using a timestamp with nonzero seconds, reads an injected source, checks the report, dry run, duplicate delivery and failed-send bookkeeping. All sends are local fakes. It catches the normal-entrypoint mismatch seen in the migration retrospective without creating a general boundary-test project.

Use `start` and `assess` as above, and preserve the same developer through fixes. Record actual handoffs, review and user interventions. This is an implementation-batch exercise: it does not exercise every Architect lifecycle transition, real credentials, Cloudflare deployment, natural Cron wake-up, source permissions, or recipient delivery. The default three-case `compare` deliberately refuses to infer a speedup from this optional subset. Compare observed batch outcomes descriptively and report this limitation.

Before claiming that the workflow fixes the original multi-day migration problem, run a representative authorized product task with the requested Astra / Luna / Sol settings. Predeclare its business completion tier and target-runtime evidence, verify the normal path early, and report total elapsed time, interventions, validation reuse, model responses, and uncached input/output across all agents. Do not substitute a faster fixed-output benchmark, fewer checklist rows, or this local fixture for that evidence.

## Recoverable Input-Cost Runs

Both `run-live.mjs` and `run-layered.mjs` still default to a dry run. Actual execution requires `--execute --journal <path>`; it fails before provider work if the journal is missing. These are optional OpenCode benchmarks, separate from native Codex role configuration. Supply the model and effort actually configured for that provider rather than assuming the historical CLI defaults match your host.

For an explicitly chosen provider, a single-route invocation looks like:

```sh
node tests/eval/run-live.mjs --execute --model '<provider/model>' --variant '<effort>' --journal /private/tmp/harness-live/run.json --output /private/tmp/harness-live/result.json --json
```

Use the same arguments plus `--resume` to reuse recorded samples and continue unstarted calls. Recovery requires matching protocol contents, route, invocation order, model, effort and execution bounds. A completed failed sample remains a failure; recovery does not erase it or silently pay to retry it. An unresolved `inFlight` record means the last call's outcome is unknown and automatic replay is refused. Retain that evidence and inspect the interrupted invocation before deciding on a new run; do not delete the record to force recovery.

`--timeout-ms` defaults to 120000 and `--max-output-bytes` to 4194304 per stream. SIGINT/SIGTERM request cancellation, with bounded escalation and pipe cleanup. The journal preserves per-call evidence; `--output` is a separate final summary and must not overwrite it.

For a layered run, use a distinct base such as `--journal /private/tmp/harness-layered/run.json`. Before any provider calls, the tool creates the batch identity at `run.json.batch.json` and one `run.json.<route>.json` per route. Keep the whole set. The same invocation plus `--resume` can continue after an early-route cancellation without losing the later unstarted routes; a missing declared journal is an error. Changed protocol contents require a new experiment rather than mixing incompatible samples.
