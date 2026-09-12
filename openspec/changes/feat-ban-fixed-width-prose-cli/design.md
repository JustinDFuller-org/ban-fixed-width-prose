## Context

The repository currently contains only the project README, OpenSpec setup, and a simple code-comment workflow; it has no Node package, scanner, test suite, or CI coverage workflow. The proposal defines a standalone CLI that will later be consumed by platform integrations, so the detector and its result contract must remain independent from GitHub or editor-specific adapters.

## Goals / Non-Goals

**Goals:**

- Provide a dependency-light Node 24+ ESM package with both a command and importable scanner API.
- Preserve exact physical source locations while recognizing enough Markdown structure to avoid common false positives.
- Make clean/finding/error outcomes deterministic for local use, hooks, and future CI wrappers.
- Produce Cobertura coverage data and enforce 90% line and branch coverage in repository CI.

**Non-Goals:**

- Implement the GitHub Action, Claude hook, Cursor hook, or Codex hook integrations.
- Reflow or automatically modify source text.
- Parse arbitrary programming languages or enforce prose formatting outside recognized Markdown-family/plain-text sources.
- Add a repository configuration file or a minimum prose line-width heuristic.

## Decisions

### Use a Markdown-aware line state machine

The scanner will process normalized physical lines while retaining original line numbers and source text. Small explicit states will cover front matter, fenced code, indented code, tables, raw HTML, headings, thematic breaks, list items, blockquotes, and ordinary paragraphs. This is preferred to a full Markdown renderer because the behavior concerns physical line layout, not rendered HTML, and exact locations are part of the public contract.

### Define violations by logical-block continuation

The scanner will flag continuation lines rather than lines exceeding a configured width. This catches short hard wraps, remains stable across different column settings, and directly represents the policy. Explicit Markdown hard breaks remain violations by decision. Blank lines and structural markers terminate or exclude logical blocks; a new list marker begins a new list item.

### Keep discovery conservative and filtering explicit

Directory traversal will recognize Markdown-family and plain-text extensions and skip common dependency/generated directories. Explicit file paths and standard input are intentional escape hatches for hooks and PR-description checks. Include and exclude patterns are repeatable CLI options, with deterministic path ordering before scanning.

### Use one normalized result model for CLI and library consumers

The core API will return findings, summary counts, and errors. Findings will include source, one-based line and column, reason, and excerpt. The CLI will serialize that model as JSON by default or render the same findings as text, avoiding separate semantics for future integrations.

### Use native ESM and development-only coverage tooling

The package will declare Node 24+ compatibility, use built-in filesystem/process APIs and `node:test` where practical, and avoid runtime dependencies. Development dependencies may provide coverage instrumentation and Cobertura output. CI will run on the default branch and pull requests and enforce both thresholds.

### Do not auto-fix findings

The CLI will report violations and fail through its exit code. Reflowing prose is intentionally deferred because joining lines safely requires editorial decisions around list boundaries, hyphenation, links, and embedded syntax.

## Risks / Trade-offs

- [Markdown dialect variation] -> Keep structural recognition explicit, document supported constructs, and use fixture-driven regression tests for both findings and false positives.
- [Conservative extension filtering] -> Permit explicit files and `--stdin` so integrations can scan content that lacks a normal document extension.
- [Parser false positives or misses] -> Report the continuation line and reason, maintain adversarial fixtures, and keep the state machine small enough to audit.
- [Coverage service integration] -> Keep Cobertura generation and threshold enforcement local to CI; downstream coverage-service integration is out of scope.
- [Node 24 compatibility] -> Declare the engine floor and run CI on the declared runtime so unsupported environments fail clearly.

## Migration Plan

Add the package and scanner first, then add fixture-backed unit and CLI integration tests, coverage scripts, and the CI workflow. Existing repository behavior remains unchanged until a later change adopts the CLI in GitHub Actions or hooks. If the CLI contract proves incorrect, revise the package and planning artifacts before adding those integrations; no data migration or source rewrite is required.
