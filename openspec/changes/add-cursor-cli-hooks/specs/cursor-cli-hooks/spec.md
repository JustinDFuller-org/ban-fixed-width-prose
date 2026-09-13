## Purpose

Provide native Cursor CLI marketplace plugins that apply the repository's deterministic fixed-width-prose policy at Cursor's file-edit hook boundary.

## ADDED Requirements

### Requirement: Evaluate supported Cursor file edits before execution

The Cursor integration SHALL inspect native Cursor `preToolUse` events for supported `Write` and `Edit` tools, reconstruct the proposed Markdown-family or plain-text content, and apply the existing fixed-width-prose scanner. Unsupported paths and unrelated tools SHALL pass through without fixed-width-prose policy output.

#### Scenario: Hard-block mode denies a newly wrapped write

- **WHEN** Cursor CLI proposes a supported prose-file `Write` or `Edit` that introduces a fixed-width-prose finding
- **THEN** the hard-block plugin returns Cursor-native permission `deny` before the tool executes and identifies the affected source location

#### Scenario: Warning mode permits the proposed edit

- **WHEN** Cursor CLI proposes the same edit through the warning plugin
- **THEN** the edit remains permitted and the plugin records the newly introduced findings for its post-write advisory

#### Scenario: Unsupported and unrelated operations pass through

- **WHEN** Cursor CLI proposes an unsupported extension, an unrelated tool, or an unrecognized edit payload
- **THEN** the integration does not make a fixed-width-prose permission decision for that operation

### Requirement: Report only newly introduced findings

The Cursor integration SHALL compare the current content with the reconstructed proposed content and SHALL identify only findings introduced or changed by the edit. Existing findings that remain unchanged SHALL not be reported, and edits that remove findings SHALL be allowed.

#### Scenario: Legacy finding is excluded

- **WHEN** a supported file already contains a finding and a Cursor edit changes unrelated content without changing that finding
- **THEN** neither plugin blocks the edit or includes the legacy finding in policy guidance

#### Scenario: Repair is allowed

- **WHEN** a Cursor edit removes or reflows an existing finding
- **THEN** the edit is allowed and no fixed-width-prose advisory is emitted for the repaired finding

#### Scenario: Changed finding is included

- **WHEN** a Cursor edit changes an existing continuation so that the proposed content contains a new or changed finding
- **THEN** hard-block mode denies the edit and warning mode includes only that new or changed finding in its post-write advisory

### Requirement: Provide Cursor-native severity responses

The project SHALL provide separately installable hard-block and warning Cursor plugins. Hard-block responses SHALL use Cursor's native `permission: "deny"` protocol. Warning responses SHALL allow the edit and SHALL use Cursor's post-write context channel for findings identified before the edit.

#### Scenario: Hard-block response gives remediation

- **WHEN** hard-block mode detects one or more new findings
- **THEN** the denial identifies every affected location and directs the agent to remove the physical wrap or use an allowed structural or documentation form

#### Scenario: Warning advisory is post-write and finding-scoped

- **WHEN** warning mode permits an edit that introduced one or more findings
- **THEN** post-write context is emitted after the successful edit and names only the newly introduced findings, with the same remediation guidance

#### Scenario: Clean edit has no policy output

- **WHEN** a supported edit introduces no finding
- **THEN** both plugins allow the operation without fixed-width-prose policy output

### Requirement: Isolate concurrent warning evaluations

The warning plugin SHALL correlate each pre-write evaluation with its matching post-write event without mixing state between simultaneous Cursor sessions, conversations, generations, or edits operating in the same workspace.

#### Scenario: Concurrent edits in one directory remain independent

- **WHEN** multiple Cursor sessions in the same directory evaluate edits concurrently
- **THEN** each post-write advisory contains only the findings belonging to its own tool event

#### Scenario: Missing correlation cannot cause a false advisory

- **WHEN** a warning event lacks a stable correlation identity or its matching state is missing or expired
- **THEN** the operation remains allowed and the plugin does not attribute findings from another event to it

### Requirement: Fail open with visible operational diagnostics

The Cursor integrations SHALL allow work to continue when an event is malformed, a path or edit cannot be safely reconstructed, temporary state cannot be correlated, or scanner evaluation fails. They SHALL provide an actionable operational diagnostic through the hook's supported output or error channel.

#### Scenario: Malformed or unsafe event is allowed

- **WHEN** Cursor sends malformed JSON, an unsafe path, or an unsupported edit shape
- **THEN** the hook does not block the operation and reports why evaluation was skipped

#### Scenario: Scanner or state failure is allowed

- **WHEN** scanning, atomic warning-state persistence, or warning-state retrieval fails
- **THEN** the operation remains allowed and the failure is surfaced as an operational diagnostic without claiming a prose finding

### Requirement: Package and document the Cursor CLI integration

The project SHALL provide a valid Cursor multi-plugin marketplace manifest, separately installable hard-block and warning plugin manifests, native hook registrations, self-contained launchers, shared guidance, and CLI-focused installation and rollback documentation. The package SHALL be versioned as integration version `1.3.0`.

#### Scenario: User installs the hard-block plugin

- **WHEN** a user installs the repository marketplace, selects the hard-block Cursor plugin, and trusts or enables its hooks
- **THEN** Cursor CLI loads the plugin and applies pre-write fixed-width-prose enforcement to supported `Write` and `Edit` events

#### Scenario: User installs the warning plugin

- **WHEN** a user installs the warning Cursor plugin and enables its hooks
- **THEN** Cursor CLI permits supported edits and delivers post-write context only for newly introduced findings

#### Scenario: Plugin runs without package installation or network access

- **WHEN** Cursor CLI invokes an installed plugin hook without npm installation or runtime network access
- **THEN** the self-contained launcher evaluates the event using the declared Node.js runtime
