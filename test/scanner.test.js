import test from "node:test";
import assert from "node:assert/strict";
import { scanText } from "../src/scanner.js";

test("clean single-line prose has no findings", () => {
  const result = scanText("A complete sentence stays on one physical line.\n", { source: "clean.md" });
  assert.deepEqual(result.findings, []);
  assert.deepEqual(result.summary, { filesScanned: 1, filesWithFindings: 0, findingCount: 0 });
});

test("reports every continuation line in a paragraph", () => {
  const result = scanText("First sentence starts here.\nSecond line continues it.\nThird line continues it too.", { source: "wrapped.md" });
  assert.deepEqual(result.findings, [
    { source: "wrapped.md", line: 2, column: 1, reason: "paragraph-continuation", excerpt: "Second line continues it." },
    { source: "wrapped.md", line: 3, column: 1, reason: "paragraph-continuation", excerpt: "Third line continues it too." }
  ]);
});

test("blank lines separate paragraphs", () => {
  const result = scanText("One complete paragraph.\n\nAnother complete paragraph.", { source: "clean.md" });
  assert.equal(result.findings.length, 0);
});

test("reports wrapped blockquotes", () => {
  const result = scanText("> First quoted line.\n> Second quoted line.", { source: "quote.md" });
  assert.equal(result.findings[0].reason, "blockquote-continuation");
  assert.equal(result.findings[0].line, 2);
});

test("reports wrapped list items and accepts separate items", () => {
  const wrapped = scanText("- First item starts here.\n  continuation of first item.", { source: "list.md" });
  const separate = scanText("- First item.\n- Second item.\n1. Numbered item.", { source: "list.md" });
  assert.equal(wrapped.findings[0].reason, "list-item-continuation");
  assert.equal(separate.findings.length, 0);
});

test("recognizes nested and quoted list starts", () => {
  const result = scanText("> - First item.\n> - Second item.\n  continuation.", { source: "nested.md" });
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].reason, "list-item-continuation");
});

test("reports continuations inside quoted list items", () => {
  const result = scanText("> - First item.\n> continuation.", { source: "quoted-list.md" });
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].reason, "list-item-continuation");
  assert.equal(result.findings[0].line, 2);
});

test("does not join a following paragraph to a list item", () => {
  const result = scanText("- item\nseparate paragraph", { source: "list-boundary.md" });
  assert.equal(result.findings.length, 0);
});

test("ignores blank quoted lines and nested structural blocks", () => {
  const result = scanText("> quote\n>\n> next paragraph\n> ```js\n> code\n> ```\n> <svg>\n> markup\n> </svg>", { source: "nested-structure.md" });
  assert.equal(result.findings.length, 0);
});

test("ignores multiline inline HTML comments", () => {
  const result = scanText("Before <!-- comment\nstill inside comment -->\nAfter", { source: "comment.md" });
  assert.equal(result.findings.length, 0);
});

test("ignores arbitrary raw HTML blocks", () => {
  const result = scanText("<custom-element>\nwrapped content\n</custom-element>", { source: "custom.html.md" });
  assert.equal(result.findings.length, 0);
});

test("handles nested quoted structures and inline comment boundaries", () => {
  const nested = scanText("> > ```\n> > code\n> > ```\n> > <custom-element>\n> > markup\n> > </custom-element>", { source: "nested-quotes.md" });
  assert.equal(nested.findings.length, 0);
  const inline = scanText("First.\nSecond <!-- comment -->\nThird", { source: "inline-comment.md" });
  assert.equal(inline.findings.length, 2);
});

test("does not keep self-closing custom HTML open", () => {
  const result = scanText("<custom-element />\nFirst line.\nSecond line.", { source: "self-closing.md" });
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].line, 3);
});

test("explicit hard breaks remain findings", () => {
  const result = scanText("First line with two spaces  \nSecond line.", { source: "break.md" });
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].line, 2);
});

test("ignores fenced and indented code", () => {
  const result = scanText("```text\nFirst code line.\nSecond code line.\n```\n\n    First indented line.\n    Second indented line.", { source: "code.md" });
  assert.equal(result.findings.length, 0);
});

test("ignores front matter and structural lines", () => {
  const result = scanText("---\ntitle: Example\ndescription: Wrapped-looking metadata\n---\n# Heading\n---\n", { source: "frontmatter.md" });
  assert.equal(result.findings.length, 0);
});

test("ignores GFM tables", () => {
  const result = scanText("| Header | Value |\n| --- | --- |\n| First | Second |\n| Third | Fourth |", { source: "table.md" });
  assert.equal(result.findings.length, 0);
});

test("ignores raw HTML and comments", () => {
  const result = scanText("<div>\nFirst HTML line.\nSecond HTML line.\n</div>\n<!--\ncomment line\n-->", { source: "html.md" });
  assert.equal(result.findings.length, 0);
});

test("normalizes CRLF and truncates long excerpts", () => {
  const longLine = "x".repeat(300);
  const result = scanText(`First line.\r\n${longLine}`, { source: "windows.txt" });
  assert.equal(result.findings[0].line, 2);
  assert.equal(result.findings[0].excerpt.length, 240);
  assert.ok(result.findings[0].excerpt.endsWith("..."));
});
