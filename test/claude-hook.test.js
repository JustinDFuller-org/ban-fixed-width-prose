import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { mkdtemp, symlink, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { evaluateClaudeHook, main, normalizePath, replaceText, reconstruct } from "../src/claude-hook.js";

const clean = "A complete sentence stays on one line.\n";
const wrapped = "A complete sentence starts here.\nThe continuation is a finding.\n";
const event = (tool_name, tool_input, cwd = process.cwd()) => ({ hook_event_name: "PreToolUse", tool_name, tool_input: { ...tool_input, file_path: tool_input.file_path?.replace("/workspace/", `${cwd}/`) }, cwd });
const read = async () => clean;

test("native Write blocks wrapped prose and warns in warning mode", async () => {
  const hard = await evaluateClaudeHook(event("Write", { file_path: "/workspace/note.md", content: wrapped }), { read });
  assert.equal(hard.hookSpecificOutput.permissionDecision, "deny");
  assert.match(hard.hookSpecificOutput.permissionDecisionReason, /note\.md:2:1/);
  const warn = await evaluateClaudeHook(event("Write", { file_path: "/workspace/note.md", content: wrapped }), { mode: "warn", read });
  assert.equal(warn.hookSpecificOutput.permissionDecision, undefined);
  assert.match(warn.hookSpecificOutput.additionalContext, /Remove the physical wrap/);
});

test("native Edit reconstructs unique and replace_all replacements", async () => {
  const unique = await reconstruct(event("Edit", { file_path: "/workspace/note.md", old_string: "complete", new_string: "short" }), process.cwd(), read);
  assert.equal(unique.after, "A short sentence stays on one line.\n");
  const repeatedRead = async () => "one one\n";
  const all = await reconstruct(event("Edit", { file_path: "/workspace/note.md", old_string: "one", new_string: "two", replace_all: true }), process.cwd(), repeatedRead);
  assert.equal(all.after, "two two\n");
  await assert.rejects(() => reconstruct(event("Edit", { file_path: "/workspace/note.md", old_string: "one", new_string: "two" }), process.cwd(), repeatedRead), /ambiguous/);
});

test("unsupported and unrelated native calls pass without policy output", async () => {
  assert.deepEqual(await evaluateClaudeHook(event("Write", { file_path: "/workspace/note.js", content: wrapped }), { read }), {});
  assert.deepEqual(await evaluateClaudeHook(event("NotebookEdit", { file_path: "/workspace/note.md", content: wrapped }), { read }), {});
  assert.deepEqual(await evaluateClaudeHook({ hook_event_name: "PostToolUse", tool_name: "Write", tool_input: {} }, { read }), {});
  const missing = await evaluateClaudeHook({ hook_event_name: "PreToolUse", tool_name: "Write" }, { read });
  assert.match(missing.hookSpecificOutput.additionalContext, /payload is missing/);
  const nullInput = await evaluateClaudeHook({ hook_event_name: "PreToolUse", tool_name: "Edit", tool_input: null }, { read });
  assert.match(nullInput.hookSpecificOutput.additionalContext, /payload is missing/);
});

test("legacy findings and repairs are allowed", async () => {
  const legacy = "Existing paragraph starts here.\nExisting continuation.\n";
  const unchanged = await evaluateClaudeHook(event("Write", { file_path: "/workspace/note.md", content: `${legacy}\nAnother clean paragraph.\n` }), { read: async () => legacy });
  assert.deepEqual(unchanged, {});
  const repaired = await evaluateClaudeHook(event("Write", { file_path: "/workspace/note.md", content: "Existing paragraph starts here and is repaired.\n" }), { read: async () => legacy });
  assert.deepEqual(repaired, {});
});

test("malformed, scanner, and path failures fail open with context", async () => {
  const malformed = await evaluateClaudeHook(event("Write", { file_path: "/workspace/note.md" }), { read });
  assert.match(malformed.hookSpecificOutput.additionalContext, /could not evaluate/);
  const outside = await evaluateClaudeHook(event("Write", { file_path: "/outside/note.md", content: wrapped }), { read });
  assert.match(outside.hookSpecificOutput.additionalContext, /escapes workspace/);
  const failed = await evaluateClaudeHook(event("Write", { file_path: "/workspace/note.md", content: wrapped }), { read, scan: () => { throw new Error("scanner failed"); } });
  assert.match(failed.hookSpecificOutput.additionalContext, /scanner failed/);
  assert.throws(() => normalizePath("/outside/note.md", "/workspace"), /escapes workspace/);
});

test("read failures and missing Edit targets fail open", async () => {
  const readFailure = await evaluateClaudeHook(event("Write", { file_path: "/workspace/note.md", content: clean }), { read: async () => { throw new Error("read failed"); } });
  assert.match(readFailure.hookSpecificOutput.additionalContext, /read failed/);
  const missing = new Error("missing");
  missing.code = "ENOENT";
  const missingEdit = await evaluateClaudeHook(event("Edit", { file_path: "/workspace/note.md", old_string: "old", new_string: "new" }), { read: async () => { throw missing; } });
  assert.match(missingEdit.hookSpecificOutput.additionalContext, /does not exist/);
});

test("structural Markdown remains clean and malformed JSON stays one object", async () => {
  const content = "```md\nFirst line.\nSecond line.\n```\n\n| one | two |\n| --- | --- |\n| a | b |\n";
  assert.deepEqual(await evaluateClaudeHook(event("Write", { file_path: "/workspace/note.md", content }), { read: async () => "" }), {});
  const chunks = async function* () { yield "{"; yield "bad"; };
  let value = "";
  await main([], { stdin: chunks(), stdout: { write: (chunk) => { value += chunk; } } });
  assert.equal(JSON.parse(value).hookSpecificOutput.hookEventName, "PreToolUse");
});

test("replacement requires strings", () => {
  assert.throws(() => replaceText("one", null, "two", false), /must be strings/);
  assert.throws(() => replaceText("one", "missing", "two", false), /not found/);
  assert.throws(() => normalizePath("", "/workspace"), /missing an absolute file path/);
});

test("a new Write can evaluate without an event cwd", async () => {
  const result = await evaluateClaudeHook(event("Write", { file_path: "/workspace/note.md", content: clean }), { read: async () => { const error = new Error("missing"); error.code = "ENOENT"; throw error; } });
  assert.deepEqual(result, {});
});

test("symlink targets outside the workspace fail open", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "fixed-width-prose-workspace-"));
  const outside = await mkdtemp(path.join(tmpdir(), "fixed-width-prose-outside-"));
  try {
    await writeFile(path.join(outside, "note.md"), clean);
    await symlink(path.join(outside, "note.md"), path.join(workspace, "link.md"));
    const result = await evaluateClaudeHook({ hook_event_name: "PreToolUse", tool_name: "Write", cwd: workspace, tool_input: { file_path: path.join(workspace, "link.md"), content: wrapped } });
    assert.match(result.hookSpecificOutput.additionalContext, /escapes workspace through a symlink/);
  } finally {
    await rm(workspace, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("dangling symlink targets fail open", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "fixed-width-prose-workspace-"));
  const outside = await mkdtemp(path.join(tmpdir(), "fixed-width-prose-outside-"));
  try {
    await symlink(path.join(outside, "future.md"), path.join(workspace, "link.md"));
    const result = await evaluateClaudeHook({ hook_event_name: "PreToolUse", tool_name: "Write", cwd: workspace, tool_input: { file_path: path.join(workspace, "link.md"), content: clean } });
    assert.match(result.hookSpecificOutput.additionalContext, /dangling symlink/);
  } finally {
    await rm(workspace, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("real path resolution failures fail open", async () => {
  const nested = await evaluateClaudeHook(event("Write", { file_path: "/workspace/nested/new.md", content: clean }), { read: async () => { const error = new Error("missing"); error.code = "ENOENT"; throw error; } });
  assert.deepEqual(nested, {});
  const operational = await evaluateClaudeHook(event("Write", { file_path: "/workspace/note.md", content: clean }), { resolve: async () => { throw new Error("resolve failed"); } });
  assert.match(operational.hookSpecificOutput.additionalContext, /resolve failed/);
  const missingRoot = await evaluateClaudeHook(event("Write", { file_path: "/workspace/note.md", content: clean }), { resolve: async () => { const error = new Error("root missing"); error.code = "ENOENT"; throw error; } });
  assert.match(missingRoot.hookSpecificOutput.additionalContext, /root missing/);
});
