## 1. Claude Hook Adapter

- [x] 1.1 Add Claude `PreToolUse` entrypoints for hard-block and warning modes and verify clean, wrapped, unsupported, unrelated, and malformed event cases with unit tests
- [x] 1.2 Reconstruct native `Write` and `Edit` payloads, including unique replacement and `replace_all` behavior, and verify proposed content matches Claude’s documented tool input contract
- [x] 1.3 Apply workspace-relative path validation, supported-extension filtering, scanner reuse, and differential finding subtraction, and verify legacy findings, repairs, structural Markdown, path escapes, and scanner failures
- [x] 1.4 Return Claude-compatible structured denial, warning context, and fail-open operational diagnostics, and verify stdout remains one valid JSON object for every adapter outcome

## 2. Claude Plugin Packaging

- [x] 2.1 Add the root Claude marketplace catalog and two plugin directories with `.claude-plugin/plugin.json`, exact `Write|Edit` synchronous hooks, bundled launchers, and guidance skills; verify each manifest and referenced path exists
- [x] 2.2 Extend the bundle builder to produce self-contained Claude launchers from the adapter entrypoints and verify reproducible generated output without npm installation or network access at hook time
- [x] 2.3 Extend plugin validation and package scripts for Claude metadata, hook shape, version consistency, and marketplace sources; verify `claude plugin validate --strict` succeeds for the marketplace and both plugins

## 3. Documentation and Release Metadata

- [x] 3.1 Document Claude marketplace installation, severity selection, `/plugin` and `/hooks` trust review, supported native coverage, fail-open behavior, and CLI or Action final enforcement; verify documented commands match the Claude CLI and marketplace schema
- [x] 3.2 Couple package, lockfile, source, plugin, catalog, and release validation metadata to version `1.2.0`; verify the release consistency checks pass
- [x] 3.3 Preserve the existing Codex, CLI, and Action documentation and behavior while adding Claude-specific guidance; verify the existing test and validation suites remain green

## 4. Integration Verification

- [x] 4.1 Add fixture-backed Claude adapter tests and an isolated launcher smoke harness covering hard denial, warning context, clean allowance, unchanged legacy findings, repairs, and visible fail-open diagnostics; verify the harness passes for both plugin variants
- [ ] 4.2 Exercise Claude plugin loading with `claude --plugin-dir` or the equivalent local plugin workflow and verify `/hooks` or debug output reports the expected `PreToolUse` registrations
- [x] 4.3 Run the complete Node test, coverage, Action, bundle, Codex plugin, Claude plugin, and OpenSpec strict validation commands; verify all required artifacts and checks pass before implementation handoff
