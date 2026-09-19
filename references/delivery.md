# Delivery Convergence

Load this protocol when checks repeat, review expands, or a time/phase checkpoint is reached. Extend the existing checklist and evidence only with missing information; do not reconstruct a new ledger or re-read already loaded protocol. Use the existing plan or execution record for Track. This protocol is Coordinator guidance, not a host-enforced sandbox or automatic timer.

## Plan The Finish

Retain outcome, acceptance, required checks and their triggers, original start time if available, planned units, and user-set hard limits across units and fixes. Add the next checkpoint only if work remains. Do not ask the user to approve routine bookkeeping. Existing implementation authorization covers in-scope fixes and checks; separate approval remains necessary for consequential operations and material scope changes.

Quick has one execution pass and one local review; Scoped also defaults to one pass. A Track plan groups work by coherent deliverable outcome rather than one task per file, test, or documentation update. One batch may include configuration/runtime, tests, documentation, and repairs when its acceptance union remains within scope, one owner has no active collision, and authorization, rollout, and rollback boundaries are compatible. Different filenames or check commands do not force a split. Changing the grouping of an already approved plan must not silently change its acceptance or reset an explicit user hard limit.

The default checkpoints are 15 minutes for Quick and 45 minutes for Scoped. Track names a checkpoint for each phase. At a checkpoint summarize elapsed time, first implementation completion if reached, unresolved acceptance, and the smallest remaining path. Continue within authorization when progress is concrete. If progress needs a missing capability, user decision, repeated same-cause failure, or an exhausted explicit user hard limit, return partial/blocked with useful evidence. Do not manufacture a blocker merely because a soft checkpoint elapsed.

## Admit A Check

Before a new investigation, test, or review expansion identify:

- The unmet acceptance criterion or concrete regression introduced by this change.
- The missing evidence and decision the result could change.
- The narrowest check and its stopping condition.

Required repository checks remain required. A phase or final gate names its acceptance and missing evidence; the label alone is not a reason to repeat a broad suite. Optional improvements cannot be promoted into acceptance after implementation starts.

Reuse a passed check only when command, scope, relevant source/tests/configuration, dependency/runtime inputs, and applicable environment still match. For nondeterministic or external state, record a validity window or require fresh evidence. When dependencies are uncertain, run the smallest check that resolves that uncertainty; do not invent a complete dependency graph. Fingerprinting applies to inputs that can change the result, not unrelated repository edits.

Repeated failure with the same cause and unchanged evidence is not progress. Stop or replan; do not retry it through another child or Work Order. Repair counts are soft diagnostic checkpoints: after one Quick or two Scoped/Track cycles, reassess cause, evidence, and method and continue already-authorized work when meaningful progress or new evidence exists. Only an explicit current-user hard limit is a hard stop, and it carries across Sessions, Work Orders, phases, and workers. Legacy framework defaults are not user-set limits.

## Accept And Stop

Accept only when required criteria, requested-tier evidence, and checks pass and the applicable review has no Blocking finding. Production and migration specs must name the requested completion tier, target environment, and minimum normal path; validate the target-runtime thin path early when authorized. Missing authorized live evidence makes only the dependent completion `partial` or `blocked`; it does not turn every small task into a production test. At phase/final review, reconcile the original acceptance with accumulated evidence; execute only missing or invalidated checks. A real regression may reopen affected work with its existing repair ledger. A new independent concern is a follow-up, not an automatic repair.

Report request elapsed time, first implementation completion, validation executions/reuses, broad checks, children, review-fix cycles, and outstanding acceptance. Mark unavailable measurements as unavailable. Do not spend more time reconstructing telemetry than delivering the change.
