## Context

See proposal.md for motivation. The repository currently has a Node.js 24 scanner, CLI, GitHub Action bundle, and two Codex plugins that share differential finding behavior. The current Codex catalog lives under `.agents/plugins`; the local Claude Code CLI is version 2.1.216 and expects Claude plugin manifests under `.claude-plugin/`.

Claude Code command hooks receive lifecycle JSON on standard input. Its `PreToolUse` event supplies the tool name and input before execution. Native `Write` inputs contain an absolute `file_path` and complete `content`; native `Edit` inputs contain an absolute `file_path`, `old_string`, `new_string`, and optional `replace_all`. Claude uses `hookSpecificOutput.permissionDecision` for pre-tool denial and `hookSpecificOutput.additionalContext` for model-visible context.

## Goals / Non-Goals

**Goals:**

- Reuse the existing scanner and finding semantics as the single policy source.
- Give Claude users the same hard-block, warning, differential, and fail-open behavior as Codex users.
- Cover native Claude file edits before execution with portable, reviewable, self-contained plugin bundles.
- Keep the CLI, Action, Codex plugins, and final-state enforcement contracts stable.

**Non-Goals:**

- Parsing arbitrary Bash or PowerShell commands, shell redirects, generators, or `apply_patch` text.
- Registering post-write diagnostics that cannot prevent a write.
- Auditing MCP writers, `NotebookEdit`, or other specialized tools in this change.
- Automatically reflowing content or adding user-configurable policy rules.
- Claiming an absolute filesystem enforcement boundary.

## Decisions

### Add a Claude adapter over a second detector

Create a Claude-specific adapter that calls the existing scanner and shares the Codex policy concepts. Keep the Claude event decoding separate from Codex decoding because Claude’s native payloads and path guarantees differ. This avoids changing the released Codex protocol while preventing scanner-policy drift.

Alternative: invoke the CLI as a subprocess. Rejected because it adds process and output parsing overhead and makes differential comparison and model-visible hook responses less direct.

### Reconstruct only native Write and Edit payloads

For `Write`, read the current file and use the supplied complete content as the proposed result. For `Edit`, apply one unique replacement when `replace_all` is false and all occurrences when it is true. A missing old string or invalid unique replacement is an evaluation failure and therefore fails open with context.

Use the event’s `cwd` as the workspace root and Claude’s absolute `file_path` as the target. Normalize platform separators before containment checks, reject paths outside the workspace, and display a workspace-relative source label in findings.

Alternative: match `Edit.*` or inspect Bash and PowerShell. Rejected because the former includes specialized tools such as `NotebookEdit`, while the latter cannot reliably reconstruct arbitrary shell effects without a shell parser and would exceed the established hook boundary.

### Preserve differential finding semantics

Scan the current and proposed text for supported paths, key findings by reason and excerpt, and subtract unchanged findings as multisets. Exclude line and column from the comparison so unrelated inserted lines do not re-report legacy findings. Reuse the existing structural Markdown exclusions without duplicating scanner logic.

### Use Claude’s structured PreToolUse protocol

Return an empty JSON object for clean, unsupported, and unrelated calls. Return nested `hookSpecificOutput` with `hookEventName: "PreToolUse"` for denials, warnings, and operational diagnostics. Keep exit status zero and stdout limited to one valid JSON object so Claude Code can parse the result consistently.

Alternative: exit with status 2 for hard failures. Rejected for this adapter because structured denial includes the deterministic location and remediation message, while status 2 is better reserved for a failure that must block regardless of structured output. Evaluation failures must remain fail open.

### Package a separate Claude marketplace and two versioned plugins

Add `.claude-plugin/marketplace.json` at the repository root and place two plugin directories under a distinct `claude-plugins/` tree. Each plugin contains only its own `.claude-plugin/plugin.json` manifest plus root-level `hooks`, `bin`, and `skills` directories. Register one synchronous `PreToolUse` matcher with the exact `Write|Edit` pattern and invoke a bundled launcher through `${CLAUDE_PLUGIN_ROOT}`.

Build both Claude launchers with the existing Node bundler, copy the shared guidance skill into each plugin, and validate manifests, hook shape, bundle presence, and version coupling alongside the existing Codex checks. Use `1.2.0` so Claude’s plugin cache recognizes the new release.

Alternative: combine Claude and Codex metadata in the current `.agents/plugins` catalog. Rejected because Claude’s validator requires `.claude-plugin` manifests and its marketplace source schema differs from the existing Codex catalog.

### Keep installation and trust explicit

Document adding the Claude marketplace, installing exactly one severity variant, reviewing the plugin through `/plugin` and `/hooks`, and using `claude plugin validate --strict` or `claude --plugin-dir` for local verification. Explain that plugin hooks execute with the user’s local privileges and that CLI or Action checks remain necessary for opaque writes.

## Risks / Trade-offs

- [Claude changes native tool payloads or matcher behavior] -> Validate against the installed Claude CLI, keep event fixtures, use the documented exact `Write|Edit` matcher, and make unknown payloads fail open with context.
- [Absolute paths and Windows separators differ by platform] -> Resolve against event `cwd`, normalize separators, test native platform behavior, and reject workspace escapes.
- [A fail-open hard mode can allow an unevaluable edit] -> Emit explicit operational context and retain CLI and GitHub Action final-state enforcement.
- [Both severity plugins may be enabled together] -> Document choosing one variant; Claude’s documented hook merge behavior means a hard-block denial takes precedence if both run.
- [Generated bundles drift from source] -> Build both from the adapter entrypoints and require reproducible bundle and metadata validation in CI.
- [Node is unavailable in a Claude installation] -> Keep the runtime requirement explicit, bundle all project code, and report launcher execution failures through Claude’s hook diagnostics.

## Migration Plan

1. Add the Claude adapter, plugin trees, marketplace metadata, tests, validation, smoke tooling, documentation, and `1.2.0` metadata without changing existing scanner, CLI, Action, or Codex behavior.
2. Run unit and fixture tests, build and validate both plugin families, validate Claude manifests with the installed CLI, and run isolated launcher smoke cases for hard, warning, clean, legacy, and failure paths.
3. Publish the repository release at `1.2.0`; users add the Claude marketplace and install one severity variant.
4. Roll back by disabling or uninstalling the selected Claude plugin. The CLI, Action, Codex plugins, and repository content remain available.
