import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { scanPaths } from "../../src/discovery.js";

const execFileAsync = promisify(execFile);

test("discovers recognized files in sorted order and skips generated directories", async () => {
  const root = await fsRoot();
  await writeFile(path.join(root, "b.md"), "clean\n");
  await writeFile(path.join(root, "a.txt"), "wrapped\nand more\n");
  await mkdir(path.join(root, "node_modules"), { recursive: true });
  await writeFile(path.join(root, "node_modules", "ignored.md"), "wrapped\nand more\n");
  const result = await scanPaths([], { cwd: root });
  assert.deepEqual(result.findings.map((item) => path.basename(item.source)), ["a.txt"]);
  assert.equal(result.summary.filesScanned, 2);
  assert.equal(result.findings.length, 1);
});

test("supports explicit files and repeatable include/exclude filters", async () => {
  const root = await fsRoot();
  await mkdir(path.join(root, "docs"), { recursive: true });
  await writeFile(path.join(root, "docs", "one.md"), "wrapped\nand more\n");
  await writeFile(path.join(root, "docs", "two.txt"), "wrapped\nand more\n");
  assert.equal((await scanPaths([path.join(root, "docs", "one.md")], { cwd: root })).findings.length, 1);
  assert.equal((await scanPaths([], { cwd: root, include: ["docs/*.md"] })).findings.length, 1);
  assert.equal((await scanPaths([], { cwd: root, exclude: ["docs/*.md"] })).findings.length, 1);
});

test("allows a double-star file pattern to match repository-root files", async () => {
  const root = await fsRoot();
  await writeFile(path.join(root, "root.md"), "wrapped\nand more\n");
  const result = await scanPaths([], { cwd: root, include: ["**/*.md"] });
  assert.equal(result.findings.length, 1);
});

test("default repository discovery honors gitignore and git info exclude", async () => {
  const root = await gitRoot();
  await writeFile(path.join(root, ".gitignore"), "ignored/\n*.local.md\n");
  await mkdir(path.join(root, "nested", "ignored"), { recursive: true });
  await mkdir(path.join(root, "visible"), { recursive: true });
  await writeFile(path.join(root, "nested", "ignored", "nested.md"), "wrapped\nand more\n");
  await writeFile(path.join(root, "visible", "ignored.local.md"), "wrapped\nand more\n");
  await writeFile(path.join(root, "visible", "clean.md"), "clean\n");
  await writeFile(path.join(root, ".git", "info", "exclude"), "excluded-by-info.md\n");
  await writeFile(path.join(root, "excluded-by-info.md"), "wrapped\nand more\n");
  await writeFile(path.join(root, "tracked.local.md"), "wrapped\nand more\n");
  await execFileAsync("git", ["-C", root, "add", ".gitignore", "visible/clean.md"]);
  await execFileAsync("git", ["-C", root, "add", "--force", "tracked.local.md"]);
  const result = await scanPaths([], { cwd: root });
  assert.deepEqual(result.findings.map((item) => item.source), ["tracked.local.md"]);
  assert.equal(result.summary.filesScanned, 2);
});

test("explicit ignored files remain an escape hatch", async () => {
  const root = await gitRoot();
  await writeFile(path.join(root, ".gitignore"), "ignored.md\n");
  await writeFile(path.join(root, "ignored.md"), "wrapped\nand more\n");
  const result = await scanPaths(["ignored.md"], { cwd: root });
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].source, "ignored.md");
});

async function gitRoot() {
  const root = await fsRoot();
  await execFileAsync("git", ["-C", root, "init", "--quiet"]);
  return root;
}

async function fsRoot() {
  const root = path.join(os.tmpdir(), `ban-fixed-width-prose-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(root, { recursive: true });
  return root;
}
