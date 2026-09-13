## MODIFIED Requirements

### Requirement: Stable releases publish the scoped npm package

The release system SHALL stage `@justindfuller/ban-fixed-width-prose` as a public npm package when a verified stable `v*.*.*` release tag is processed, and the staged package version SHALL equal the tag version without the leading `v`. The package SHALL become publicly installable only after an authorized maintainer approves the staged package with npm two-factor authentication.

#### Scenario: Matching stable tag

- **WHEN** CI processes a stable tag whose version matches `package.json` and `package-lock.json`
- **THEN** CI stages the exact scoped package version through npm without making it publicly installable before maintainer approval

#### Scenario: Version mismatch

- **WHEN** the release tag does not match the package metadata
- **THEN** CI fails before staging and does not create or promote a release artifact

#### Scenario: Non-release ref

- **WHEN** CI runs for a branch, pull request, major alias, or non-stable tag
- **THEN** the npm staging step does not run

#### Scenario: Staged package approval

- **WHEN** an authorized maintainer reviews the staged package and completes npm approval with two-factor authentication
- **THEN** npm publishes the exact staged version to the public registry

#### Scenario: Staged package rejection

- **WHEN** an authorized maintainer rejects the staged package
- **THEN** that package version is not published and the release is not represented as a successful npm publication

### Requirement: CI uses short-lived trusted publication credentials

The release workflow SHALL use the configured npm trusted publisher and GitHub Actions OIDC to stage the package, SHALL reference the protected `npm-publish` environment, SHALL require JustinDFuller approval before the staging job runs, and SHALL NOT require a long-lived npm publish token stored in repository secrets. Final npm approval SHALL remain a separate maintainer action requiring npm two-factor authentication.

#### Scenario: Approved trusted publication

- **WHEN** an administrator-created stable tag reaches the `npm-publish` environment and JustinDFuller approves the staging job
- **THEN** npm authenticates the staging operation through the workflow's OIDC identity without a long-lived publish token

#### Scenario: Publication waits for approval

- **WHEN** the stable-tag workflow reaches the npm staging job before the required environment approval
- **THEN** the staging job remains pending and does not contact npm

#### Scenario: npm approval requires proof of presence

- **WHEN** a staged package is approved for public publication
- **THEN** npm requires an authorized maintainer to complete two-factor authentication through the npm CLI or npm website

#### Scenario: Publication authentication unavailable

- **WHEN** the trusted publisher configuration or required OIDC permission is unavailable
- **THEN** staging fails visibly and no successful npm publication is claimed

### Requirement: CI validates the public registry artifact

The release process SHALL validate the exact package artifact before staging and SHALL provide a post-approval verification path for the exact public registry version before declaring the npm release complete.

#### Scenario: Published artifact smoke test

- **WHEN** the release workflow prepares a stable package
- **THEN** it validates package metadata and contents, creates a checksum for the exact tarball, and stages that verified tarball rather than rebuilding a different package

#### Scenario: Registry artifact failure

- **WHEN** the staged package has been approved and published
- **THEN** maintainers can verify the exact version from the public npm registry, install it in a clean temporary environment, and run the `ban-fixed-width-prose` executable

#### Scenario: Safe release retry

- **WHEN** the staged tarball checksum or package validation does not match the validated artifact
- **THEN** the staging operation fails and the package is not treated as an approved release

#### Scenario: Safe retry after staging failure

- **WHEN** a retry finds an existing staged version for the same package
- **THEN** the existing stage is inspected and approved or rejected before another stage for that immutable version is attempted
