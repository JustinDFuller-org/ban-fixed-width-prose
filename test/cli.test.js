import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { helpText, main, parseArgs } from "../src/cli.js";
import { scanPaths } from "../src/discovery.js";
import * as packageExports from "../src/index.js";
import packageData from "../package.json" with { type: "json" };

function stream() {
  return { value: "", write(chunk) { this.value += chunk; } };
}

async function runMain(args, input = "") {
  const stdout = stream();
  const stderr = stream();
  const code = await main(args, { stdin: input, stdout, stderr });
  return { code, stdout: stdout.value, stderr: stderr.value };
}

test("parses supported options and rejects invalid options", () => {
  assert.deepEqual(parseArgs(["--debug", "--format", "text", "--include", "docs/**", "--exclude", "docs/vendor/**", "file.md"]), {
    paths: ["file.md"], include: ["docs/**"], exclude: ["docs/vendor/**"], format: "text", stdin: false, debug: true
  });
  assert.throws(() => parseArgs(["--stdin", "file.md"]), /cannot be combined/);
  assert.throws(() => parseArgs(["--format", "xml"]), /unsupported format/);
  assert.throws(() => parseArgs(["--unknown"]), /unknown option/);
  assert.throws(() => parseArgs(["--include"]), /requires a value/);
});

test("package entry exports the reusable API", () => {
  assert.equal(typeof packageExports.scanText, "function");
  assert.equal(typeof packageExports.scanPaths, "function");
  assert.equal(typeof packageExports.main, "function");
  assert.equal("run" in packageExports, false);
});

test("renders help and version", async () => {
  const help = await runMain(["--help"]);
  const version = await runMain(["--version"]);
  assert.equal(help.code, 0);
  assert.equal(help.stdout, helpText());
  assert.equal(version.code, 0);
  assert.equal(version.stdout, `${packageData.version}\n`);
});

test("scans stdin and renders JSON", async () => {
  const result = await runMain(["--stdin"], "First line.\nSecond line.\n");
  assert.equal(result.code, 1);
  const output = JSON.parse(result.stdout);
  assert.equal(output.findings[0].source, "<stdin>");
  assert.equal(output.summary.findingCount, 1);
});

test("renders text output and debug errors", async () => {
  const result = await runMain(["--stdin", "--format", "text", "--debug"], "First line.\nSecond line.\n");
  assert.equal(result.code, 1);
  assert.match(result.stdout, /<stdin>:2:1: paragraph-continuation/);
  assert.match(result.stderr, /scanned 1 source\(s\), found 1 finding\(s\)/);
});

test("returns an operational error for an unreadable path", async () => {
  const result = await runMain(["missing.md"]);
  assert.equal(result.code, 2);
  const output = JSON.parse(result.stdout);
  assert.equal(output.errors.length, 1);
});

test("discovers, filters, skips, and sorts files", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "fixed-width-prose-"));
  await fs.mkdir(path.join(root, "docs", "nested"), { recursive: true });
  await fs.mkdir(path.join(root, "node_modules"), { recursive: true });
  await fs.writeFile(path.join(root, "docs", "z.md"), "First.\nSecond.\n");
  await fs.writeFile(path.join(root, "docs", "nested", "a.txt"), "First.\nSecond.\n");
  await fs.writeFile(path.join(root, "node_modules", "ignored.md"), "First.\nSecond.\n");
  await fs.writeFile(path.join(root, "source.js"), "First.\nSecond.\n");
  const result = await scanPaths([root], { cwd: root });
  assert.deepEqual(result.findings.map((item) => item.source), ["docs/nested/a.txt", "docs/z.md"]);
  const filtered = await scanPaths([root], { cwd: root, include: ["docs/**"], exclude: ["**/nested/**"] });
  assert.deepEqual(filtered.findings.map((item) => item.source), ["docs/z.md"]);
  const explicit = await scanPaths([path.join(root, "source.js")], { cwd: root });
  assert.equal(explicit.findings.length, 1);
});

test("runs the executable through node", async () => {
  const result = await new Promise((resolve) => {
    const child = spawn(process.execPath, ["bin/ban-fixed-width-prose.js", "--stdin"], { cwd: process.cwd() });
    let stdout = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stdin.end("First.\nSecond.\n");
    child.on("close", (code) => resolve({ code, stdout }));
  });
  assert.equal(result.code, 1);
  assert.equal(JSON.parse(result.stdout).summary.findingCount, 1);
});
