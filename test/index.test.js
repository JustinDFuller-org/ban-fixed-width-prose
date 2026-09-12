import assert from "node:assert/strict";
import test from "node:test";
import { scanPaths, scanText } from "../src/index.js";

test("package root exports reusable scanner APIs", async () => {
  assert.equal(scanText("one\ntwo", { source: "input.md" }).findings.length, 1);
  assert.equal(typeof scanPaths, "function");
});
