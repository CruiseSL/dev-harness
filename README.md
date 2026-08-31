# Dev Harness

Dev Harness is an agent skill for keeping software changes proportional to the request. It classifies work as Quick, Scoped, or Track, then applies bounded delegation, validation, review, and escalation rules.

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
- Architect integration for durable, multi-stage work

Dev Harness does not override user approval, repository policy, security controls, or host permissions.

## Structure

```text
SKILL.md
references/
  architect-integration.md
  classification.md
  execution.md
  orchestration.md
  review.md
  validation-scenarios.md
templates/
  result.md
  work-order.md
```

## License

MIT
