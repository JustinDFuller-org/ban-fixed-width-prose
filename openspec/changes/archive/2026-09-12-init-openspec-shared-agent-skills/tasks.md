## 1. Initialize OpenSpec

- [x] 1.1 Generate the repository-local OpenSpec structure with the `spec-driven` schema and verify `openspec/config.yaml` plus planning directory markers exist
- [x] 1.2 Generate the shared `.agents/skills/` workflows and verify all seven OpenSpec skills and `.openspec-target` are present

## 2. Validate and archive the bootstrap

- [x] 2.1 Add the initial `openspec-initialization` capability delta and verify it describes observable repository workflow behavior with scenarios
- [x] 2.2 Validate generated skills and all OpenSpec artifacts with `skills-ref`, strict OpenSpec validation, archived validation, and `git diff --check`
- [x] 2.3 Archive the completed bootstrap change and verify the synchronized main capability spec is present under `openspec/specs/`
