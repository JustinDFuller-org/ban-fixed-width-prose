## 1. Package and scanner foundation

- [ ] 1.1 Create the Node 24+ ESM package metadata, executable entry point, export map, and development scripts, then verify `npm install` and `npm test` can resolve the package.
- [ ] 1.2 Define the normalized finding, summary, and error result shapes and importable scan API, then verify API contract tests pass for text and path inputs.
- [ ] 1.3 Implement line normalization and Markdown state tracking for front matter, fenced and indented code, tables, headings, thematic breaks, raw HTML, blank lines, lists, blockquotes, and paragraphs, then verify structural fixture tests pass.

## 2. Fixed-width prose detection

- [ ] 2.1 Detect continuation lines in ordinary paragraphs and report one-based source locations, reasons, and excerpts, then verify clean and wrapped paragraph fixtures produce the expected findings.
- [ ] 2.2 Detect wrapped blockquotes and list items while preserving separate list-item boundaries, then verify nested, ordered, unordered, and blockquote fixtures pass.
- [ ] 2.3 Treat explicit Markdown hard-break markers as violations and verify the corresponding regression tests fail before the implementation is added and pass afterward.

## 3. Input discovery and CLI behavior

- [ ] 3.1 Implement recursive recognized-document discovery, default skipped directories, explicit file handling, and repeatable include/exclude filters, then verify discovery integration tests cover matching and skipped paths.
- [ ] 3.2 Implement `--stdin`, positional paths, default current-directory scanning, and invalid-input handling, then verify CLI subprocess tests cover files, directories, stdin, and operational errors.
- [ ] 3.3 Implement deterministic JSON and text renderers with `--format`, `--debug`, `--help`, and `--version`, then verify output snapshots and path ordering are stable.
- [ ] 3.4 Wire findings, clean scans, and operational failures to exit statuses `1`, `0`, and `2`, then verify shell-level exit-code tests cover all outcomes.

## 4. Coverage and CI

- [ ] 4.1 Configure the test command to generate Cobertura XML and enforce at least 90% line and branch coverage, then verify the coverage command succeeds and emits the expected report.
- [ ] 4.2 Add GitHub Actions CI for default-branch pushes and pull requests using Node 24, dependency installation, tests, and coverage thresholds, then verify the workflow structure and local command parity.
- [ ] 4.3 Add conditional GitHub Code Quality coverage upload with the required permission and fork pull-request safety condition, then verify the workflow contains the expected upload inputs and guard.

## 5. Documentation and final validation

- [ ] 5.1 Document installation, supported file types, structural exclusions, CLI options, JSON/text output, stdin usage, exit statuses, library exports, and coverage commands, then verify examples match the executable help output.
- [ ] 5.2 Run the complete unit, integration, coverage, package, OpenSpec, and repository validation checks, then verify the worktree contains only the intended implementation and planning changes.
