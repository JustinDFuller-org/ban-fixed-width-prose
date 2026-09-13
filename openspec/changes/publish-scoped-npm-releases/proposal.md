## Why

The repository has a versioned npm package but its tag-driven release workflow currently publishes only a GitHub Release. Publishing the package to the public @justindfuller scope will give consumers a stable registry installation path and make each stable release available through npm with CI-backed provenance.

## What Changes

- Publish the package as @justindfuller/ban-fixed-width-prose while preserving the ban-fixed-width-prose executable and JavaScript API.
- Add public npm package metadata and installation/import documentation.
- Extend stable-tag release CI to publish the matching npm version through the npm-publish environment and npm trusted publishing with GitHub Actions OIDC.
- Verify the exact public registry version by installing it in a clean environment and executing the published CLI before completing the GitHub Release promotion.
- Require repository-admin-only protected tag actions for stable releases and floating GitHub Action tags.
- Remove automatic floating-tag updates from CI; admins move v* Action tags manually.

## Capabilities

### New Capabilities

- npm-package-release: Publish the scoped package from stable release tags and validate the released registry artifact.

### Modified Capabilities

No existing CLI or GitHub Action requirement changes; this adds a distribution capability around them.

## Impact

- Affects package.json, package-lock.json, README.md, release validation, and .github/workflows/release.yml.
- Adds npm registry publication as an external release system and requires one-time npm-publish environment and trusted-publisher configuration for the repository's release workflow.
- Requires tag rulesets that allow only repository administrators to create, update, or delete stable and floating release tags.
- Changes the package identity from the currently unpublished unscoped name to the scoped public name; no compatibility alias is required because neither name is currently published.
