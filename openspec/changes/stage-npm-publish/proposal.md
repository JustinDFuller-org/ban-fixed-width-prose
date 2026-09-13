## Why

The current stable-tag workflow publishes the npm package directly, while the sibling `ban-code-comments` repository stages a validated package for explicit npm review and 2FA approval. Adopting that staged release boundary will keep stable tags automatic while preventing an unreviewed CI job from making a package version publicly available.

## What Changes

- Replace direct npm publication with npm staged publication from an exact, validated tarball.
- Validate the administrator-created stable tag, release commit, package metadata, tests, generated artifacts, and package contents before staging.
- Transfer the packed tarball and checksum between validation and staging jobs so the staged package is the artifact that was verified.
- Use the protected `npm-publish` environment, npm trusted publishing, GitHub Actions OIDC, Node 24, and npm 11.15.0 or newer without a long-lived publish token.
- Document npm staging, review, approval, rejection, and the required 2FA handoff.
- Keep the stable-tag trigger automatic and do not add a manual workflow-dispatch kickoff or a `release.published` trigger.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `npm-package-release`: change the release contract from direct CI publication and immediate registry smoke gating to validated npm staging followed by explicit maintainer approval.

## Impact

- Affects `.github/workflows/release.yml`, release documentation, and the npm package release OpenSpec requirements.
- Adds a release-artifact upload/download boundary and npm staged-publishing CLI requirement.
- Keeps the existing package name, executable, JavaScript exports, stable-tag trigger, and Node 24 runtime contract.
- Requires the existing npm trusted publisher and `npm-publish` environment to permit `npm stage publish`; npm approval remains an external 2FA action.
