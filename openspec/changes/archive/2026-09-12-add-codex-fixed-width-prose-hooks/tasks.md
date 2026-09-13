## 1. Codex hook evaluation

- [x] 1.1 Add the JavaScript Codex hook adapter entry point and mode-specific response handling, then verify direct stdin/stdout tests cover clean, hard-block, warning, and visible fail-open operational responses.
- [x] 1.2 Decode documented `PreToolUse` file-edit payloads and reconstruct add, update, delete, move, direct-content, and old/new-string operations without mutating the workspace, then verify patch and payload fixture tests cover valid and malformed inputs.
- [x] 1.3 Restrict evaluation to the CLI's recognized prose extensions and compare proposed findings against the current file as multisets that tolerate unchanged line shifts and support incremental repair, then verify tests cover new, changed, legacy, removed, structural-Markdown, and unsupported-path cases.

## 2. Plugin packaging

- [x] 2.1 Add a shared self-contained launcher build that bundles the hook adapter and existing scanner into both plugin variants, then verify generated launcher output is reproducible and runs without runtime package installation or network access.
- [x] 2.2 Create `ban-fixed-width-prose-hard-block` and `ban-fixed-width-prose-warn` manifests and synchronous `PreToolUse` hook definitions with shared `no-fixed-width-prose` guidance, then verify each package's metadata, matcher, mode, skill, and launcher are present.
- [x] 2.3 Add `.agents/plugins/marketplace.json` entries for both variants and couple package/plugin metadata to version `1.1.0`, then verify marketplace paths, names, versions, and install commands pass dedicated validation.

## 3. Integration coverage and documentation

- [x] 3.1 Add checked-in hook event and proposed-content fixtures for wrapped prose, clean prose, structural Markdown, legacy findings, incremental repair, supported extensions, and unsupported paths, then verify the fixture suite exercises the real scanner API rather than duplicate detection logic.
- [x] 3.2 Add an isolated real-Codex smoke harness using temporary `CODEX_HOME`, marketplace, and repository state, then verify hard mode prevents a wrapped pre-write edit, warn mode allows it with guidance, clean edits proceed, and existing findings do not block unrelated edits.
- [x] 3.3 Document plugin installation, trust review through `/hooks`, hard versus warning behavior, supported paths, fail-open diagnostics, opaque-write limitations, CLI/Action final enforcement, and rollback, then verify documented commands and plugin names match validated metadata.

## 4. Repository and release validation

- [x] 4.1 Extend Node tests, coverage, package checks, and CI to validate both plugin bundles while preserving the existing CLI and GitHub Action checks, then verify the complete local check command succeeds.
- [x] 4.2 Validate all OpenSpec artifacts and generated distributions, then verify strict OpenSpec validation, bundle reproducibility, package metadata, marketplace JSON, and `git diff --check` pass.
- [x] 4.3 Run the full release-readiness matrix for the next minor release, including version coupling and isolated Codex smoke evidence, then verify the repository is ready for tag publication without publishing during implementation.
