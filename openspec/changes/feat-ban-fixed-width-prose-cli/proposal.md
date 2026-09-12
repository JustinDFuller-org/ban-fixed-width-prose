## Why

Agent-generated and manually formatted prose is often hard-wrapped at a fixed column width, inserting physical line breaks in the middle of sentences and paragraphs. This makes prose harder to read and creates noisy, difficult-to-review diffs, so the repository needs a reusable CLI foundation that can detect and reject the pattern before later GitHub Action and editor-hook integrations are added.

## What Changes

- Add a Node.js 24+ ESM package and executable named `ban-fixed-width-prose`.
- Scan Markdown-family and plain-text files recursively, with positional paths, include/exclude filters, and explicit `--stdin` support for PR descriptions and hooks.
- Detect hard-wrapped logical paragraphs, blockquotes, and list items while preserving deliberate structural Markdown such as code, tables, front matter, headings, thematic breaks, raw HTML, and separate one-line list entries.
- Report deterministic source, line, column, reason, and excerpt findings in JSON by default, with concise text output available.
- Use exit status `0` for clean input, `1` for findings, and `2` for invalid options or operational failures.
- Expose importable scanning functions so future integrations can reuse the detector without duplicating its semantics.
- Add Node test coverage and CI coverage reporting in Cobertura format, enforcing 90% line and branch coverage and uploading results to GitHub Code Quality when permitted.

## Capabilities

### New Capabilities

- `fixed-width-prose-cli`: Detect, report, and reject fixed-width prose in files, directories, and stdin input.

### Modified Capabilities

None.

## Impact

- Adds the CLI package, scanner library, command-line interface, tests, package metadata, and CI workflow.
- Establishes a stable JSON result and exit-code contract for future GitHub Action, Claude, Cursor, and Codex integrations.
- Adds development-only coverage tooling and GitHub Code Quality upload configuration; no runtime dependency or later integration is included in this change.
