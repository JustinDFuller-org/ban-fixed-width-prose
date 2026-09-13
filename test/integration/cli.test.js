import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";

const root = path.resolve("bin/ban-fixed-width-prose.js");

test("CLI reports JSON findings and finding exit status", async () => {
  const result = await run(["--format", "json", "test/fixtures/wrapped.md"]);
  assert.equal(result.status, 1);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.findings.length, 1);
  assert.equal(parsed.findings[0].source, "test/fixtures/wrapped.md");
});

test("CLI renders clean text output, help, and version", async () => {
  const clean = await run(["--format", "text", "test/fixtures/clean.md"]);
  assert.equal(clean.status, 0);
  assert.equal(clean.stdout, "");
  assert.match((await run(["--help"])).stdout, /Usage:/);
  assert.match((await run(["--version"])).stdout, /^1\.2\.3\n$/);
});

test("CLI scans stdin and rejects invalid combinations", async () => {
  const stdin = await run(["--stdin"], "hello\nworld\n");
  assert.equal(stdin.status, 1);
  assert.match(stdin.stdout, /"line": 2/);
  const invalid = await run(["--stdin", "test/fixtures/clean.md"]);
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /cannot be combined/);
});

test("CLI returns operational status for missing sources", async () => {
  const result = await run(["missing.md"]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /ENOENT|no such file/i);
});

test("CLI debug output reports scan summary", async () => {
  const result = await run(["--debug", "test/fixtures/clean.md"]);
  assert.equal(result.status, 0);
  assert.match(result.stderr, /scanned 1 source/);
});

async function run(args, input = "") {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [root, ...args], { cwd: process.cwd() });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (status) => resolve({ status, stdout, stderr }));
    child.stdin.end(input);
  });
}
