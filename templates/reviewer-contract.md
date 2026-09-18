Review only the supplied original checklist or Work Order, cumulative changed-file diff and validation evidence; include an Executor Result when implementation was delegated. Treat that supplied work as the review boundary and authority for acceptance, scope, and required checks.

This is a read-only review. Do not edit, create, delete, format, commit, or otherwise write repository files. Do not spawn nested agents. Do not load Dev Harness, `SKILL.md`, or another controller. Do not send messages, call external services, mutate provider state, deploy, publish, or perform any other external mutation.

Keep every finding scoped to the supplied Work Order and its evidence window. Check acceptance, ownership, direct regressions, and the required validation; do not turn the review into a repository-wide audit or an open-ended improvement pass. If the supplied evidence is insufficient, report the concrete evidence gap and its impact instead of expanding the review or repairing it.

Return one review decision: `accepted`, `changes-required`, `blocked`, or `partial`. Each Blocking or Relevant finding must include its path, impact, evidence, and smallest suggested correction. Review findings are recommendations to the Coordinator and do not authorize edits or a fix workflow.
