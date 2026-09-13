## Context

The repository already has a shared scanner, normalized findings, self-contained Codex bundles, and native Claude hook adapters. Cursor CLI supports native Cursor Plugins, `preToolUse` and `postToolUse` command hooks, flat permission responses, and marketplace manifests. Cursor's native plugin format is required because hooks are not part of the portable Agent Plugin format.

## Goals / Non-Goals

**Goals:**

- Add a CLI-first native Cursor marketplace with separate hard-block and warning variants.
- Preserve scanner semantics, structural Markdown exclusions, differential finding comparison, fail-open behavior, and offline execution.
- Make warning advisories post-write while preventing cross-session state contamination.
- Validate the installed Cursor CLI runtime in addition to static manifest validation.

**Non-Goals:**

- Supporting Cursor Desktop, web, Cloud Agents, Tab hooks, or source-code comment detection.
- Covering opaque shell writes, generators, MCP writers, or unsupported Cursor tool payloads.
- Submitting or coordinating official Cursor Marketplace review.
- Changing existing CLI, Action, Codex, or Claude behavior.

## Decisions

### Native Cursor plugin layout

Use a repository-root `.cursor-plugin/marketplace.json` with two plugin entries under `cursor-plugins/`. Each plugin has `.cursor-plugin/plugin.json`, `hooks/hooks.json`, a bundled launcher, and the shared guidance skill. Use Cursor's native flat hook names and response fields, with \${CURSOR_PLUGIN_ROOT} in launcher commands.

A root portable Agent Plugin is insufficient because Cursor hooks are Cursor-specific components. Claude compatibility is not used because it requires an optional third-party compatibility setting and would not prove the native CLI path.

### Shared adapter with mode-specific entrypoints

Add one shared Cursor adapter that normalizes Cursor's `preToolUse` event, accepts the documented `Write` and `Edit` tool names, reconstructs full writes and replacements, resolves paths against the Cursor workspace, and delegates scanning and differential comparison to existing behavior. Small hard-block and warning entrypoints select the mode, matching the existing integrations and bundling process.

The hard-block entrypoint registers only `preToolUse` for `Write|Edit`. It returns an empty response for clean or unrelated calls and returns Cursor-native `permission: "deny"`, `user_message`, and `agent_message` for new findings.

The warning entrypoint registers `preToolUse` and `postToolUse`, both matched to `Write|Edit`. Its pre-tool invocation computes the differential findings and silently persists them; its post-tool invocation consumes the matching record and returns `additional_context` only when the record contains findings. This guarantees that the visible advisory is post-write while avoiding legacy-finding false positives.

### Correlation and temporary state

Use one state file per event under an OS temporary directory. Derive the filename from a hash of the canonical workspace root, conversation ID, generation ID, tool-use ID, tool name, and file identity. Never use a single mutable pending-edit file.

Write records atomically through a unique temporary file followed by rename. Store only the normalized findings, event identity, creation time, and operational status needed by postToolUse. Consume and remove a record after the matching post event, and opportunistically remove entries older than the configured TTL.

If Cursor omits the identity needed to correlate pre- and post-tool events, allow the operation and emit an operational diagnostic rather than risk attributing another session's finding. Missing, malformed, expired, or mismatched records are also fail-open.

### Fail-open and path safety

Use Cursor's workspace root or project directory as the evaluation boundary and reject paths outside it, including symlink escapes where the target can be resolved. Hook failures, malformed inputs, reconstruction failures, state failures, and scanner failures never deny work. Emit valid Cursor output plus concise diagnostics through the supported message/error channel.

### Packaging and verification

Extend the existing plugin build and validation flow for Cursor bundles without changing the existing Codex or Claude outputs. Add adapter unit tests, state/concurrency tests, manifest validation, and a real disposable Cursor CLI smoke using the installed CLI and local plugin path. The smoke must verify actual file contents and the hard-block, warning, clean, legacy, repair, unsupported, and malformed cases.

## Risks / Trade-offs

- [Cursor's file-edit payload may vary by CLI version] -> Accept documented aliases, fail open on unknown shapes, and make installed-CLI smoke validation a release gate.
- [Post-write warning correlation may fail if events omit stable IDs] -> Never guess correlation; allow with an operational diagnostic.
- [Many simultaneous sessions may contend for temporary state] -> Use independent hashed records, atomic creation/rename, and TTL cleanup rather than shared mutable state.
- [Cursor hook protocol or plugin discovery may change] -> Validate exact manifests and native runtime loading before release; do not claim official marketplace publication from local validation.
- [Warnings arrive after mutation] -> Keep hard-block as the enforcement option and state clearly that warning mode is advisory after a permitted edit.
