# Orchestration Protocol

## Purpose

Define Dev Harness coordination, implementation, and review roles while remaining portable across runtimes with different Session, Subagent, and model-selection capabilities.

## Roles

- **Coordinator:** Clarifies the outcome, classifies work, writes the Work Order, selects capabilities, reviews results, approves fixes, and owns the final answer.
- **Executor:** Implements one Work Order and returns evidence. It does not own requirements or process escalation.
- **Reviewer:** Compares the Work Order, diff, and validation evidence. It reports findings but does not edit without a new approved Work Order.

The Coordinator may also act as Reviewer. Prefer role separation over spawning another reviewer for Quick work.

## Capability Discovery

On Codex, use `references/codex-dispatch.md` when native explicit model/effort selection is available and no custom Agent is configured. Its canonical contract supplies execution rules; do not add a second role preset.

Before dispatch, inspect the runtime's available tools. Delegation is valid only when both the child model and reasoning depth are explicit, either as dispatch parameters or as immutable settings on a selected named host Agent. Current-Session execution is also permitted for small bounded Track units. Apply the Track Delegation Gate only when selecting child execution.

1. **Persistent Session with model and reasoning selection:** Create or reuse a worker Session with the resolved settings, send the Work Order, and retrieve its terminal result.
2. **Subagent with model and reasoning selection:** Spawn one bounded Executor with the resolved settings and wait for its result.
3. **Named host Agent with pinned settings:** Select the configured Agent by name only after verifying its host definition pins the exact project model and reasoning or variant value. This is explicit selection even when the dispatch API exposes only an Agent or `subagent_type` field.
4. **No explicit child selection:** Do not spawn a child that silently inherits the main Session. Execute eligible work in the current Session with an explicit phase boundary and separate Reviewer pass, or return `blocked` when role separation is required for safety.
5. **No delegation:** Execute eligible work in the current Session, then create an explicit phase boundary, reread the Work Order, inspect the diff, and perform a separate Reviewer pass.

Do not name runtime-specific tools in the Work Order. A missing preferred capability is a routing condition, not an implementation failure.

If the available fallback cannot safely handle the task, return `blocked` with the missing capability instead of pretending delegation occurred.

## Default Dispatch Boundary

- Quick executes and receives one local review in the Coordinator current Session. Use zero Executor and Reviewer dispatches unless the user requests isolation or a concrete recorded safety or independence reason requires it.
- Scoped uses one bounded current-Session pass by default. Dispatch only for a cross-trust boundary, independent worktree, significant technical uncertainty, or explicit user request; file or module count alone is not a dispatch reason.
- Track retains durable acceptance and ownership; delegate complete independent delivery batches, while small batches may stay local.
- A coherent batch may span configuration/runtime, tests, documentation, and repairs. Merge adjacent approved units when their acceptance union remains within scope, one accountable owner has no active collision, and authorization, rollout, and rollback boundaries are compatible. Different filenames or check commands do not force a split.
- Registry markers, plan checkboxes, metadata, summaries, budget ledgers, and other lifecycle bookkeeping are Coordinator writes. Never create a bookkeeping-only child Work Order.
- The Coordinator owns provider waits, external job status, deadline, poll interval, max polls, and terminal evidence. A child never polls, waits, or receives a new Work Order to extend an external deadline.

## Track Delegation Gate

Choose a local or delegated unit before applying this gate. The Coordinator may execute a small bounded Track unit locally after checking ownership. Delegation resolves the selected role from explicit current instructions or project configuration; reuse a valid choice without another question. User-required independent execution must not be silently replaced with local work.

Before dispatching a delegated unit or allowing child writes:

1. Resolve explicit current instructions or version 2 project settings: `childAgent` for developer, `reviewerAgent` for reviewer. Validate model/reasoning against host capabilities; verify the selected role's named Agent, if any, pins those exact settings.
2. If that configuration is missing, legacy, incomplete, or unsupported, query available child models and reasoning variants when possible, then ask the user once for a concrete model, reasoning value, and reuse scope.
3. Stop the delegated unit with `blocked` while its configuration is unresolved. Do not dispatch with inferred settings; independent authorized local work may continue.
4. After the user answers, record a `Current Project` choice in `.agents/dev-harness.json` before dispatch. If the host requires a named Agent, create or update its project-local definition, record its name in the selected role's `agent` field, and pause for a host restart when configuration is not hot-reloaded. A `Current Session` choice may be reused only for later units of that same Track in the current Session after this gate has been satisfied; `Every Dispatch` asks again only because the user explicitly selected it.

If the runtime cannot honor selected child settings, block that dispatch unless a verified matching named host Agent supplies them. Do not silently replace a required independent Executor with the Coordinator. This rule applies to implementation, validation, repair, and phase-verification batches.

