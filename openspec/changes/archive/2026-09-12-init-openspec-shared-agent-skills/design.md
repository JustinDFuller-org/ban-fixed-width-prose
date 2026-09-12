## Context

The repository currently contains only its product README and has no checked-in OpenSpec configuration or shared agent instructions. The generated setup must remain repository-local, reviewable, and usable by the standard spec-driven workflow.

## Goals / Non-Goals

**Goals:**

- Use the standard OpenSpec `spec-driven` schema.
- Check in the generated shared `.agents/skills/` workflows and repository planning markers.
- Establish an initial capability spec that can be synchronized when the bootstrap change is archived.

**Non-Goals:**

- Changing the fixed-width prose scanner, CLI, hooks, or GitHub Actions.
- Adding project-specific workflow profiles or custom agent instructions beyond the generated shared skills.

## Decisions

- Use `openspec init --tools agents` output as the source for the shared skills so future OpenSpec updates remain compatible with the CLI. Hand-authored replacements would risk diverging from the supported workflow.
- Keep the initial capability flat at `openspec-initialization` because the repository has no existing spec taxonomy and the capability describes the repository workflow itself.
- Archive the bootstrap change after validation and synchronize its delta into `openspec/specs/`, leaving the active changes directory available for future proposals.

## Risks / Trade-offs

- [Generated skills can change with OpenSpec versions] -> Record the generated files in the initial review and validate them with `skills-ref` and OpenSpec so later upgrades have an explicit baseline.
- [The bootstrap metadata adds process overhead to small changes] -> Keep the configuration minimal and use the generated workflows as the single shared entry point.
