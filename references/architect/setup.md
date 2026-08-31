# Architect Setup Module

> Adapted from Architect Setup in `hlhr202/swe-skills` (Apache-2.0); modified for automatic routing, fewer redundant prompts, and shared Dev Harness contracts.

## Purpose

Initialize or resume durable project context under `architect/`. Setup creates core context only. It never creates, repairs, or mutates Track artifacts.

Read `references/architect/contracts.md` first. Core readiness and path rules are authoritative there.

## State Model

Resume from the earliest incomplete state:

```text
uninitialized
  -> product_ready
  -> guidelines_ready
  -> tech_ready
  -> guides_ready
  -> workflow_ready
  -> core_ready
```

A file is incomplete when absent, empty, or clearly an interrupted placeholder. Later files do not allow skipping an earlier prerequisite.

## Project Detection

Classify maturity before drafting:

- **Brownfield:** application source, dependency manifests, or established build/config files exist.
- **Greenfield:** no application source or dependency manifest exists after ignoring `architect/`, `.git`, and a minimal README.

For Brownfield, perform a bounded read-only scan without asking permission unless repository policy, external access, credentials, or sensitive data makes the read consequential. Start with README, manifests, top-level structure, and directly relevant configuration. Respect ignore rules and sample very large files.

For Greenfield, ask for the project goal only when it is not already present in the request. Ask before `git init`; Git initialization is not part of core context.

## Drafting Rules

Do not ask for facts already established by repository evidence or the user's request.

1. Draft `product.md` from users, goals, capabilities, constraints, and success criteria.
2. Draft `product-guidelines.md` from voice, UX principles, accessibility, content rules, visual direction, and quality bar.
3. Draft `tech-stack.md` from observed or approved runtime, frameworks, persistence, testing, tooling, deployment, and constraints.
4. Prefer existing repository style guidance. If none exists, adapt `references/architect/defaults/code-style.md` to the detected stack and project conventions.
5. Adapt `references/architect/defaults/delivery.md` into `architect/workflow.md`. Repository commands and policies override defaults.
6. Generate `architect/index.md` from `templates/architect/core-index.md`.

For a clear Brownfield project, present product, guidelines, and stack as one review packet with distinct diffs and one `Approve all` or `Revise` decision. Split approvals only when a draft contains a material assumption or the user requests separate review. For Greenfield or materially uncertain context, ask focused questions before presenting the affected draft.

Copy or generate a style guide only after showing its source or draft. A repository-native direct child guide may be linked or copied as the project permits; never follow an external symlink.

## Approval Boundaries

- Core writes require approval of the presented draft or diff.
- Approval of one review packet covers only files explicitly shown in that packet.
- Significant inferred stack corrections require user approval.
- Customized delivery policy requires approval of its changed choices.
- Any commit requires a separate explicit commit request.

## Run

1. Audit the six core criteria and announce maturity plus the earliest incomplete state.
2. Read existing core context and bounded repository evidence.
3. Draft only missing or incomplete artifacts; preserve approved content.
4. Present the minimal approval packet and revise until accepted.
5. Write approved artifacts with reviewable edits and validate links and non-empty content.
6. Report created and preserved files.
7. Return to `references/architect/router.md`: enter Discuss only when material direction remains unresolved; otherwise continue to Propose when the originating request requires a Track.

## Stop Conditions

Stop when core is already ready, a path is unsafe, required context cannot be approved, an operation fails after one clear correction, or the next action would mutate Track management. Setup completion alone does not authorize proposal or implementation writes.
