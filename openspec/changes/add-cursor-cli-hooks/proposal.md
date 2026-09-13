## Why

Cursor CLI now supports installable plugins, marketplaces, and native command hooks, but this repository has no Cursor integration. Users who rely on Cursor CLI cannot receive the same deterministic fixed-width-prose enforcement already available through the CLI, GitHub Action, Codex, and Claude integrations.

## What Changes

- Add a native Cursor marketplace containing separate hard-block and warning plugins.
- Add a Cursor CLI hook adapter for supported `Write` and `Edit` tool events.
- Block newly introduced fixed-width-prose findings before writes in hard-block mode.
- Provide post-write warning context only for newly introduced findings in warning mode.
- Preserve fail-open behavior, structural Markdown exclusions, and opaque-write limitations.
- Add self-contained bundles, manifest validation, documentation, and disposable Cursor CLI smoke coverage.

## Capabilities

### New Capabilities

- `cursor-cli-hooks`: Native Cursor CLI marketplace plugins and hooks for fixed-width-prose enforcement.

### Modified Capabilities

None.

## Impact

The change adds Cursor marketplace/plugin directories, a shared Cursor hook adapter, build and validation coverage, tests, and user-facing installation guidance. It reuses the existing scanner and normalized finding contract, adds no runtime dependencies beyond the declared Node.js runtime, and does not modify the existing CLI, GitHub Action, Codex, or Claude behavior.
