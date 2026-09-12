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

## Development

Run `npm ci` with Node.js 24, `npm test` for the test suite, and `npm run coverage` for Cobertura output and the enforced 90% line-and-branch coverage gate.
