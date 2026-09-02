# Dev Harness

Dev Harness is one agent skill for proportional software delivery. It classifies work as Quick, Scoped, or Track, applies bounded delegation and review, and includes a complete durable Architect lifecycle with automatic routing.

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
- Built-in Architect Setup, Discuss, Propose, Implement, Review, and Status modules
- Durable `architect/` context and Track artifacts without separate Architect Skill installs

Dev Harness does not override user approval, repository policy, security controls, or host permissions. Commits, destructive cleanup, external actions, and sensitive decisions retain explicit approval gates.

## Discussion Routing

Dev Harness includes a self-contained Discuss protocol for material requirements and architecture decisions in a Track. It does not require a separately installed brainstorming skill.

Use general brainstorming for standalone exploration. When the user asks to plan or implement a Track and a material decision is unresolved, Dev Harness enters Discuss. If the conversation already contains a brainstorming synthesis, Discuss treats confirmed decisions as evidence, asks only about remaining material gaps, and skips itself entirely when the direction is already established. It does not create a second discussion, Track artifact, or implementation contract for standalone exploration.

## Child Model Configuration

Dev Harness never silently gives a child Agent the main Agent's model or reasoning depth. Before the first child dispatch, it asks for the child model, reasoning depth, and how widely to reuse the choice:

- **Current Session:** Every later Quick or Scoped child in the current Session reuses it. Track applies the stricter gate below.
- **Current Project:** Every child in this project reuses it across future Sessions.
- **Every Dispatch:** Ask again before each child; this occurs only when the user explicitly chooses it.

Internal execution profiles are not user configuration boundaries. Switching between implementation and review, or between ordinary and deeper work, does not trigger another question when a Session or project choice already exists.

```json
{
  "version": 2,
  "childAgent": {
    "agent": "dev-harness-worker",
    "model": "<host model id or alias>",
    "reasoning": "<host reasoning depth or variant>"
  }
}
```

Choosing `Current Project` explicitly authorizes this file write. A version 1 file containing profile-specific settings is treated as legacy: its values may be offered as candidates, but Dev Harness asks once for a unified choice rather than exposing profiles again.

### Track Delegation Gate

Every Track unit is executed by an explicitly configured child Executor. Before the first unit that the current Session executes for a Track is marked active, receives a Work Order, or edits a Track or implementation file, Dev Harness reads `.agents/dev-harness.json`. Only a valid version 2 `childAgent` configuration suppresses the question; a prior current-Session choice from Quick work, Scoped work, or another Track, a host default, or a main Session model does not.

When the local configuration is missing, legacy, incomplete, or unsupported, Dev Harness asks for the concrete model, reasoning value, and reuse scope, then pauses before any edit. If the runtime cannot create a child with that exact configuration, the Track is `blocked`; it never falls back to the Coordinator current Session.

For OpenCode hosts where `task` exposes only `subagent_type`, Dev Harness supports a project-local `.opencode/agents/dev-harness-worker.md` adapter. The Agent definition pins the configured model and `variant`; after an OpenCode restart, Dev Harness verifies those values and dispatches with `subagent_type: "dev-harness-worker"`. A generic inherited Agent or an OpenChamber Session does not satisfy the gate.

## Automatic Routing

```text
Request
  -> Quick: one compact Work Order
  -> Scoped: one bounded cross-module Work Order
  -> Track:
       Setup if durable context is missing
       Discuss only when a material decision is unresolved
       Propose when scope is stable and no approved Track exists
       Implement one approved plan unit at a time
       Review every unit and the final Track
```

Users do not choose between Dev Harness and Architect controllers. Dev Harness is the single controller, and Architect is its built-in durable lifecycle.

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
