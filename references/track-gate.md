# Track Gate Runtime

Use this pack after the router identifies one approved Track. First choose local execution or delegation. A small bounded unit may run in the Coordinator current Session after checking acceptance, baseline and ownership; it does not need child configuration or a Work Order. Do not take files from an active Executor. The configuration gate below applies only when delegation is selected, before its Work Order or child writes.

## Required Configuration

Reuse explicit current user choices; otherwise read project-local `.agents/dev-harness.json`. The version 2 developer settings use `childAgent.model` and `childAgent.reasoning`; independent review uses `reviewerAgent.model` and `reviewerAgent.reasoning`. Require concrete values that the host supports for child execution. A missing, legacy, incomplete, unsupported, placeholder, or mismatched configuration fails closed. When this occurs, query available child models and reasoning variants when possible, then ask the user once for a concrete model, reasoning value, and reuse scope.

While that question is unanswered, return the delegated unit `blocked` with zero child writes. Independent authorized local work may continue. Do not dispatch or begin delegated implementation with an unresolved configuration. After the user answers, record a `Current Project` choice in `.agents/dev-harness.json` before dispatch. A `Current Session` choice may be reused only for later units of the same Track in the current Session after this gate has passed; `Every Dispatch` asks again only when the user explicitly selected it.

If the selected role's `agent` is set, or the host requires a named Agent, verify that the named Agent is loaded, callable as a child, and pins the exact configured model and reasoning or variant. Dispatch that exact Agent by name. A generic Agent, a stale Agent after configuration changes, or an Agent with a mismatched setting fails closed. After creating or changing a project-local Agent definition, remain `blocked` until a restarted Session can verify it when the host cannot hot-reload the Agent.

For direct child dispatch, the host must explicitly apply the configured model and reasoning values. If neither a matching direct route nor a verified named Agent is available, remain `blocked`.

For Codex native dispatch with no `childAgent.agent`, load `references/codex-dispatch.md`. Apply its explicit model/effort parameters and shared Executor contract after this gate passes; a callable generic child alone does not satisfy the gate.

## Prohibitions And Evidence

Do not silently replace a required independent Executor with the Coordinator. A deliberate local unit is permitted; a missing child capability must not bypass user-required separation. Host defaults, internal profiles and main-session settings are not explicit child configuration.

After every check passes, record the resolved model, reasoning, configuration source, direct or named-Agent route, Track ID, and covered unit ID in the Work Order attestation. Then use `references/architect/track-runtime.md` for delegated execution. Local execution enters that runtime directly after ownership checks.
