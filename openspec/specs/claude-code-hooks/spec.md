# Claude Code Hooks Specification

## Purpose

Provide installable Claude Code plugins that detect newly introduced hard-wrapped prose before native file edits execute, with selectable hard-block and warning behavior.

## Requirements

### Requirement: Evaluate native Claude file edits before execution

The plugins SHALL inspect Claude Code `PreToolUse` events for native `Write` and `Edit` tools before the tool call executes. They SHALL evaluate only recognized Markdown-family and plain-text paths with the existing fixed-width-prose scanner and SHALL leave unrelated tools and unsupported paths unchanged.

#### Scenario: Hard mode blocks a wrapped Write

- **WHEN** Claude proposes a `Write` call for a supported prose path whose proposed content introduces a continuation line in a logical paragraph, blockquote, or list item
- **THEN** the hard-block plugin returns a Claude Code denial identifying the affected source location and the write does not execute

#### Scenario: Warn mode allows the same Write

- **WHEN** Claude proposes the same wrapped `Write` through the warning plugin
- **THEN** the write remains eligible to execute and Claude receives guidance identifying the finding and a compliant alternative

#### Scenario: Edit replacement is evaluated before execution

- **WHEN** Claude proposes an `Edit` call with an existing file path, an old string, and a new string that introduces wrapped prose
- **THEN** the selected plugin evaluates the reconstructed result before the replacement executes and applies its hard-block or warning behavior

#### Scenario: Unsupported and unrelated calls pass through

- **WHEN** Claude proposes an unsupported file extension, a non-file tool call, or a specialized file tool outside the registered native boundary
- **THEN** the plugin produces no fixed-width-prose policy decision

### Requirement: Report only newly introduced findings

The plugins SHALL compare the current file content with the reconstructed proposed content and SHALL report only findings introduced or changed by the edit. Existing findings that remain unchanged SHALL not block or warn on unrelated edits, and edits that remove findings SHALL be allowed.

#### Scenario: Legacy finding remains unchanged

- **WHEN** a supported file already contains a finding and a native edit changes unrelated content without changing that finding
- **THEN** both plugin modes allow the edit without reporting the legacy finding

#### Scenario: Existing finding is repaired

- **WHEN** a native edit removes or reflows an existing finding
- **THEN** both plugin modes allow the edit

#### Scenario: Changed finding is reported

- **WHEN** an edit changes a previously reported continuation so that the proposed content contains a new or changed finding
- **THEN** the selected plugin applies its hard-block or warning behavior to that finding

### Requirement: Provide Claude-specific hard-block and warning responses

The project SHALL provide separately installable hard-block and warning Claude Code plugins with shared scanner coverage. Hard-block findings SHALL return a Claude Code `PreToolUse` denial with affected paths and locations. Warning findings SHALL return model-visible `additionalContext` without denying the tool call.

#### Scenario: Clean edit proceeds without policy output

- **WHEN** a supported native edit contains no newly introduced findings
- **THEN** the plugin returns no policy output and the normal Claude Code permission flow continues

#### Scenario: Denial explains remediation

- **WHEN** hard mode detects one or more new findings
- **THEN** Claude receives a denial that identifies every affected location and directs it to remove the physical wrap or use an allowed structural or documentation form

#### Scenario: Warning explains remediation

- **WHEN** warning mode detects one or more new findings
- **THEN** Claude receives the affected locations and the same remediation guidance while the tool call remains allowed

### Requirement: Fail open with visible operational diagnostics

The plugins SHALL allow the tool call when an event is malformed, a file edit cannot be reconstructed, a path cannot be safely resolved, or scanner evaluation fails. They SHALL return model-visible operational context describing the failure and SHALL keep hook output valid for Claude Code’s `PreToolUse` protocol.

#### Scenario: Malformed event is allowed and reported

- **WHEN** the plugin receives malformed JSON or an event without an evaluable native edit payload
- **THEN** it does not deny the tool call and returns an operational warning in Claude-visible hook context

#### Scenario: Reconstruction failure is allowed and reported

- **WHEN** the current file cannot be read, an `Edit` replacement is invalid or ambiguous, or a proposed path escapes the event workspace
- **THEN** the plugin allows the call and reports the reconstruction failure as operational context

#### Scenario: Scanner failure is allowed and reported

- **WHEN** scanner evaluation fails unexpectedly
- **THEN** the plugin allows the call and reports the scanner failure as operational context

### Requirement: Package and document the Claude Code integration

The project SHALL provide valid Claude plugin manifests, a repository marketplace catalog, synchronous `PreToolUse` hook configuration for exact `Write` and `Edit` matching, self-contained launchers, shared guidance, and installation documentation. Documentation SHALL explain hook trust review, supported coverage, fail-open behavior, version `1.2.0`, and the continued role of the CLI and GitHub Action for writes outside the native boundary.

#### Scenario: User installs the hard-block variant

- **WHEN** a user adds the Claude marketplace, installs the hard-block plugin, and trusts its hooks
- **THEN** Claude Code loads the plugin and applies pre-write fixed-width-prose enforcement to native `Write` and `Edit` calls

#### Scenario: User installs the warning variant

- **WHEN** a user adds the Claude marketplace, installs the warning plugin, and trusts its hooks
- **THEN** Claude Code loads the plugin and applies warning behavior to the same native calls

#### Scenario: Installed launcher has no package-install requirement

- **WHEN** Claude Code invokes an installed plugin in an environment without npm installation or runtime network access
- **THEN** the bundled launcher loads the scanner and evaluates the event using the project’s declared Node.js runtime
