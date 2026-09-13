## 1. Release workflow and artifact staging

- [x] 1.1 Refactor `.github/workflows/release.yml` into automatic stable-tag validation and a dependent npm staging job, preserving Node 24 and verifying the workflow contains no direct `npm publish` command.
- [x] 1.2 Validate the tagged commit, package metadata, existing test and coverage suite, generated distributions, package contents, and CLI version before staging; verify the matching-version and mismatch paths with the repository validation commands.
- [x] 1.3 Pack the validated package into a release artifact, generate and verify its SHA-256 checksum, transfer it between jobs, and stage that exact tarball with `npm stage publish --access public`; verify the staging job uses npm 11.15.0 or newer.
- [x] 1.4 Configure the staging job with the `npm-publish` environment, `id-token: write`, npm registry setup, and no long-lived npm publish secret; verify the workflow configuration and trusted-publisher assumptions are explicit.

## 2. Documentation and release contract

- [x] 2.1 Update the release documentation to describe automatic stable-tag kickoff, GitHub environment approval, npm Staged Packages review, npm 2FA approval or rejection, immutable-version retry handling, and post-approval clean-install verification; verify the documented commands and package name are consistent.
- [x] 2.2 Keep the existing package identity, executable, JavaScript exports, stable-tag coupling, and floating-tag protections unchanged; verify package validation and the complete local check suite pass.
- [x] 2.3 Reconcile any remaining direct-publication or pre-approval registry-smoke language in release configuration and documentation; verify no workflow step claims npm availability before staged approval.

## 3. External configuration and hosted proof

- [ ] 3.1 Configure the npm trusted publisher for `JustinDFuller-org/ban-fixed-width-prose`, `release.yml`, and `npm-publish`, then verify an environment-approved staging run authenticates through OIDC without an npm publish token.
- [ ] 3.2 Verify GitHub stable-release tag rules permit only repository administrators to create, update, delete, or force-push protected `vMAJOR.MINOR.PATCH` tags, and verify CI does not mutate release tags.
- [ ] 3.3 Execute one administrator-created stable-tag release, verify automatic staging and npm review visibility, approve the staged package with npm 2FA, and verify the exact public version, provenance, clean install, CLI execution, and rejection/retry behavior.
- [ ] 3.4 Run strict OpenSpec validation and the complete repository validation suite, then verify the working tree contains only the intended implementation and planning changes.
