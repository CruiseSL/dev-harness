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

## Child Model Configuration

Dev Harness never silently gives a child Agent the main Agent's model or reasoning depth. Before the first dispatch for a profile, it resolves both values from the current conversation or the project's `.agents/dev-harness.json`. If either value is missing or unsupported, it asks the user before creating the child.

```json
{
  "version": 1,
  "profiles": {
    "executor-economical": {
      "model": "<host model id or alias>",
      "reasoning": "<host reasoning depth or variant>"
    },
    "executor-deep": {
      "model": "<host model id or alias>",
      "reasoning": "<host reasoning depth or variant>"
    },
    "reviewer-standard": {
      "model": "<host model id or alias>",
      "reasoning": "<host reasoning depth or variant>"
    },
    "reviewer-high": {
      "model": "<host model id or alias>",
      "reasoning": "<host reasoning depth or variant>"
    }
  }
}
```

Only profiles that the project dispatches need entries. A conversational choice applies to the current run only; Dev Harness changes the project configuration only when the user explicitly requests persistence.

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
  result.md
  work-order.md
```

## Architect Compatibility

Dev Harness preserves the upstream Architect schema version 1 paths, registry entries, Track IDs, metadata states, and plan granularity rules. New metadata includes `schema_version: 1`; missing schema version is treated as legacy version 1.

The built-in lifecycle is adapted from [hlhr202/swe-skills](https://github.com/hlhr202/swe-skills). See [NOTICE](./NOTICE) for attribution and modification details.

## License

Apache-2.0
