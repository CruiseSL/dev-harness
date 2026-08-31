# Default Project Code Style

> Adapted from the code-style defaults in `hlhr202/swe-skills` (Apache-2.0); replaced with one repository-first baseline for Dev Harness.

## Precedence

1. Repository instructions, formatter, linter, compiler, and established local patterns.
2. Approved `architect/tech-stack.md` and project-specific style guidance.
3. This fallback.

## Baseline

- Prefer clear, conventional code over clever abstractions.
- Keep changes scoped and reuse existing repository boundaries.
- Use names that communicate domain intent.
- Handle errors at the boundary where recovery or context is available.
- Preserve type, nullability, security, authorization, accessibility, and data-integrity guarantees.
- Add comments only for non-obvious reasoning or constraints.
- Format and validate with repository-native tools.
- Test observable behavior and realistic failure paths; avoid tests coupled only to implementation details.

During Setup, adapt this baseline to the detected languages and tooling. Do not claim support from a formatter or linter the repository does not use.
