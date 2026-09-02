# Architect Discuss Module

> Adapted from Architect Discuss in `hlhr202/swe-skills` (Apache-2.0); modified into an automatic material-ambiguity gate inside Dev Harness.

## Purpose

Resolve product and architecture decisions that can materially change a Track before proposal artifacts are created. Discuss is Dev Harness' self-contained requirements-discussion protocol: it has the dialogue purpose of general brainstorming without requiring a separately installed brainstorming skill. It is an internal phase, not a separately invoked dependency and not an implementation controller.

## Entry

Enter when `references/architect/router.md` detects at least one material unresolved decision in a Track request. Also accept a Track-scoped requirements discussion, architecture comparison, or the legacy `architect-discuss` alias.

Do not enter merely because work is large, unfamiliar, or technically detailed. A standalone request to brainstorm, ideate, or explore without a Track candidate is not a Discuss trigger. Skip gates already established by the request, repository evidence, an approved Architect context, or an earlier brainstorming conversation.

If a general brainstorming skill or earlier conversation has already produced a synthesis, use it as input. Extract confirmed decisions, assumptions, deferred items, and remaining material questions before asking anything. Never repeat a settled question or start a second discussion merely because the input used another discussion workflow.

## Hard Boundaries

- Do not create or update `architect/tracks.md`, Track directories, finalized `spec.md`, `plan.md`, or implementation code.
- Do not scaffold, migrate, deploy, send externally, or run implementation validation.
- A synthesis is a reviewable draft, not an implementation contract.
- Saving a standalone draft and overwriting an existing path require the approvals in `references/architect/contracts.md`.

## Discussion State

Use resumable gates:

```text
background
  -> requirements
  -> scope
  -> product behavior
  -> constraints
  -> architecture direction
  -> tradeoffs
  -> synthesis readiness
```

Each gate is `Passed`, `Needs input`, or `Deferred`, with pass mode `Explicit`, `Auto`, or `Deferred`. Keep a compact recovery state containing confirmed decisions, assumptions, deferred questions, and next gate.

## Question Discipline

- Ask only when the answer can change scope, architecture, delivery cost, risk, or proposal readiness.
- Ask one focused question by default; batch only tightly related low-load decisions.
- Recommend a direction and reason before asking when evidence supports one.
- Do not invent answers for business priority, target audience, policy, compliance, or success criteria.
- A low-risk assumption may auto-pass only when it cannot change a boundary named in the Discuss Gate in `references/architect/router.md`.
- If an earlier brainstorming synthesis covers a gate, mark it `Passed` with that synthesis as evidence. Ask only about an unresolved material gap.

## Analysis Shape

1. Intake any earlier brainstorming synthesis or relevant conversation, then build shallow targeted context from Architect core, relevant Tracks, direct code/docs, APIs, schemas, and service boundaries.
2. Stabilize problem, users, value, goals, non-goals, success, and affected domains.
3. Split separable initiatives and identify one proposal-sized unit.
4. Clarify behavior that affects architecture: roles, journeys, rules, state, failures, configuration, and compatibility.
5. Clarify material reliability, recovery, security, privacy, compliance, observability, scale, cost, deployment, and rollout constraints.
6. When multiple directions are viable, present two or three options with best-fit condition and main tradeoff. Recommend one when evidence permits.
7. Resolve direction-changing tradeoffs while deferring fields, helper design, test layout, and micro-interactions that do not affect architecture.

## Synthesis

Before synthesis, show confirmed decisions, assumptions, deferred items, and intended scope. Ask for a decision only when a material unresolved gate cannot be safely deferred. Generate the synthesis once readiness is established or the user explicitly requests an unresolved draft.

Use `templates/architect/discussion.md`. Remove contradictory assumptions, unresolved placeholders, unsupported repository claims, and implementation over-specification. State proposal readiness and any blockers.

## Handoff

- A standalone exploration remains outside Architect and creates no Track, artifact, or implementation contract.
- If the originating intent was discussion only, present the synthesis and stop.
- If the user requested planning or implementation and the synthesis is ready, route automatically to `references/architect/propose.md` without asking which module to use.
- Proposal still requires separate spec and plan approvals.
- A saved discussion draft is optional and never required for handoff.

## Stop Conditions

Stop with the current Discussion State when a material user-owned decision remains unresolved, a requested save path is unsafe, overwrite lacks exact confirmation, an operation fails after one clear correction, or the user ends the discussion. Do not turn an unresolved synthesis into a Track.
