## Purpose

This capability provides a reusable command-line and JavaScript scanning contract for finding hard-wrapped prose and enforcing a repository-wide ban through deterministic reports and exit statuses.

## ADDED Requirements

### Requirement: CLI accepts repository and standard-input sources

The CLI SHALL scan recursively from the current directory when no path is supplied, SHALL accept positional files and directories, and SHALL accept `--stdin` for scanning text supplied through standard input.

#### Scenario: Default repository scan

- **WHEN** the user runs the CLI without paths or `--stdin`
- **THEN** the CLI recursively scans recognized Markdown-family and plain-text files below the current directory

#### Scenario: Positional file and directory scan

- **WHEN** the user supplies one or more files or directories
- **THEN** the CLI scans each requested source subject to include and exclude filters

#### Scenario: Standard-input scan

- **WHEN** the user supplies `--stdin` and text is available on standard input
- **THEN** the CLI scans that text and identifies it as a standard-input source in its findings

### Requirement: Discovery excludes irrelevant repository content

Recursive discovery SHALL skip `.git`, dependency, generated, build, and coverage directories by default, and SHALL support repeatable include and exclude path filters.

#### Scenario: Ignored directory

- **WHEN** a recognized document exists below a skipped dependency or generated directory
- **THEN** the default recursive scan does not report findings from that document

#### Scenario: Include and exclude filters

- **WHEN** the user supplies include or exclude patterns
- **THEN** only sources matching the resulting filters are scanned

### Requirement: Scanner detects hard-wrapped logical prose

The scanner SHALL report every non-empty continuation line within a logical prose paragraph, blockquote, or list item, regardless of the physical line width or whether the line uses an explicit Markdown hard-break marker.

#### Scenario: Wrapped paragraph

- **WHEN** consecutive non-empty lines form one paragraph and the paragraph contains more than one physical line
- **THEN** each continuation line is reported as a fixed-width prose finding

#### Scenario: Wrapped blockquote

- **WHEN** consecutive blockquote lines continue one prose block across multiple physical lines
- **THEN** each continuation line is reported with a blockquote-specific reason

#### Scenario: Wrapped list item

- **WHEN** one list item continues onto a non-empty line without starting a new list item
- **THEN** the continuation line is reported as a fixed-width prose finding

#### Scenario: Explicit Markdown hard break

- **WHEN** a continuation line follows a prose line ending in two spaces or a backslash
- **THEN** the continuation line is still reported

### Requirement: Scanner preserves structural Markdown and deliberate list boundaries

The scanner SHALL exclude fenced and indented code, GFM tables, YAML front matter, headings, thematic breaks, raw HTML, blank-line-separated blocks, and standalone one-line list items from fixed-width prose findings.

#### Scenario: Code and front matter

- **WHEN** wrapped-looking lines occur inside a fenced code block, indented code block, or YAML front matter block
- **THEN** the scanner reports no prose findings for those lines

#### Scenario: Structural Markdown

- **WHEN** lines belong to a table, heading, thematic break, or raw HTML block
- **THEN** the scanner reports no prose findings for those lines

#### Scenario: Separate list items

- **WHEN** consecutive prose lines each begin a separate unordered or ordered list item marker
- **THEN** each list item is treated as its own logical block and no finding is reported solely because the items are on separate lines

### Requirement: CLI reports findings and uses enforcement exit statuses

The CLI SHALL emit deterministic JSON by default, SHALL support concise text output, and SHALL use exit status `0` for clean input, `1` when findings exist, and `2` for invalid options or operational failures.

#### Scenario: Clean scan

- **WHEN** all scanned sources contain no fixed-width prose
- **THEN** the CLI emits an empty findings collection and exits with status `0`

#### Scenario: Findings scan

- **WHEN** one or more fixed-width prose findings are detected
- **THEN** the CLI reports every finding and exits with status `1`

#### Scenario: Invalid option or scan failure

- **WHEN** the user supplies invalid options or a requested source cannot be read
- **THEN** the CLI reports the operational error and exits with status `2`

### Requirement: JavaScript consumers can reuse the scanner contract

The package SHALL expose importable scanning functions that return the same normalized findings and summary data used by the CLI.

#### Scenario: Programmatic text scan

- **WHEN** a JavaScript consumer passes text and a source label to the scanning API
- **THEN** it receives normalized findings with source, line, column, reason, and excerpt fields

#### Scenario: Programmatic path scan

- **WHEN** a JavaScript consumer passes files or directories and scan options to the scanning API
- **THEN** it receives deterministic findings, summary counts, and operational errors without needing to parse CLI output

### Requirement: CI measures and enforces implementation coverage

The repository CI SHALL run the complete Node.js test suite on pushes to the default branch and pull requests, SHALL generate a Cobertura XML coverage report, SHALL enforce at least 90 percent line coverage and 90 percent branch coverage, and SHALL upload the report to GitHub Code Quality when the event has permission to upload it.

#### Scenario: Coverage threshold passes

- **WHEN** the test suite completes with at least 90 percent line and branch coverage
- **THEN** CI succeeds and produces the Cobertura coverage report

#### Scenario: Coverage threshold fails

- **WHEN** either line or branch coverage is below 90 percent
- **THEN** the CI test job fails

#### Scenario: Fork pull request

- **WHEN** CI runs for a pull request from a fork
- **THEN** tests and coverage thresholds still run, while the coverage upload is skipped unless the event satisfies GitHub’s safe upload condition
