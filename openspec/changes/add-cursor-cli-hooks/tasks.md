## 1. Cursor adapter

- [x] 1.1 Add the shared Cursor hook adapter and mode entrypoints, reusing scanner and differential finding behavior; verify focused adapter tests cover Write/Edit reconstruction and Cursor-native responses
- [x] 1.2 Implement fail-open path safety, malformed-event diagnostics, and recognized extension/tool filtering; verify unsafe paths, unsupported tools, scanner failures, and repairs are covered by tests

## 2. Warning correlation

- [x] 2.1 Add per-event OS-temp warning state with atomic persistence, correlation identity, consumption, and TTL cleanup; verify concurrent same-workspace sessions cannot cross-report findings
- [x] 2.2 Implement postToolUse warning advisories that emit only newly introduced findings and no output for clean/legacy edits; verify clean, legacy, changed, missing, expired, and mismatched state cases

## 3. Cursor packaging

- [x] 3.1 Add the Cursor marketplace and two plugin manifests with native hook registrations, shared guidance, and Node 24 self-contained launchers; verify all declared paths, versions, and hook matchers
- [x] 3.2 Extend the bundle and validation scripts without changing Codex or Claude outputs; verify existing plugin checks and the Cursor manifest validator pass
- [x] 3.3 Update CLI-focused documentation with installation, severity selection, post-write warning timing, fail-open behavior, unsupported write boundaries, rollback, and marketplace import guidance; verify documented commands and paths match manifests

## 4. Verification

- [x] 4.1 Add focused Cursor fixtures and unit/integration tests for hard-block, warning, structural Markdown, offline execution, and operational failures; verify the complete Node test and coverage gates pass
- [ ] 4.2 Run a disposable real Cursor CLI smoke using the installed CLI and local plugin path; verify actual file contents and hard=deny, warn=post-write-context, clean=allow, legacy=allow, repair=allow, unsupported=allow, and malformed=diagnostic outcomes
- [ ] 4.3 Run strict OpenSpec and repository validation; verify openspec validate --changes --strict --no-interactive and the full project check pass
