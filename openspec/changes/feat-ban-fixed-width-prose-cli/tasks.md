## 1. Package and scanner foundation

- [x] 1.1 Create the Node 24+ ESM package metadata, executable entry point, export map, and development scripts, then verify `npm install` and `npm test` can resolve the package.
- [x] 1.2 Define the normalized finding, summary, and error result shapes and importable scan API, then verify API contract tests pass for text and path inputs.
- [x] 1.3 Implement line normalization and Markdown state tracking for front matter, fenced and indented code, tables, headings, thematic breaks, raw HTML, blank lines, lists, blockquotes, and paragraphs, then verify structural fixture tests pass.

## 2. Fixed-width prose detection

- [x] 2.1 Detect continuation lines in ordinary paragraphs and report one-based source locations, reasons, and excerpts, then verify clean and wrapped paragraph fixtures produce the expected findings.
- [x] 2.2 Detect wrapped blockquotes and list items while preserving separate list-item boundaries, then verify nested, ordered, unordered, and blockquote fixtures pass.
- [x] 2.3 Treat explicit Markdown hard-break markers as violations and verify the corresponding regression tests fail before the implementation is added and pass afterward.

## 3. Input discovery and CLI behavior

- [x] 3.1 Implement recursive recognized-document discovery, default skipped directories, explicit file handling, and repeatable include/exclude filters, then verify discovery integration tests cover matching and skipped paths.
- [x] 3.2 Implement `--stdin`, positional paths, default current-directory scanning, and invalid-input handling, then verify CLI subprocess tests cover files, directories, stdin, and operational errors.
- [x] 3.3 Implement deterministic JSON and text renderers with `--format`, `--debug`, `--help`, and `--version`, then verify output snapshots and path ordering are stable.
- [x] 3.4 Wire findings, clean scans, and operational failures to exit statuses `1`, `0`, and `2`, then verify shell-level exit-code tests cover all outcomes.

## 4. Coverage and CI

- [x] 4.1 Configure the test command to generate Cobertura XML and enforce at least 90% line and branch coverage, then verify the coverage command succeeds and emits the expected report.
- [x] 4.2 Add GitHub Actions CI for default-branch pushes and pull requests using Node 24, dependency installation, tests, and coverage thresholds, then verify the workflow structure and local command parity.
- [x] 4.3 Keep downstream coverage-service integration out of scope; verify CI retains Cobertura generation and threshold enforcement without additional repository permissions.

## 5. Documentation and final validation

- [x] 5.1 Document installation, supported file types, structural exclusions, CLI options, JSON/text output, stdin usage, exit statuses, library exports, and coverage commands, then verify examples match the executable help output.
- [x] 5.2 Run the complete unit, integration, coverage, package, OpenSpec, and repository validation checks, then verify the worktree contains only the intended implementation and planning changes.
