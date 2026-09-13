# github-action Specification

## Purpose
This capability provides a maintained, read-only GitHub Action that imports the fixed-width prose rule into another repository's CI and enforces it consistently across repository documents and pull request descriptions.

## Requirements

### Requirement: Action scans repository prose by default

The Action SHALL scan the checked-out repository for every supported prose document when invoked without path filters, using the CLI discovery exclusions and Git-ignored-file behavior.

#### Scenario: Default clean repository scan

- **WHEN** a consumer invokes the Action after checking out its repository without inputs
- **THEN** the Action scans supported Markdown-family and plain-text documents, skips excluded or Git-ignored content, and succeeds when no findings or operational errors exist

#### Scenario: Default repository findings

- **WHEN** a supported document contains fixed-width prose
- **THEN** the Action reports the source location and fails the check

### Requirement: Action scans pull request descriptions automatically

The Action SHALL scan the pull request description automatically when the GitHub event payload is a pull request event, without requiring an enablement input, and SHALL treat an absent or empty description as clean.

#### Scenario: Pull request description finding

- **WHEN** the Action runs for a pull request whose description contains fixed-width prose
- **THEN** the Action reports the finding with a pull request description source label and fails the check

#### Scenario: Empty or non-pull-request event description

- **WHEN** the pull request description is absent or the Action runs for an event without a pull request payload
- **THEN** the Action does not invent a description finding and continues with repository scanning

### Requirement: Action exposes optional CLI-aligned inputs

The Action SHALL accept optional path, include-pattern, exclude-pattern, and debug inputs, with multiline values representing repeated CLI arguments, while preserving automatic repository and pull request-description scanning by default.

#### Scenario: Consumer narrows repository scanning

- **WHEN** a consumer supplies paths or include/exclude patterns
- **THEN** the Action applies those filters to repository sources while continuing to apply the automatic pull request-description check when a pull request payload exists

#### Scenario: Consumer enables diagnostics

- **WHEN** a consumer enables the debug input
- **THEN** the Action emits operational scan details without changing findings or pass/fail semantics

### Requirement: Action reports results without write permissions

The Action SHALL use read-only logs and a GitHub Step Summary to report deterministic findings and SHALL NOT require GitHub API write permissions, create pull request comments, or update review state.

#### Scenario: Findings summary

- **WHEN** one or more repository or pull request-description findings exist
- **THEN** the Action lists source, line, column, reason, and excerpt information in its logs and Step Summary and fails the check

#### Scenario: Operational error

- **WHEN** a requested source cannot be read or an input is invalid
- **THEN** the Action reports the operational error and fails the check distinctly from a clean result

### Requirement: Action exposes deterministic outputs and a stable import surface

The Action SHALL publish documented finding and scan-count outputs, use a committed bundled entrypoint, and provide a versioned release reference suitable for consumers to pin to a major tag or immutable release.

#### Scenario: Clean release invocation

- **WHEN** a consumer invokes a released Action version against clean inputs
- **THEN** the bundled Action runs on the declared Node runtime, reports zero findings through its outputs, and succeeds

#### Scenario: Released finding invocation

- **WHEN** a consumer invokes a released Action version against inputs with findings
- **THEN** the bundled Action reports nonzero finding outputs and fails with the same finding locations validated from the source implementation

### Requirement: Repository validates the published Action artifact

The repository SHALL test the Action source and bundled artifact, validate release/version coupling, and provide manually dispatchable hosted smoke coverage for the supported GitHub runner operating systems.

#### Scenario: Bundle and contract validation

- **WHEN** repository CI runs
- **THEN** it verifies the Action metadata, generated bundle, documented inputs/outputs, scanner tests, and coverage thresholds

#### Scenario: Cross-platform released smoke

- **WHEN** maintainers dispatch the release smoke workflow for a published Action version
- **THEN** Linux, macOS, and Windows jobs validate clean scans, expected finding failures, and operational failures using the released artifact
