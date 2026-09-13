## Why

The CLI and GitHub Action enforce fixed-width prose after content has been written, while the existing Codex plugins provide earlier feedback during reconstructible edits. Claude Code has a compatible synchronous `PreToolUse` boundary for its native `Write` and `Edit` tools, so Claude users should receive the same hard-block or warning behavior without weakening the existing scanner or its final-state enforcement.

## What Changes

- Add separately installable Claude Code hard-block and warning plugins.
- Evaluate native `Write` and `Edit` calls before execution using the existing scanner and supported prose extensions.
- Reconstruct `Write` content and `Edit` replacements, compare proposed findings with current findings, and report only newly introduced findings.
- Return Claude Code structured denial or model-visible warning responses while failing open with visible diagnostics for malformed or unevaluable events.
- Add self-contained Node bundles, Claude plugin manifests, hook configuration, shared guidance skills, and a Claude marketplace catalog alongside the existing Codex catalog.
- Add Claude-specific validation, fixture-backed tests, protocol smoke coverage, documentation, and release/version coupling for `1.2.0`.
- Keep Bash, PowerShell, MCP, generator, redirect, and other opaque or post-write paths outside the early hook guarantee; the CLI and GitHub Action remain final-state enforcement.

## Capabilities

### New Capabilities

- `claude-code-hooks`: Provides installable Claude Code plugins that detect newly introduced fixed-width prose at the native pre-write tool boundary.

### Modified Capabilities

None.

## Impact

This adds a Claude Code hook adapter, two self-contained plugin bundles, Claude plugin manifests and marketplace metadata, shared guidance, tests, validation and smoke tooling, documentation, and version metadata. The existing scanner API, CLI behavior, GitHub Action behavior, and Codex plugin contract remain unchanged. Claude Code plugin installation requires users to review and trust the bundled hooks, and the integration assumes the project’s existing Node.js 24 runtime requirement.
