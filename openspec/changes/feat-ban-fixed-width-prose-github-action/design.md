## Context

The existing package is a dependency-light Node 24 ESM CLI with reusable `scanText` and `scanPaths` APIs, deterministic findings, and exit statuses for clean, finding, and operational-error results. It has no Action metadata, bundled distribution, release workflow, or Git-aware default discovery. See proposal.md for the motivation and specs for the externally visible contract.

## Goals / Non-Goals

**Goals:**

- Keep the scanner as the single implementation used by the CLI and Action.
- Make the default Action invocation scan repository prose and pull request descriptions without a policy-enablement input.
- Preserve optional CLI-aligned path filtering and diagnostics.
- Keep the Action read-only, safe for fork pull requests, and usable without installing project dependencies in the consuming repository.
- Prove the committed and released bundle on all supported GitHub-hosted operating systems.

**Non-Goals:**

- Posting, updating, or resolving pull request comments or review annotations.
- Adding a second prose parser or changing the scanner's Markdown semantics.
- Automatically editing or reflowing prose.
- Making the Action inject a workflow into a consumer repository; documentation will provide the minimal workflow using checkout and one Action step.

## Decisions

### Use a native JavaScript Action over a subprocess wrapper

The Action will import the package scanner APIs directly and expose a Node 24 `action.yml` entrypoint bundled into a committed `dist/index.js`. This avoids requiring npm installation or a globally available CLI on consumer runners and keeps Action behavior aligned with the canonical scanner.

An executable subprocess wrapper was rejected because it would duplicate argument and error translation, introduce dependency-installation or platform concerns, and make the JavaScript implementation no longer canonical.

### Infer pull request descriptions from the event payload

The Action will inspect `GITHUB_EVENT_NAME` and the JSON file at `GITHUB_EVENT_PATH`. For pull request and pull request-target payloads, it will scan `pull_request.body` as a separate source labelled `pull-request-description`; null or empty bodies are clean. Other events only scan repository sources.

The Action will not add a `check-pr-description` input. Consumers still provide the normal workflow trigger, with documentation recommending `pull_request` activity types that include `opened`, `edited`, `reopened`, and `synchronize`, so description edits re-run the check without privileged execution.

### Preserve CLI-aligned optional inputs

Action inputs will be multiline values for `paths`, `include`, and `exclude`, plus a boolean `debug`. Empty `paths` invokes the repository default scan. Filters apply to repository sources and never suppress the automatic pull request-description scan. The Action will render its own CI-oriented output rather than expose the CLI's JSON/text selector as a second presentation contract.

### Make default discovery Git-aware with a safe fallback

When no explicit paths are supplied and the working directory is a Git worktree, discovery will obtain present tracked and untracked-but-not-ignored paths through Git's standard-exclude behavior, then apply recognized-extension, skipped-directory, include, and exclude filters. This honors nested `.gitignore`, `.git/info/exclude`, and standard Git exclusions while retaining tracked files even if an ignore rule also matches them.

If the default scan is outside a Git worktree or Git cannot be invoked, discovery will fall back to the existing filesystem traversal and directory exclusions so the CLI remains useful in temporary or non-Git directories. Explicit paths remain direct escape hatches and continue to be read even when ignored, subject to explicit filters.

### Report through read-only logs and the Step Summary

The Action will aggregate repository and pull request-description findings into the existing normalized finding shape, sort them deterministically, emit concise safe log lines, and write a Step Summary containing counts and locations. It will use only read-oriented workflow permissions and will fail the step after reporting findings or operational errors. Untrusted excerpts will not be passed as raw workflow-command annotations or shell commands.

The Action will expose `finding-count`, `files-scanned`, `files-with-findings`, and `error-count` outputs. A clean result has zero findings and errors; findings and operational errors both fail the check while retaining their distinct counts and diagnostics.

### Treat the bundled artifact and release as first-class outputs

Source tests will exercise the Action orchestration, while a bundling step will produce the committed `dist/index.js`. CI will fail if the bundle is stale or metadata/version coupling is invalid. Release automation will publish exact version tags and update the major `v1` convenience tag only for stable `1.x.y` releases. A manually dispatchable, release-triggered matrix will run the published artifact on Ubuntu, macOS, and Windows and assert clean, finding, and operational-error outcomes.

### Keep consumer permissions and workflow trust minimal

The documented workflow will use `actions/checkout`, `permissions: contents: read`, and a normal `pull_request` trigger. The Action will not need a token, GitHub API client, write permissions, or a privileged `pull_request_target` workflow. Consumers may pin an immutable commit for supply-chain safety, with `v1` documented as the maintained convenience reference.

## Risks / Trade-offs

- [Git is unavailable or the directory is not a worktree] -> Preserve the existing filesystem fallback and test both Git-aware and fallback discovery.
- [Git command output or repository paths vary across operating systems] -> Use null-delimited output, avoid shell interpolation, normalize paths before matching, and cover Linux/macOS/Windows in released smoke tests.
- [The committed bundle diverges from source] -> Validate the generated artifact in CI and require release checks to run against the exact bundled distribution.
- [Pull request body content is untrusted] -> Treat it only as scanner input, avoid shell evaluation and raw workflow-command annotations, use read-only permissions, and run the documented workflow on `pull_request`.
- [Large repositories produce noisy summaries] -> Keep logs concise, include deterministic counts, and place the complete finding table in the Step Summary while preserving optional filters.
- [Action runtime or release tag drift] -> Couple package version, Action metadata, release tags, and smoke inputs through automated checks before publication.

## Migration Plan

Implement the shared discovery extension and Action in one change, add the consumer workflow and release documentation, then validate the source and bundle locally. Merge the planning-backed implementation to the default branch, publish the first stable version, update `v1`, and manually dispatch released-artifact smoke validation. Rollback is a tag/reference change: consumers pinned to an immutable release remain unaffected, while the moving `v1` tag can be pointed to the last known-good stable release through the normal release procedure.
