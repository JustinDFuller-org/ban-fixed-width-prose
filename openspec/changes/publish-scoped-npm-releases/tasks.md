## 1. Package identity and distribution metadata

- [ ] 1.1 Rename the package to @justindfuller/ban-fixed-width-prose, add the exact GitHub repository metadata and public npm publication configuration, regenerate the lockfile, and verify the root package name, binary, exports, and version remain coherent.
- [ ] 1.2 Update README installation, CLI, and JavaScript import examples for the scoped package while preserving the existing executable and Action documentation; verify the documented package name and command paths are consistent.
- [ ] 1.3 Validate the npm tarball contents and verify it includes the CLI, source API, README, and license while excluding tests, workflows, and development-only files.

## 2. Release validation and workflow publication

- [ ] 2.1 Extend release/package validation to enforce the scoped identity, repository metadata, stable tag/version coupling, and package entrypoint contract; verify the validation passes for matching metadata and fails for mismatched tags.
- [ ] 2.2 Update the stable-tag release workflow with npm registry configuration, the required OIDC permission, and a compatible npm CLI; verify no long-lived npm publish token is required.
- [ ] 2.3 Add retry-safe scoped publication before GitHub Release creation, publishing only a missing exact version and accepting an already-published matching version; verify non-release refs and version mismatches cannot publish.
- [ ] 2.4 Add a clean temporary-directory registry smoke test that installs the exact published version and runs the CLI, then keep GitHub Release creation and v1 tag promotion after that smoke test; verify smoke failures prevent release promotion.

## 3. Validation and hosted release proof

- [ ] 3.1 Configure the npm trusted publisher for JustinDFuller-org/ban-fixed-width-prose and release.yml, then verify the next stable tag authenticates through OIDC and produces a public package with provenance.
- [ ] 3.2 Run the complete local test, coverage, Action, bundle, plugin, package, and strict OpenSpec validation suite; verify all checks pass and the working tree contains only intended implementation changes.
- [ ] 3.3 Execute one hosted stable-tag release and verify the exact scoped npm version, clean registry install, CLI result, GitHub Release, and v1 tag before declaring the capability complete.
