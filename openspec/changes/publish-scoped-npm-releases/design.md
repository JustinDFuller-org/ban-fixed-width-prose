## Context

The repository currently has a Node 24 package named ban-fixed-width-prose, a stable-tag release workflow, and GitHub Action release promotion. The workflow validates package versions, creates a GitHub Release, and moves the v1 tag, but it does not publish the package to npm. The package is not currently present under either the unscoped or target scoped npm name.

The package tarball already contains the CLI, source API, README, and license while excluding tests and workflow files. The existing executable name and root export are therefore independent of the npm package name and can remain stable.

## Goals / Non-Goals

**Goals:**

- Make the scoped public package the canonical npm identity.
- Publish only verified stable versions from the existing release path.
- Use npm trusted publishing with GitHub Actions OIDC and automatic provenance.
- Prove the exact public registry artifact can be installed and executed.
- Keep retries safe when npm has already accepted an immutable version.

**Non-Goals:**

- Do not publish the GitHub Action bundle as a separate npm distribution.
- Do not create or maintain an unscoped compatibility package.
- Do not backfill or retag the existing v1.1.0 release.
- Do not change scanner behavior, CLI semantics, Action inputs, or plugin behavior.

## Decisions

The package metadata will use @justindfuller/ban-fixed-width-prose as its name, retain ban-fixed-width-prose as its binary, and retain the existing package-root JavaScript exports. The repository URL will identify the exact public GitHub repository so npm trusted publishing can bind the package to the intended source.

Publication will remain in the tag-driven release workflow. The workflow will validate the tag and package metadata, run the existing checks, publish the package with explicit public access, verify the registry artifact, then create the GitHub Release and update v1. Publishing before release promotion prevents a failed npm publication from presenting an apparently complete GitHub release.

The workflow will use npm trusted publishing rather than an NPM_TOKEN. The job will grant id-token: write, configure the npm registry through setup-node, and require an npm CLI version compatible with trusted publishing. The npm package settings must separately authorize the exact repository and release.yml workflow for direct publishing.

The publication step will be retry-safe: it will query the exact scoped version first, accept it only when the version matches, and publish only when it is absent. A clean temporary install from the public registry will exercise the package's CLI entrypoint after publication.

Release validation will cover package identity, repository metadata, version coupling, and package contents. Existing local tests and GitHub Action smoke coverage remain the source of truth for their respective capabilities; the new registry smoke covers only npm distribution.

## Risks / Trade-offs

- [npm trusted-publisher setup is external to the repository] -> Document the exact npm package, GitHub owner, repository, and workflow filename as a release prerequisite and fail clearly when the binding is missing.
- [A package version cannot be republished after a partial workflow failure] -> Verify an already-published exact version and make later workflow steps retryable.
- [Publishing before GitHub Release creation can leave npm published if GitHub promotion fails] -> Keep promotion steps deterministic and make the GitHub release/tag operations safe to retry after registry success.
- [The scoped package name changes the future consumer install path] -> Preserve the executable and JavaScript API shape and document the scoped installation explicitly; no alias is needed because the package has not been published.
- [Registry/network availability can fail after publication] -> Treat the registry smoke as a release gate, while allowing a rerun to verify the already-published immutable version rather than publishing again.

## Migration Plan

Merge the planning and implementation changes without altering existing release tags. Configure the npm trusted publisher for the target package before the next stable tag. The next stable tag publishes the first scoped npm version; existing GitHub Action consumers continue using the repository's GitHub Action references.
