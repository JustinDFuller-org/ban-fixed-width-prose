## Why

The fixed-width prose CLI is ready for local use, but other repositories cannot currently adopt its rule as a maintained CI check. A JavaScript GitHub Action will make the rule importable with a single workflow step, automatically cover pull request descriptions, and provide trustworthy release artifacts for consumers.

## What Changes

- Add a Node 24 JavaScript GitHub Action backed directly by the existing scanner APIs.
- Scan the checked-out repository's supported prose documents by default and automatically scan the pull request description on pull request events.
- Expose optional path, include, exclude, and debug inputs while keeping the zero-input behavior fully automatic.
- Make default repository discovery honor standard Git ignored files in addition to the existing dependency, generated, build, and coverage exclusions.
- Report findings through safe read-only logs and a GitHub Step Summary, then fail the check when findings or operational errors exist.
- Add committed Action bundling, consumer documentation, versioned release automation, the `v1` major tag, and released-artifact smoke validation on Linux, macOS, and Windows.

## Capabilities

### New Capabilities

- `github-action`: Importable Node 24 GitHub Action for repository and pull request description fixed-width prose enforcement, with documented inputs, outputs, failure behavior, release artifacts, and hosted validation.

### Modified Capabilities

- `fixed-width-prose-cli`: Default repository discovery also excludes files ignored by standard Git rules while retaining explicit-path escape hatches and existing recognized-file and skipped-directory behavior.

## Impact

- Adds Action metadata, bundled distribution, Action-facing JavaScript orchestration, tests, workflows, release configuration, and README usage documentation.
- Extends the existing JavaScript discovery API and its integration tests to support Git-aware default scans.
- Adds build-time bundling dependencies and release/validation workflow permissions, while keeping the runtime Action read-only and independent of GitHub API writes.
