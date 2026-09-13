## Context

The repository has a Node.js 24 ESM CLI with `scanText` and `scanPaths` exports, a committed GitHub Action bundle, and CI/release validation. The CLI scanner recognizes Markdown-family and plain-text extensions and returns deterministic findings with source, line, column, reason, and excerpt fields. The new integration targets Codex CLI 0.154.0 and must not duplicate scanner semantics or change the existing CLI and Action contracts.

## Goals / Non-Goals

**Goals:**

- Reuse the existing scanner as the single policy source for Codex evaluation.
- Prevent or explain newly introduced hard-wrapped prose before reconstructible edits are applied.
- Keep existing violations editable and permit incremental repairs.
- Ship two fixed-mode plugins with self-contained, reviewable artifacts.
- Validate the integration through direct hook tests and an isolated real-Codex smoke harness.

**Non-Goals:**

- Reimplementing the scanner in a second language or changing the CLI/Action result contract.
- Reflowing or automatically rewriting prose.
- Auditing opaque Bash, generators, redirections, MCP writers, or specialized tool paths in this version.
- Claiming an absolute filesystem enforcement boundary.
- Adding user-configurable severity or repository-specific prose rules.

## Decisions

### Use a JavaScript hook adapter over a second detector

The adapter will import the existing scanner and process Codex event JSON from stdin. This keeps Markdown state handling, finding locations, and structural exclusions identical across CLI, Action, and plugins. A separate detector or CLI subprocess would create policy drift and unnecessary runtime dependencies.

### Evaluate proposed content in memory

The adapter will recognize Codex pre-tool file-edit payloads for `apply_patch` and documented traditional edit aliases. It will reconstruct add, update, delete, move, direct-content, and old/new-string operations against the current workspace without mutating files, then call `scanText` on the old and proposed content for recognized prose paths.

Findings will be compared per target file as multisets keyed by finding reason and excerpt, excluding line and column so inserting unrelated lines does not turn a legacy finding into a new violation. New files compare against an empty baseline; deletions produce no findings; unchanged moves remain eligible for subtraction when their finding content is unchanged.

### Use the Codex structured response protocol

Hard mode will return `hookSpecificOutput` with `hookEventName: "PreToolUse"`, `permissionDecision: "deny"`, and a concise reason. Warn mode will return `hookSpecificOutput.additionalContext` without a denial. Both responses will include deterministic path and location details and practical remediation guidance.

### Fail open with visible diagnostics

Malformed events, unsupported edit shapes, path-resolution errors, and scanner failures will produce model-visible operational context while allowing the tool call in both modes. This preserves agent availability, and documentation will make clear that hard-block guarantees apply only when the proposed edit is successfully evaluated.

### Build two self-contained plugin bundles

Create hard-block and warning plugin directories using the proven `.codex-plugin/plugin.json` compatibility layout, `hooks/hooks.json`, and a shared guidance skill. Each launcher will be generated with the repository's Node bundling tool and include the scanner and hook adapter, so installed plugins do not download binaries or require package installation at hook time. The marketplace catalog will point to both local plugin directories.

### Keep hook coverage narrow and explicit

Register synchronous `PreToolUse` handlers for the documented `apply_patch`/file-edit matcher aliases. Do not register `PostToolUse` or broad Bash handlers. The README and skill will direct users to the CLI and GitHub Action for final enforcement of writes that Codex cannot reconstruct before execution.

### Couple plugin versions to the next minor release

Update package, lockfile, source version, plugin metadata, and validation expectations together for the next minor release, assumed to be `1.1.0`. Existing Action behavior remains unchanged, and release publication remains subject to the existing tag workflow and validation gates.

## Risks / Trade-offs

- [Codex hook payloads or matcher aliases can change] -> Test against the installed Codex version, keep event decoding fixtures checked in, and report unsupported payloads visibly.
- [A fail-open hard mode can allow a malformed or unevaluable edit] -> Emit explicit operational context, validate the bundle locally and in CI, and retain CLI/Action final-state enforcement.
- [Reconstruction may not cover every editor shape] -> Support documented payload forms, treat unknown forms as allowed with diagnostics, and avoid claiming full filesystem coverage.
- [Two generated bundles can drift] -> Generate both from one adapter entrypoint and validate their metadata, mode wiring, and reproducibility in CI.
- [Large documents add pre-tool latency] -> Evaluate only files named by the proposed edit rather than scanning the entire workspace.

## Migration Plan

1. Add the adapter, plugin packages, guidance, marketplace metadata, tests, and validation without changing existing scanner or Action behavior.
2. Build both bundles and run direct hook tests plus the isolated Codex smoke harness using a temporary Codex home and marketplace.
3. Release as the next minor version after CI and OpenSpec validation pass; users may install either variant and trust its hooks through Codex.
4. Roll back by disabling or removing the selected plugin; the CLI, Action, and repository content remain unchanged.
