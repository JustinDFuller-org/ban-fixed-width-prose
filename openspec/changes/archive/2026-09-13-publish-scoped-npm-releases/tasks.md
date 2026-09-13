## 1. Package identity and distribution metadata

- [x] 1.1 Rename the package to @justindfuller/ban-fixed-width-prose, add the exact GitHub repository metadata and public npm publication configuration, regenerate the lockfile, and verify the root package name, binary, exports, and version remain coherent.
- [x] 1.2 Update README installation, CLI, and JavaScript import examples for the scoped package while preserving the existing executable and Action documentation; verify the documented package name and command paths are consistent.
- [x] 1.3 Validate the npm tarball contents and verify it includes the CLI, source API, README, and license while excluding tests, workflows, and development-only files.

## 2. Release validation and workflow publication

- [x] 2.1 Extend release/package validation to enforce the scoped identity, repository metadata, stable tag/version coupling, and package entrypoint contract; verify the validation passes for matching metadata and fails for mismatched tags.
- [x] 2.2 Update the stable-tag release workflow with npm registry configuration, the npm-publish environment, the required OIDC permission, and a compatible npm CLI; verify publication remains pending until JustinDFuller approval and no long-lived npm publish token is required.
- [x] 2.3 Add retry-safe scoped publication before GitHub Release creation, publishing only a missing exact version and accepting an already-published matching version; verify non-release refs, unauthorized tag actions, and version mismatches cannot publish.
- [x] 2.4 Add a clean temporary-directory registry smoke test that installs the exact published version and runs the CLI, then keep GitHub Release creation after that smoke test; verify smoke failures prevent release promotion and CI never updates a floating tag.

## 3. Validation and hosted release proof

- [ ] 3.1 Configure admin-only tag rulesets for stable and floating v* tags, and verify contributors, forks, and the current release bot cannot create, update, delete, or force-push them.
- [ ] 3.2 Configure the npm trusted publisher for JustinDFuller-org/ban-fixed-width-prose, npm-publish, and release.yml; verify an approved stable tag authenticates through OIDC and produces the public @justindfuller/ban-fixed-width-prose package with provenance.
- [x] 3.3 Run the complete local test, coverage, Action, bundle, plugin, package, and strict OpenSpec validation suite; verify all checks pass and the working tree contains only intended implementation changes.
- [ ] 3.4 Execute one hosted admin-created stable-tag release and verify JustinDFuller approval, the exact scoped npm version, clean registry install, CLI result, GitHub Release, unchanged floating tags, and manual admin promotion of any v* Action tag before declaring the capability complete.
