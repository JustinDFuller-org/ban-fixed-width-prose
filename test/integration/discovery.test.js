import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { scanPaths } from "../../src/discovery.js";

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

async function fsRoot() {
  const root = path.join(os.tmpdir(), `ban-fixed-width-prose-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await mkdir(root, { recursive: true });
  return root;
}
