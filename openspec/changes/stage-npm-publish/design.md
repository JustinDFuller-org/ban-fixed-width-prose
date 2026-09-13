## Context

See proposal.md for the motivation. The current release workflow validates the checkout and directly publishes the package from a second job, then waits for registry propagation before running a clean-install smoke test and creating a GitHub Release. The reference `ban-code-comments` workflow instead validates and packs once, transfers the tarball as an artifact, verifies its checksum, and runs `npm stage publish` from a protected publishing job.

The target package already has stable scoped metadata, a public access setting, a Node 24 engine requirement, and a CLI entrypoint. The release change must preserve those consumer contracts while changing when the package becomes public.

## Goals / Non-Goals

**Goals:**

- Make an administrator-created stable tag start the release workflow automatically.
- Ensure the staged package is the exact tarball validated by CI.
- Require both GitHub environment approval before staging and npm maintainer 2FA approval before public publication.
- Use npm trusted publishing and OIDC without a long-lived npm publish token.
- Keep package behavior, package identity, and stable-tag version coupling unchanged.
- Document post-approval registry verification and safe handling of staged retries.

**Non-Goals:**

- Do not change the CLI, scanner, Action, plugin, or package API behavior.
- Do not add a `release.published` trigger or a manual workflow-dispatch kickoff.
- Do not add a compatibility package, direct-publish token, or automatic floating-tag mutation.
- Do not make npm staging claim that the package is publicly available before npm approval.

## Decisions

Use two release jobs modeled on the reference repository. The validation job checks the stable tag, confirms it points at the current `main` commit, installs dependencies, runs the existing checks, validates release metadata and package contents, packs the package, writes a checksum, and uploads the tarball. The staging job depends on validation, downloads the artifact, verifies the checksum, installs a known-compatible npm CLI, and stages the artifact.

Use the existing stable-tag push trigger. This preserves automatic kickoff while ensuring pull requests, branches, floating tags, and GitHub Release objects cannot initiate npm staging.

Use the `npm-publish` environment and `id-token: write` permission for the staging job. Configure npm trusted publishing for the exact repository, workflow filename, and environment. No `NODE_AUTH_TOKEN` or long-lived publish secret is part of the design.

Keep release evidence in two layers: CI proves the tarball that entered staging, and the maintainer verifies the public package after npm approval. The workflow must not treat staging as public availability, and a staged version must be resolved or rejected before retrying that immutable version.

The existing GitHub Release promotion and registry smoke logic must not be used to imply that npm is public before approval. The implementation should align the release workflow’s completion boundary with the reference staged flow and retain only release behavior that remains truthful under that boundary.

## Risks / Trade-offs

- [npm approval is outside the GitHub workflow] -> Document the Staged Packages review and 2FA action, and report staging separately from public publication.
- [A staged version is immutable] -> Require inspection and approval or rejection of an existing stage before retrying.
- [The staging job could publish a different artifact if it rebuilds] -> Upload the validated tarball and verify its checksum before staging.
- [Trusted-publisher configuration is external] -> Bind npm to the exact repository, `release.yml`, and `npm-publish` environment and fail visibly when the binding is absent.
- [Removing the direct registry smoke gate reduces automation after approval] -> Retain a documented clean-install CLI verification procedure as release acceptance evidence.

## Migration Plan

Merge the planning and implementation changes without changing existing published versions or tags. Confirm the npm trusted publisher, GitHub environment reviewer, and protected stable-tag rules before the next version. Push the next administrator-created stable tag, approve the GitHub environment job, review the staged package in npm, approve it with 2FA, and perform the documented clean-install verification. Reject the staged package and correct the source if review fails; do not attempt to reuse a pending stage without resolving it first.
