## Purpose

This capability publishes the repository's command-line and JavaScript package to the public npm registry from verified stable releases and proves that consumers can install and run the published artifact.

## Requirements

### Requirement: Release initiation is restricted to repository administrators

Stable release tags matching v*.*.* and floating GitHub Action tags matching v* SHALL be protected by tag rulesets that permit creation, update, and deletion only by repository administrators. CI SHALL never create, update, delete, or force-push a release tag.

#### Scenario: Administrator starts a stable release

- **WHEN** a repository administrator creates a protected v*.*.* tag whose commit contains matching package metadata
- **THEN** the release workflow may begin validation and the npm publication path

#### Scenario: Unauthorized tag action

- **WHEN** a contributor, fork, pull request workflow, or release bot attempts to create, update, delete, or force-push a protected release tag
- **THEN** the tag ruleset rejects the action and no release is initiated

#### Scenario: Floating Action tag promotion

- **WHEN** an administrator manually moves a protected floating v* tag
- **THEN** the GitHub Action reference changes without any CI step creating or updating that tag

### Requirement: Stable releases publish the scoped npm package

The release system SHALL publish @justindfuller/ban-fixed-width-prose as a public npm package when a verified stable v*.*.* release tag is processed, and the published package version SHALL equal the tag version without the leading v.

#### Scenario: Matching stable tag

- **WHEN** CI processes a stable tag whose version matches package.json and package-lock.json
- **THEN** CI publishes the scoped package with the matching semantic version and public visibility

#### Scenario: Version mismatch

- **WHEN** the release tag does not match the package metadata
- **THEN** CI fails before publishing and does not promote the GitHub release

#### Scenario: Non-release ref

- **WHEN** CI runs for a branch, pull request, major alias, or non-stable tag
- **THEN** the npm publication step does not run

### Requirement: The package preserves its consumer entrypoints

The published scoped package SHALL expose the existing ban-fixed-width-prose executable and the existing JavaScript scanner exports, while documenting installation and usage under the scoped package name.

#### Scenario: CLI installation

- **WHEN** a consumer installs @justindfuller/ban-fixed-width-prose
- **THEN** the ban-fixed-width-prose executable is available and reports the published package version

#### Scenario: JavaScript import

- **WHEN** a consumer imports the package root from the scoped package
- **THEN** the existing scanner API remains available without requiring a new import path inside the package

### Requirement: CI uses short-lived trusted publication credentials

The release workflow SHALL publish through the configured npm trusted publisher using GitHub Actions OIDC, SHALL reference the protected npm-publish environment, SHALL require approval from the JustinDFuller account before publication, and SHALL NOT require a long-lived npm publish token stored in repository secrets.

#### Scenario: Approved trusted publication

- **WHEN** an administrator-created stable tag reaches the npm-publish environment and JustinDFuller approves the publication job
- **THEN** npm authenticates the publish through the workflow's OIDC identity and the package receives registry provenance

#### Scenario: Publication waits for approval

- **WHEN** the stable-tag workflow reaches npm publication before the required environment approval
- **THEN** the publication job remains pending and does not contact npm

#### Scenario: Publication authentication unavailable

- **WHEN** the trusted publisher configuration or required OIDC permission is unavailable
- **THEN** publication fails visibly and the GitHub release promotion does not complete

### Requirement: CI validates the public registry artifact

The release process SHALL verify the exact published version from the public npm registry before completing GitHub release promotion.

#### Scenario: Published artifact smoke test

- **WHEN** publication succeeds
- **THEN** CI installs the exact scoped version in a clean temporary environment and successfully runs the ban-fixed-width-prose executable against the published package

#### Scenario: Registry artifact failure

- **WHEN** the exact version is unavailable, has unexpected package contents, or cannot execute from a clean install
- **THEN** CI fails the release and does not alter any floating GitHub Action tag

#### Scenario: Safe release retry

- **WHEN** a release job is retried after the exact package version was already published
- **THEN** CI verifies the existing matching registry version and continues without attempting to republish the immutable version
