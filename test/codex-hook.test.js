import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { evaluateHook, parsePatch, newFindings, applyHunk, reconstruct, payloadEdits, modeFromArgs } from "../src/codex-hook.js";

const clean = "A complete sentence stays on one line.\n";
const wrapped = "A complete sentence starts here.\nThe continuation is a finding.\n";
const event = (tool_input, tool_name = "file_edit") => ({ hook_event_name: "PreToolUse", tool_name, tool_input });

test("clean direct edit is allowed", async () => {
  assert.deepEqual(await evaluateHook(event({ file_path: "note.md", content: clean }), { read: async () => { const error = new Error("missing"); error.code = "ENOENT"; throw error; } }), {});
});

test("hard mode denies a newly wrapped direct edit", async () => {
  const output = await evaluateHook(event({ file_path: "note.md", content: wrapped }), { read: async () => clean });
  assert.equal(output.hookSpecificOutput.permissionDecision, "deny");
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /note\.md:2:1/);
});

test("warning mode allows the same edit with context", async () => {
  const output = await evaluateHook(event({ file_path: "note.md", content: wrapped }), { mode: "warn", read: async () => clean });
  assert.equal(output.hookSpecificOutput.permissionDecision, undefined);
  assert.match(output.hookSpecificOutput.additionalContext, /Remove the physical wrap/);
});

test("malformed and unsupported edits fail open visibly", async () => {
  const malformed = await evaluateHook(event({ file_path: "note.md" }));
  assert.match(malformed.hookSpecificOutput.additionalContext, /could not evaluate/);
  assert.deepEqual(await evaluateHook(event({ file_path: "note.js", content: wrapped }, "write_file"), { read: async () => clean }), {});
});

test("apply patch reconstructs add, update, delete, and move records", () => {
  const edits = parsePatch("*** Begin Patch\n*** Add File: new.md\n+First line.\n*** Update File: old.md\n@@\n-Old\n+New\n*** Move to: moved.md\n*** Delete File: gone.md\n*** End Patch");
  assert.equal(edits.length, 3);
  assert.equal(edits[0].kind, "add");
  assert.equal(edits[1].moveTo, "moved.md");
  assert.equal(edits[2].kind, "delete");
});

test("multiset comparison tolerates shifted legacy findings and permits repair", () => {
  const finding = { source: "x.md", line: 4, reason: "paragraph-continuation", excerpt: "same" };
  assert.deepEqual(newFindings([finding], [{ ...finding, line: 9 }], "x.md"), []);
  assert.equal(newFindings([finding], [{ ...finding, excerpt: "changed" }], "x.md").length, 1);
  assert.deepEqual(newFindings([finding], [], "x.md"), []);
});

test("structural markdown remains clean", async () => {
  const content = "```md\nFirst line.\nSecond line.\n```\n\n| one | two |\n| --- | --- |\n| a | b |\n";
  assert.deepEqual(await evaluateHook(event({ file_path: "note.md", content }), { read: async () => "" }), {});
});

test("reconstructs direct replacements, hunk updates, moves, and new files", async () => {
  assert.equal(applyHunk("Old\nTail\n", ["-Old", "+New"]), "New\nTail\n");
  const read = async (file) => file.endsWith("old.md") ? "Old\n" : "Moved\n";
  const replaced = await reconstruct({ file_path: "old.md", old_string: "Old", new_string: "New" }, "/workspace", read);
  assert.equal(replaced[0].after, "New\n");
  const moved = await reconstruct({ path: "old.md", hunks: [["-Old", "+Moved"]], moveTo: "new.md" }, "/workspace", read);
  assert.equal(moved.length, 2);
  const added = await reconstruct({ path: "new.md", kind: "add", content: "New\n" }, "/workspace", read);
  assert.equal(added[0].before, "Moved\n");
});

test("accepts payload aliases and leaves unrelated events unchanged", async () => {
  assert.equal(modeFromArgs(["--mode=warn"]), "warn");
  assert.equal(modeFromArgs([]), "hard-block");
  assert.equal(payloadEdits({ edits: [{ path: "a.md", content: "x" }] }).length, 1);
  assert.equal(payloadEdits({ command: "*** Begin Patch\n*** Add File: a.md\n+x" }).length, 1);
  assert.deepEqual(await evaluateHook({ hook_event_name: "PostToolUse", tool_name: "write", tool_input: {} }), {});
  assert.deepEqual(await evaluateHook(event({ file_path: "a.md", content: "x" }), { read: async () => "x" }), {});
});

test("reports path and patch reconstruction failures without denying", async () => {
  const outside = await evaluateHook(event({ file_path: "../outside.md", content: wrapped }), { cwd: "/workspace", read: async () => clean });
  assert.match(outside.hookSpecificOutput.additionalContext, /could not evaluate/);
  const mismatch = await evaluateHook(event({ patch: "*** Begin Patch\n*** Update File: note.md\n@@\n-missing\n+new\n" }), { cwd: "/workspace", read: async () => clean });
  assert.match(mismatch.hookSpecificOutput.additionalContext, /could not evaluate/);
});

test("checked-in hook fixtures exercise the real scanner through the adapter", async () => {
  const fixtureRoot = path.join(process.cwd(), "test/fixtures/hooks");
  const events = JSON.parse(await readFile(path.join(fixtureRoot, "events.json"), "utf8"));
  const readFixture = async (file) => readFile(path.join(fixtureRoot, path.basename(file)), "utf8");
  const wrappedContent = await readFixture("wrapped.md");
  const hard = await evaluateHook({ ...events.wrapped, tool_input: { file_path: "wrapped.md", content: wrappedContent } }, { read: async () => await readFixture("clean.md") });
  assert.equal(hard.hookSpecificOutput.permissionDecision, "deny");
  assert.deepEqual(await evaluateHook({ ...events.clean, tool_input: { file_path: "clean.md", content: await readFixture("clean.md") } }, { read: readFixture }), {});
  assert.deepEqual(await evaluateHook({ ...events.unsupported, tool_input: { file_path: "unsupported.yaml", content: await readFixture("unsupported.yaml") } }, { read: readFixture }), {});
  const legacyBefore = await readFixture("legacy.md");
  const unrelated = `${legacyBefore}\nAnother clean paragraph.`;
  assert.deepEqual(await evaluateHook(event({ file_path: "legacy.md", content: unrelated }), { read: async () => legacyBefore }), {});
  assert.deepEqual(await evaluateHook(event({ file_path: "incremental.md", content: "Existing paragraph line." }), { read: readFixture }), {});
});
