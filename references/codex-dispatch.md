# Codex Direct Dispatch

Use only when dispatch is already justified and the current Codex host exposes native subagents with explicit model and reasoning parameters. Quick/Scoped defaults stay local; this adapter creates no extra delegation, approval, or test pass.

## Select The Route

With version 2 project configuration, omit `agent` from the selected role for direct dispatch. Use `childAgent` for executor and `reviewerAgent` for reviewer; never substitute one for the other. `coordinator` records the main-session preference and is not dispatched. Keep the selected role's model and reasoning. Verify these exact values against the current host tool definition before dispatch. Do not strip a provider prefix, rename a model, or fall back silently. An explicitly selected custom role remains a different route until the user authorizes changing it.

For `collaboration.spawn_agent`, use `agent_type: "default"`, explicit `model` and `reasoning_effort`, and `fork_turns: "none"`. This avoids a second custom-role instruction set and copying the Coordinator's full history. Do not use `luna-worker`, OpenCode's `subagent_type`, or a same-history fork for this route. If the current host cannot honor these parameters, report the actual missing capability; do not change global agent files or silently substitute another route.

## Supply One Execution Contract

`templates/executor-contract.md` is the canonical worker instruction body for Dev Harness. The OpenCode worker template carries an identical body plus its host-specific permission header; do not maintain different behavioral rules for Codex and OpenCode. Run package validation after updating the canonical body and its embedded OpenCode copy.

Prepare the full Work Order using existing ownership, acceptance, required checks, budgets, and attestation rules. Include only task-relevant context and the required Result format; do not make the child discover the Coordinator's plan or reread a delivery controller. Summarize previously collected evidence so a narrow question does not restart reconnaissance. For read-only reconnaissance, specify the evidence window, output and stopping condition; do not repeat it merely to test routing.

In `executionBinding.child`, record `agent: "default"` for the actual native role, along with the explicit model/effort and configuration source. Keep `childAgent.agent` absent in project configuration: the attestation records the resolved route, while the configuration selects direct dispatch. Do not use an empty attestation Agent or claim a named custom role was verified.

Pass JSON containing `config`, `role` (`executor` by default or `reviewer`), `taskName`, and the complete `workOrder` to the installed `scripts/codex-dispatch.mjs` on stdin. Its output is the native spawn payload with the role contract prepended: `templates/executor-contract.md` for development, `templates/reviewer-contract.md` for read-only review. Invoke the native host tool with those fields. The helper does not call a model, validate the whole Work Order, pass the Track gate, or grant permission. Resolve it relative to this installed skill, not a hard-coded personal path.

Verify the actual child settings when the host exposes them. Invocation arguments alone do not prove completion. Reuse a returned result rather than spawning a duplicate. Configuration changes affect new children; finish or explicitly stop an existing child before replacing it, preserving its results and original budgets.

The executor contract forbids recursive controllers, nested delegation, user questions, consequential operations and unbounded validation; before any edit it requires the unchanged attestation envelope. In Codex these are task instructions subject to host policy, not OpenCode YAML permission enforcement or a new sandbox. Existing host permissions still apply.
