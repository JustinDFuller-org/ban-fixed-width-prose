# ban-fixed-width-prose

Detects and bans hard-wrapped prose in Markdown-family and plain-text files.

## Requirements

Node.js 24 or newer is required.

## Usage

Run `ban-fixed-width-prose` without paths to scan the current directory recursively, or provide files and directories explicitly.

```sh
ban-fixed-width-prose
ban-fixed-width-prose README.md docs
printf 'First line.\nSecond line.\n' | ban-fixed-width-prose --stdin
```

The recursive scan recognizes `.md`, `.markdown`, `.mdown`, `.mkdn`, `.mdx`, and `.txt` files and skips `.git`, `node_modules`, `vendor`, `dist`, `build`, and `coverage` directories.

Use repeatable `--include` and `--exclude` patterns to control discovery. Use `--format text` for concise location output; JSON is the default. `--debug` writes operational diagnostics to stderr.

## Detection

Every non-empty continuation line in a logical paragraph, blockquote, or list item is reported, regardless of line width. Separate one-line list items are allowed.

Fenced and indented code, GFM tables, YAML front matter, headings, thematic breaks, raw HTML, and blank-line-separated blocks are excluded. Explicit Markdown hard breaks remain violations.

## Exit statuses

The command exits with `0` when no findings exist, `1` when findings exist, and `2` for invalid options or operational failures.

JSON output contains `findings`, `summary`, and `errors`. Each finding contains `source`, one-based `line` and `column`, `reason`, and `excerpt`.

## JavaScript API

Import `scanText` for text input and `scanPaths` for files or directories. Both return the normalized findings, summary, and errors used by the CLI.

## GitHub Action

Add checkout and one Action step to a read-only pull request workflow:

```yaml
name: Prose
on:
  pull_request:
    types: [opened, edited, reopened, synchronize]
permissions:
  contents: read
jobs:
  prose:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: JustinDFuller-org/ban-fixed-width-prose@v1
```

The Action scans supported repository documents by default and automatically scans pull request descriptions. Use an immutable commit or release tag when supply-chain pinning is required; `v1` is the maintained major reference. `paths`, `include`, and `exclude` accept newline-separated values, and `debug: true` enables diagnostics. Outputs are `finding-count`, `files-scanned`, `files-with-findings`, and `error-count`.

Findings and operational errors fail the step after being written to safe logs and the Step Summary. The Action is read-only, does not post comments, and retains the scanner's `.git`, dependency, generated, build, coverage, and Git-ignored exclusions for default scans. Explicit paths can scan ignored files.

## Codex plugins

This repository includes a local marketplace catalog with two separately installable Codex plugins:

```sh
codex plugin marketplace add .
codex plugin add ban-fixed-width-prose-hard-block --marketplace ban-fixed-width-prose
# or:
codex plugin add ban-fixed-width-prose-warn --marketplace ban-fixed-width-prose
```

Review and trust the plugin hooks through `/hooks` before using them. The hard-block variant denies supported, reconstructible `PreToolUse` file edits that introduce new findings. The warning variant allows the edit and adds the same remediation guidance to model context. Both variants compare findings by reason and excerpt, so unchanged legacy findings do not block unrelated edits and repairs are allowed.

Coverage is limited to `.md`, `.markdown`, `.mdown`, `.mkdn`, `.mdx`, and `.txt` paths and the registered file-edit tool shapes. Malformed events, reconstruction failures, and scanner failures fail open with a visible diagnostic. Opaque shell writes, generators, redirections, MCP writers, and specialized tool paths may not be reconstructible; use the CLI or GitHub Action for final enforcement.

Disable or remove the selected plugin to roll back its early guidance. This does not change the CLI or Action behavior.

## Development

Run `npm ci` with Node.js 24, `npm test` for the test suite, and `npm run coverage` for Cobertura output and the enforced 90% line-and-branch coverage gate.
