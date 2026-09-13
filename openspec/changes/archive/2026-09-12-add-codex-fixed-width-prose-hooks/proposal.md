## Why

The CLI and GitHub Action detect hard-wrapped prose only after content has been written or submitted to CI. Codex hooks provide an earlier feedback point where agents can be guided or prevented from introducing the formatting problem while editing supported prose files.

## What Changes

- Add separately installable Codex plugins for hard-block and warning behavior.
- Add a shared Codex hook adapter that evaluates reconstructible pre-write file edits using the existing scanner.
- Report only newly introduced or changed findings so existing violations do not prevent unrelated edits or incremental repair.
- Apply the hook to recognized Markdown-family and plain-text files while leaving unsupported paths and non-file-edit tools alone.
- Bundle the existing Node scanner and hook adapter into self-contained plugin launchers with no runtime network dependency.
- Add a concise guidance skill describing compliant prose layout and remediation options.
- Add a repository marketplace catalog, installation and trust guidance, plugin validation, and isolated Codex smoke coverage.
- Couple plugin metadata to the next minor package release while preserving the existing CLI and GitHub Action contracts.

## Capabilities

### New Capabilities

- `codex-hooks`: Provides installable Codex plugins that detect newly introduced fixed-width prose at the pre-write tool boundary.

### Modified Capabilities

None.

## Impact

This adds a private Codex hook-event adapter, two plugin packages, bundled launcher artifacts, a guidance skill, marketplace metadata, build and validation scripts, tests, CI checks, and user-facing documentation. The existing scanner API, CLI behavior, GitHub Action behavior, and comprehensive final-state CI enforcement remain unchanged. Opaque shell writes and specialized tool paths remain outside the early hook boundary and continue to rely on the CLI or GitHub Action.
