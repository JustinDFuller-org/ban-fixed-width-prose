## 1. Git-aware repository discovery

- [x] 1.1 Extend default repository discovery to enumerate tracked and untracked-but-not-ignored files with standard Git exclusions, preserve the existing filesystem fallback outside Git worktrees, and verify behavior with nested `.gitignore`, `.git/info/exclude`, unavailable-Git, and tracked-ignored-file fixtures.
- [x] 1.2 Preserve explicit-source escape hatches and existing extension, skipped-directory, include, exclude, ordering, and error semantics, then verify the complete CLI and discovery integration suite passes.

## 2. Action interface and orchestration

- [x] 2.1 Add Node 24 Action metadata with documented multiline `paths`, `include`, `exclude`, and `debug` inputs, `finding-count`, `files-scanned`, `files-with-findings`, and `error-count` outputs, and a committed bundled entrypoint; verify metadata parsing and contract tests.
- [x] 2.2 Implement Action orchestration over the shared scanner APIs, including deterministic aggregation of repository and pull request-description results, event-payload loading, empty-body handling, safe logs, Step Summary output, and read-only failure semantics; verify clean, finding, and operational-error cases.
- [x] 2.3 Ensure untrusted descriptions, excerpts, paths, and input values are treated as data rather than shell commands or raw workflow-command annotations, then verify adversarial output tests contain no unsafe command interpretation.

## 3. Bundling and automated tests

- [x] 3.1 Add source-level unit and integration coverage for input parsing, event variants, PR-body source labels, filters, outputs, summaries, errors, and cross-platform path normalization; verify the enforced line and branch coverage thresholds remain satisfied.
- [x] 3.2 Add deterministic bundling with the Action's runtime dependencies and verify the generated `dist/index.js` is committed, executable with the declared Node 24 runtime, and reproducible from a clean install.
- [x] 3.3 Add CI checks for Action metadata, bundle freshness, package tests, coverage, OpenSpec validation, and repository hygiene; verify the workflow fails on stale or invalid Action artifacts.

## 4. Consumer documentation and self-adoption

- [x] 4.1 Document the minimal `actions/checkout` plus one `uses`-step workflow, recommended `pull_request` activity types including description edits, read-only permissions, `v1` versus immutable pinning, optional inputs, outputs, exclusions, and failure behavior; verify examples match the Action metadata and implementation.
- [x] 4.2 Add a repository self-check workflow that exercises repository scanning and automatic pull request-description scanning without requiring an enablement input; verify its workflow structure and local test fixtures.

## 5. Release and hosted proof

- [x] 5.1 Add version/tag coupling and release automation for stable semantic versions plus the moving `v1` major reference, with guards against publishing inconsistent package, metadata, and bundle versions; verify release validation locally.
- [x] 5.2 Add a manually dispatchable and release-triggered smoke workflow with Ubuntu, macOS, and Windows jobs that runs the published artifact against clean, finding, and operational-error cases and asserts the expected outputs and failure statuses.
- [x] 5.3 Run the full local validation suite, strict OpenSpec validation, generated-bundle checks, and release checks, then record hosted release-smoke evidence before marking the change ready to archive.