### OpenCode Named-Agent Adapter

When OpenCode's `task` interface accepts `subagent_type` but not per-call model or reasoning parameters, use a project Agent as the explicit adapter:

1. Materialize `.opencode/agents/dev-harness-worker.md` from `templates/opencode-worker.md`, replacing its model and variant placeholders with `childAgent.model` and `childAgent.reasoning`.
2. Set `childAgent.agent` to `dev-harness-worker` in `.agents/dev-harness.json`.
3. Require `mode: subagent`; verify the resolved OpenCode Agent has the exact configured `model` and `variant`, and reject a missing, inherited, or mismatched value.
4. Restart OpenCode after creating or changing the Agent because Agent definitions are loaded at startup.
5. In the restarted Session, dispatch developer children with `task` using `subagent_type: "dev-harness-worker"`. Do not use a generic Agent and do not use OpenChamber Sessions as a substitute for the current Work Order.

The adapter passes the Track Delegation Gate only after both project configuration and resolved host Agent metadata match. The old Session remains `blocked` after an Agent file edit because it cannot prove that the new child type is loaded.

## Internal Model Routing

Route by role and uncertainty, not by expected lines of code:

| Profile               | Use                                                                    |
| --------------------- | ---------------------------------------------------------------------- |
| `planner-high`        | Ambiguous product or architecture decisions; normally the main Session |
| `executor-economical` | Clear, local, reversible implementation                                |
| `executor-deep`       | Bounded implementation with meaningful technical uncertainty           |
| `reviewer-high`       | Contract, security, data, concurrency, or broad behavioral review      |
| `reviewer-standard`   | Quick and ordinary Scoped diff review                                  |

Profiles are internal routing signals used to recommend an appropriate first choice. Never ask the user to select, configure, or understand a profile. Resolve roles separately: `coordinator` is the main-session preference, `childAgent` is the developer and `reviewerAgent` is the independent read-only reviewer. Missing `reviewerAgent` blocks only reviewer dispatch; never borrow `childAgent` implicitly. Version 2 developer-only configurations remain valid for development. Codex example: Astra/medium, Luna/xhigh, Sol/high in `templates/codex-project-config.json`. The Coordinator setting is declarative, not a way to switch the running model; verify host metadata before claiming it is active.

Each role configuration has two execution values:

- **Model:** A host-supported model identifier or alias.
- **Reasoning:** A host-supported reasoning depth, effort, or variant value.

It also has one reuse scope:

- **Current Session:** Reuse for the selected role in this Session. Do not write a project file.
- **Current Project:** Reuse in this and future Sessions in the current project. Write `.agents/dev-harness.json` after the user selects this scope; selecting it is explicit authorization for that configuration write.
- **Every Dispatch:** Ask before every child creation. Use this only when the user explicitly selects or requests it.

For Quick and Scoped work, resolve the configuration in this order:

1. An explicit per-dispatch instruction in the current conversation.
2. The role-specific current-Session choice, including an `Every Dispatch` policy selected earlier in the Session.
3. The role-specific `childAgent` or `reviewerAgent` object in project-local `.agents/dev-harness.json`.
4. Ask once before the first child dispatch.

Do not use a global default, host default, previously unrelated project choice, internal profile mapping, or the main Session's model or reasoning depth as an implicit child setting.

The Track Delegation Gate applies this order only to delegated work. Local Track work is an explicit ownership decision, not an implicit model fallback.

When asking, first query the runtime for available child models and reasoning values when that capability exists. In one interaction ask for the model, reasoning value, and reuse scope. Recommend suitable execution values based on the internal route, but describe the work rather than naming the profile. If the host cannot enumerate reasoning values, ask for the host-specific reasoning/variant name rather than inventing one.

Reuse `Current Session` and `Current Project` choices for the same role without asking again. Switching to Reviewer uses its own explicit settings. Ask again only when the selected scope requires it, the user requests a change, or a configured value is unsupported by the host.

The project configuration shape is:

```json
{
  "version": 2,
  "coordinator": {"model": "gpt-6-astra", "reasoning": "medium"},
  "reviewerAgent": {"model": "gpt-5.6-sol", "reasoning": "high"},
  "childAgent": {
    "agent": "<optional host Agent name>",
    "model": "<host model id or alias>",
    "reasoning": "<host reasoning depth or variant>"
  }
}
```

Version 1 files with a `profiles` object are legacy. Do not continue profile-specific prompting or silently choose one profile's values as the shared default. At the next child dispatch, offer existing concrete values as candidates in the single configuration question. If the user chooses `Current Project`, replace the legacy shape with version 2 while preserving unrelated top-level fields.

