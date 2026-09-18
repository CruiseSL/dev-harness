# Dev Harness

Dev Harness is one agent skill for proportional software delivery. Quick and Scoped default to one current-session execution pass and local review. Track adds durable Architect coordination; substantial independent deliverables may use explicit child execution.

## Install

Install with the Skills CLI:

```bash
npx skills add https://github.com/CruiseSL/dev-harness
```

Or place this repository in a supported skill directory, such as:

```text
~/.agents/skills/dev-harness/
```

Restart your agent host after installation so it reloads the skill.

## What It Controls

- Task sizing through Quick, Scoped, and Track modes
- Main-session Coordinator and worker-session Executor boundaries
- Runtime-aware delegation and model routing
- Self-contained Work Orders and structured Executor Results
- Bounded validation and review-fix cycles
- Evidence-based technical recommendations and proportionate quality review
- Built-in Architect Setup, Discuss, Propose, Implement, Review, and Status modules
- Durable `architect/` context and Track artifacts without separate Architect Skill installs

Dev Harness does not override user approval, repository policy, security controls, or host permissions. Commits, destructive cleanup, external actions, and sensitive decisions retain explicit approval gates.

## Discussion Routing

Dev Harness includes a self-contained Discuss protocol for material requirements and architecture decisions in a Track. It does not require a separately installed brainstorming skill.

Use general brainstorming for standalone exploration. When the user asks to plan or implement a Track and a material decision is unresolved, Dev Harness enters Discuss. If the conversation already contains a brainstorming synthesis, Discuss treats confirmed decisions as evidence, asks only about remaining material gaps, and skips itself entirely when the direction is already established. It does not create a second discussion, Track artifact, or implementation contract for standalone exploration.

## Role Model Configuration

Version 2 keeps `childAgent` for development and adds independent `coordinator` and `reviewerAgent` settings. Existing developer-only files remain valid; missing reviewer settings must never silently reuse the developer model. Reuse an explicit user choice without asking again.

The user-selected native Codex setup is also available as `templates/codex-project-config.json`:

```json
{
  "version": 2,
  "coordinator": {"model": "gpt-6-astra", "reasoning": "medium"},
  "childAgent": {"model": "gpt-5.6-luna", "reasoning": "xhigh"},
  "reviewerAgent": {"model": "gpt-5.6-sol", "reasoning": "high"}
}
```

Store project choices in `.agents/dev-harness.json`. These are explicit choices, not universal model defaults. Validate exact names/efforts against the current host. The `coordinator` field records a preference; it does not switch an already running Codex session. Select the main model in the host and verify its actual setting before claiming it is active. No global config is changed by this skill.

For native Codex, use `references/codex-dispatch.md` and `scripts/codex-dispatch.mjs`, with `role: "executor"` or `role: "reviewer"`. The helper emits `default`, explicit model/effort, `fork_turns: "none"`, and the appropriate instruction contract. Reviewer instructions are read-only; neither contract creates a host sandbox. A personal `luna-worker` role is not required.

### Delivery Ownership

The main Coordinator owns decisions, integration and acceptance. A developer owns a complete bounded deliverable through implementation, tests and repairs. Keep that developer for follow-ups; do not create another child for each configuration change or fix. The Coordinator may directly perform small bounded Track work when no active child owns those files. Delegation remains required when the user or a concrete safety/independence constraint requires it.

Independent review uses `reviewerAgent` only when it adds value. It does not run after every small edit and cannot implement its own findings. Small local changes can receive Coordinator review.

The Track Delegation Gate applies only to selected delegation. Missing or unsupported settings block that dispatch, not unrelated authorized local work. Do not silently replace a user-required child with the main session.

OpenCode named Agents remain supported: `.opencode/agents/dev-harness-worker.md` may pin developer model/variant through `templates/opencode-worker.md`. A named reviewer needs its own verified read-only definition; do not dispatch Sol review through a Luna/other-model worker. Changing a named Agent requires host reload before claiming it is active.

## Automatic Routing

```text
Request
  -> Quick: compact checklist, current-session execution and review
  -> Scoped: bounded current-session pass; delegate for a concrete reason
  -> Track:
       Setup if durable context is missing
       Discuss only when a material decision is unresolved
       Propose when scope is stable and no approved Track exists
       Gate -> Track runtime, one approved delivery unit at a time
       Review every unit and the final Track
```

## Completion And Measurement

Ordinary short tasks reuse their compact checklist without an extra ledger or timing report. Repeated checks, review expansion, or a checkpoint load `references/delivery.md`: Quick checks progress after 15 minutes, Scoped after 45, and Track at planned phase checkpoints. Keep original acceptance and budgets across units/fixes. These are progress checkpoints, not automatic failure deadlines. Extra checks must resolve a named evidence gap; reuse valid evidence and stop when required acceptance and review pass.

Validation and budget rules are Coordinator instructions, not host-enforced controls. The attestation verifier checks scoped baseline consistency; it does not enforce elapsed-time budgets or replace host permissions.

`node tests/eval/run-layered.mjs` checks static coverage and plans the input-cost microbenchmark. Its live mode returns fixed JSON without developing software, so it cannot establish delivery speed or behavioral safety. Use the delivery exercise workflow documented in `docs/delivery-evaluation.md` to measure actual edits, independently check acceptance, and compare recorded task outcomes. Never infer a speedup from a faster blocked task.

Users do not choose between Dev Harness and Architect controllers. Dev Harness is the single controller, and Architect is its built-in durable lifecycle.

## Technical Decisions For Product Owners

The Coordinator takes responsibility for a justified technical recommendation and explains its business consequences. For a material stack/dependency choice, changed data/service boundary, or disputed engineering feedback, load `references/technical-quality.md`. Read the relevant project first, prefer existing patterns, compare only viable alternatives, and explain the evidence, maintenance cost, limitations, and conditions for revisiting the choice. Ask the user about business tradeoffs that actually need their decision; routine implementation choices stay with the Coordinator.

Quality checks follow the affected behavior: permissions, important data, failure handling, deployment, and maintenance require relevant evidence when changed. Vague criticism is translated into concrete impact, evidence, and a prioritized remedy under the existing review classes. Comments and attached reviews do not grant edit authority. Passing local tests does not establish deployment, live acceptance, or business success.

This adds no universal questionnaire, approval gate, architecture document, or reviewer child. Small edits and approved designs keep the lightweight path. Track reuses its Discuss/spec/Work Order records. Current route-byte benchmarks exclude this conditional pack unless explicitly loaded; real-host traces are needed to measure its cost and behavior. The protocol helps structure technical judgment; it does not certify architecture quality or replace a necessary specialist review.

Legacy names such as `architect-discuss` and `architect-implement` remain accepted as intent aliases. Separately installed `architect-*` Skills are not required and should be removed to avoid duplicate triggers; existing project `architect/` artifacts remain compatible.

## Structure

```text
SKILL.md
references/
  architect/
    contracts.md
    discuss.md
    implement.md
    propose.md
    review.md
    router.md
    setup.md
    status.md
    defaults/
  classification.md
  execution.md
  orchestration.md
  review.md
  validation-scenarios.md
templates/
  architect/
  opencode-worker.md
  result.md
  work-order.md
```

## Architect Compatibility

Dev Harness preserves the upstream Architect schema version 1 paths, registry entries, Track IDs, metadata states, and plan granularity rules. New metadata includes `schema_version: 1`; missing schema version is treated as legacy version 1.

The built-in lifecycle is adapted from [hlhr202/swe-skills](https://github.com/hlhr202/swe-skills). See [NOTICE](./NOTICE) for attribution and modification details.

## License

Apache-2.0
