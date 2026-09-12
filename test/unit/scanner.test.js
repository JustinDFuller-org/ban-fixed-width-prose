import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { normalizeLines, scanText } from "../../src/scanner.js";

const fixture = (name) => readFile(path.join("test", "fixtures", name), "utf8");

test("normalizes CRLF and CR line endings", () => {
  assert.deepEqual(normalizeLines("one\r\ntwo\rthree"), ["one", "two", "three"]);
});

test("reports paragraph continuation with source location and excerpt", async () => {
  const result = scanText(await fixture("wrapped.md"), "wrapped.md");
  assert.equal(result.findings.length, 1);
  assert.deepEqual(result.findings[0], {
    source: "wrapped.md",
    line: 2,
    column: 1,
    reason: "paragraph-continuation",
    excerpt: "continues on a second line.",
  });
});

test("preserves structural Markdown", async () => {
  const result = scanText(await fixture("clean.md"), "clean.md");
  assert.equal(result.findings.length, 0);
  assert.equal(result.summary.filesScanned, 1);
});

test("ignores front matter, indented code, and raw HTML but reports hard breaks", async () => {
  const result = scanText(await fixture("structures.md"), "structures.md");
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].reason, "explicit-hard-break");
  assert.equal(result.findings[0].line, 16);
});

test("reports blockquote and list continuations but not separate list items", async () => {
  const result = scanText(await fixture("lists.md"), "lists.md");
  assert.deepEqual(result.findings.map(({ line, reason }) => ({ line, reason })), [
    { line: 2, reason: "blockquote-continuation" },
    { line: 5, reason: "list-item-continuation" },
    { line: 9, reason: "list-item-continuation" },
  ]);
});

test("supports nested blockquotes and tilde fences", () => {
  const result = scanText(">> nested quote\n>> continuation\n\n~~~\na\nb\n~~~\n", "nested.md");
  assert.equal(result.findings[0].reason, "blockquote-continuation");
  assert.equal(result.findings.length, 1);
});