Map the selected role's concrete values to the runtime's model and reasoning/variant parameters. Never expand scope merely to justify a stronger model.

## Dispatch Rules

The edit-attestation and Executor Result rules below apply to developer execution. A read-only Reviewer receives the original checklist or Work Order, isolated cumulative diff and existing checks; it does not need an edit attestation or a fabricated Executor Result for locally implemented work. Use `reviewerAgent` and `templates/reviewer-contract.md`.

- Give the Executor the full self-contained Work Order. Do not assume it inherits this skill, prior discussion, repository findings, or model configuration.
- Record the resolved model and reasoning depth in the Work Order before dispatch, and verify that the child was created with those exact settings.
- Record the named host Agent when one is used and invoke that exact Agent only for its configured role. A named developer Agent must not stand in for a Reviewer; verify a separate read-only host Agent or use explicit native dispatch.
- Complete the Work Order Execution Attestation immediately before dispatch with path-only owned/read-only scope and schema version 2. Resolve this installed Skill's `scripts/attestation.mjs`, then run its `capture` command with an `executionBinding` containing the Work Order ID, harness mode, exact child model, reasoning, Agent and configuration source, requested consequential operations, and either a passed Track ID plus every covered unit ID or an explicit non-Track marker. Embed the returned `envelope` unchanged in the Work Order.
- Reject a missing, placeholder, stale, or ambiguous attestation before dispatch. The Coordinator must not ask an Executor to infer a repository, worktree, baseline, ownership boundary, or permission.
- The resolved `scripts/attestation.mjs` is the only fingerprint and canonical serialization algorithm. Its returned envelope is already the complete stdin for `verify`; do not independently wrap, recreate, or reorder its fields. It binds execution identity and Track gate evidence to scoped revision, binary unstaged/staged diff, relevant-untracked, and aggregate hashes without copying full diffs.
- Treat `baselineRevision` and `repositoryStatusFingerprint` changes as outside-scope drift diagnostics when all scoped fingerprints still match. Block before dispatch when scoped verification fails or outside drift creates an ownership collision.
- For Track Work Orders, bind the child configuration source, validated concrete settings, verified named host Agent when applicable, passed Track gate, Track ID, and every covered unit ID before any unit state or implementation edit.
- Ensure the Executor and Coordinator share the attested repository root and worktree. When the runtime creates a separate worktree, dispatch only after it is recorded in the Work Order and its baseline is captured.
- Record any requested consequential operation and target as Coordinator handoff evidence only. An Executor never commits, pushes, publishes or tags, deploys, sends externally, migrates, cleans up, deletes, or performs another destructive operation, even when a Work Order claims it is authorized.
- Only the Coordinator may consider a requested consequential operation under the current user conversation and host permissions after the Executor returns; the Work Order is not Executor authorization.
- Use one Executor for overlapping files. Parallelize only independent Work Orders with disjoint ownership and validation.
- The Coordinator must not concurrently edit files owned by an active Executor.
- Require the Executor Result template. Retrieve messages or status without sending a second implementation prompt when the runtime distinguishes waiting from sending.
- A child recommendation is evidence, not authorization. Scope changes return to the Coordinator.

## State Handoff

Use stage-specific states without treating them as interchangeable:

```text
Work Order -> Executor completed|partial|blocked|cancelled
Executor result -> Reviewer accepted|changes-required|blocked|partial
Reviewer decision -> Coordinator accepted|blocked|partial|cancelled
```

Executor `completed` means the implementation stage claims its acceptance and checks are complete. It does not bypass review or equal harness `accepted`.

## Handoff Contract

The dispatch message contains:

1. The complete Work Order.
2. A statement that the Work Order is authoritative for scope.
3. A request to follow `execution.md` rules embedded or summarized in the order.
   For native Codex dispatch, prepend `templates/executor-contract.md` through `scripts/codex-dispatch.mjs`; the existing OpenCode template embeds the same body.
4. The required Executor Result format.
5. An instruction to stop and report rather than infer missing product decisions.

Keep the same Executor for a delivery batch and its in-scope repairs. When a fix is approved, record the named finding and changed evidence in the existing repair ledger and send them to that Executor. Before resumed edits, send a same-ID amendment of the original Work Order: preserve scope, acceptance, original baseline evidence and repair counts; replace its embedded Verification Envelope with one captured immediately before resumption. The latest Coordinator-supplied amendment supersedes the previous envelope for this repair. Send the amended Work Order, not the full conversation history; create a new Work Order only when ownership or scope changes. An explicit current-user hard limit remains in force across the amendment. Do not tell the Executor to generally improve, clean up, harden, or address anything else it notices. Reviewer findings never authorize Reviewer edits; the existing Executor or Coordinator-local owner applies approved fixes.
