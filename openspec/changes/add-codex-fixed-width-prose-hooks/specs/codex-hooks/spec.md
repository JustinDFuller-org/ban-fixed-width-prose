## Purpose

Provide installable Codex plugins that detect newly introduced hard-wrapped prose at the agent's pre-write tool boundary and either prevent the edit or explain the violation.

## ADDED Requirements

### Requirement: Evaluate reconstructible prose edits before writing

The plugins SHALL inspect supported Codex pre-tool file-edit events and evaluate the proposed content with the existing fixed-width-prose scanner. The plugins SHALL apply this policy only to recognized Markdown-family and plain-text extensions and SHALL leave unsupported paths and unrelated tool calls unchanged.

#### Scenario: Hard mode blocks a newly introduced wrapped paragraph

- **WHEN** an agent proposes an edit to a supported prose file that introduces a continuation line in a logical paragraph, blockquote, or list item
- **THEN** the hard-block plugin denies the tool call with the affected source location and the proposed edit is not applied

#### Scenario: Warn mode allows the same wrapped edit

- **WHEN** an agent proposes the same edit through the warning plugin
- **THEN** the plugin allows the tool call and returns concise model-visible guidance identifying the finding and a compliant alternative

#### Scenario: Structural Markdown remains clean

- **WHEN** an agent proposes wrapped-looking content inside fenced or indented code, front matter, tables, headings, raw HTML, or separate list items
- **THEN** the plugin does not report a fixed-width-prose finding

#### Scenario: Unsupported paths remain unaffected

- **WHEN** an agent proposes an edit to a path outside the CLI's recognized prose extensions
- **THEN** both plugins allow the tool call without fixed-width-prose policy output

### Requirement: Report only newly introduced findings

The plugins SHALL compare the proposed file content with its current content and SHALL report only findings introduced or changed by the edit. Existing findings that remain unchanged SHALL not block or warn on an unrelated edit, and edits that remove existing findings SHALL be allowed.

#### Scenario: Existing finding does not block an unrelated edit

- **WHEN** a supported file already contains a wrapped paragraph and an edit changes unrelated content without changing that finding
- **THEN** both plugins allow the edit without reporting the legacy finding

#### Scenario: Incremental repair is allowed

- **WHEN** an edit removes or reflows an existing fixed-width-prose finding
- **THEN** both plugins allow the edit

#### Scenario: Changed continuation is reported

- **WHEN** an edit changes a previously reported continuation so that the proposed content contains a new or changed finding
- **THEN** the selected plugin applies its hard-block or warning behavior to that finding

### Requirement: Provide distinct hard-block and warning behavior

The project SHALL provide separately installable hard-block and warning Codex plugins with shared policy behavior and mode-specific responses. Hard-block findings SHALL use the Codex pre-tool denial protocol, while warning findings SHALL provide model-visible context without denying the tool call.

#### Scenario: Clean proposed edit proceeds

- **WHEN** a proposed supported-file edit contains no newly introduced fixed-width-prose findings
- **THEN** both plugins allow the edit without policy output

#### Scenario: Hard-block response identifies remediation

- **WHEN** hard mode detects one or more new findings
- **THEN** the denial identifies each affected path and location and directs the agent to remove the physical wrap or use an allowed structural/documentation form

#### Scenario: Warning response identifies remediation

- **WHEN** warning mode detects one or more new findings
- **THEN** the tool call proceeds and the response supplies the affected locations and the same remediation guidance

### Requirement: Handle hook evaluation failures without blocking work

The plugins SHALL fail open when a hook event is malformed, a proposed edit cannot be reconstructed, or scanner evaluation fails. They SHALL expose an actionable model-visible operational warning in both modes and SHALL not silently suppress the failure.

#### Scenario: Malformed event is reported and allowed

- **WHEN** a plugin receives an event that cannot be decoded or does not contain an evaluable file-edit payload
- **THEN** the tool call is not denied and the plugin reports an operational warning

#### Scenario: Scanner failure is reported and allowed

- **WHEN** the scanner or proposed-content evaluation fails unexpectedly
- **THEN** the tool call is not denied and the plugin reports the failure as model-visible context

### Requirement: Package and document the Codex integration

The project SHALL provide valid plugin metadata, synchronous pre-tool hook configuration, self-contained launcher bundles, a shared guidance skill, and a repository marketplace catalog for both variants. Documentation SHALL explain installation, hook trust review, supported coverage, fail-open behavior, and the continued role of the CLI and GitHub Action for opaque writes.

#### Scenario: User installs the hard-block variant

- **WHEN** a user adds the repository marketplace, installs the hard-block plugin, and trusts its hooks
- **THEN** Codex loads the plugin's pre-write fixed-width-prose enforcement

#### Scenario: User installs the warning variant

- **WHEN** a user adds the repository marketplace, installs the warning plugin, and trusts its hooks
- **THEN** Codex loads the same scanner coverage with warning behavior

#### Scenario: Plugin bundle runs without external installation

- **WHEN** Codex invokes an installed plugin hook in an environment without npm installation or runtime network access
- **THEN** the self-contained launcher can load the scanner and evaluate the event
