import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { cleanup, evaluateCursorHook, replaceText, statePath } from "../src/cursor-hook.js";

const fixture = "First line that starts a paragraph.\nSecond line that continues it.\n";
const event = (root, phaseName, input, id = "tool-1") => ({
  hook_event_name: phaseName,
  conversation_id: "conversation-1",
  generation_id: "generation-1",
  tool_use_id: id,
  tool_name: input.tool === "Edit" ? "Edit" : "Write",
  workspace_roots: [root],
  tool_input: { file_path: input.file_path || path.join(root, "note.md"), ...input }
});

test("hard block returns Cursor native deny for new Write findings", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cursor-hook-"));
  const result = await evaluateCursorHook(event(root, "preToolUse", { content: fixture }), { mode: "hard-block" });
  assert.equal(result.permission, "deny");
  assert.match(result.user_message, /note\.md:2:1/);
  await rm(root, { recursive: true, force: true });
});

test("Write and Edit reconstruct content and warn after the write", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cursor-hook-"));
  const file = path.join(root, "note.md");
  await writeFile(file, "Single paragraph.\n");
  const stateDir = await mkdtemp(path.join(os.tmpdir(), "cursor-state-"));
  const input = { tool: "Edit", file_path: file, old_string: "Single paragraph.", new_string: fixture };
  const pre = await evaluateCursorHook(event(root, "preToolUse", input), { mode: "warn", stateDir });
  assert.deepEqual(pre, {});
  await writeFile(file, fixture);
  const post = await evaluateCursorHook(event(root, "postToolUse", input), { mode: "warn", stateDir });
  assert.match(post.additional_context, /note\.md:2:1/);
  await rm(root, { recursive: true, force: true });
  await rm(stateDir, { recursive: true, force: true });
});

test("legacy findings, repairs, structural content, unsupported files, and unrelated tools pass", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cursor-hook-"));
  const legacy = "First line.\nSecond line.\n\nUnrelated.\n";
  const legacyFile = path.join(root, "legacy.md");
  await writeFile(legacyFile, legacy);
  const stateDir = await mkdtemp(path.join(os.tmpdir(), "cursor-state-"));
  const unrelatedInput = { tool: "Edit", file_path: legacyFile, old_string: "Unrelated.", new_string: "Changed." };
  const unrelated = await evaluateCursorHook(event(root, "preToolUse", unrelatedInput), { mode: "hard-block", stateDir });
  assert.deepEqual(unrelated, {});
  const repairedInput = { tool: "Edit", file_path: legacyFile, old_string: legacy, new_string: "First line.\nSecond line.\n" };
  const repaired = await evaluateCursorHook(event(root, "preToolUse", repairedInput), { mode: "hard-block", stateDir });
  assert.deepEqual(repaired, {});
  const fence = String.fromCharCode(96).repeat(3);
  const structural = await evaluateCursorHook(event(root, "preToolUse", { content: fence + "\nFirst line.\nSecond line.\n" + fence + "\n" }), { mode: "hard-block" });
  assert.deepEqual(structural, {});
  const unsupported = await evaluateCursorHook(event(root, "preToolUse", { file_path: path.join(root, "note.yaml"), content: fixture }), { mode: "hard-block", stateDir });
  assert.deepEqual(unsupported, {});
  const other = await evaluateCursorHook({ ...event(root, "preToolUse", { content: fixture }), tool_name: "Shell" }, { mode: "hard-block" });
  assert.deepEqual(other, {});
  await rm(root, { recursive: true, force: true });
  await rm(stateDir, { recursive: true, force: true });
});

test("malformed and missing correlation fail open with diagnostics", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cursor-hook-"));
  const malformed = await evaluateCursorHook({ hook_event_name: "preToolUse", tool_name: "Write", workspace_roots: [root], tool_input: {} }, { mode: "hard-block" });
  assert.match(malformed.user_message, /allowed/);
  const missing = await evaluateCursorHook(event(root, "preToolUse", { content: fixture }, ""), { mode: "warn", stateDir: root });
  assert.match(missing.user_message, /stable/);
  await rm(root, { recursive: true, force: true });
});

test("concurrent warning events remain isolated", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cursor-hook-"));
  const stateDir = await mkdtemp(path.join(os.tmpdir(), "cursor-state-"));
  const first = event(root, "preToolUse", { content: fixture }, "tool-first");
  const second = event(root, "preToolUse", { content: "One line.\n" }, "tool-second");
  await Promise.all([
    evaluateCursorHook(first, { mode: "warn", stateDir }),
    evaluateCursorHook(second, { mode: "warn", stateDir })
  ]);
  const post = await evaluateCursorHook(event(root, "postToolUse", { content: fixture }, "tool-first"), { mode: "warn", stateDir });
  assert.match(post.additional_context, /note\.md:2:1/);
  const clean = await evaluateCursorHook(event(root, "postToolUse", { content: "One line.\n" }, "tool-second"), { mode: "warn", stateDir });
  assert.deepEqual(clean, {});
  await rm(root, { recursive: true, force: true });
  await rm(stateDir, { recursive: true, force: true });
});


test("Cursor aliases, replacement modes, and ignored phases are handled", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cursor-hook-"));
  const file = path.join(root, "note.md");
  await writeFile(file, "First line.\nSecond line.\n");
  const result = await evaluateCursorHook({
    event: "preToolUse",
    conversation_id: "conversation-1",
    generation_id: "generation-1",
    tool_call_id: "tool-alias",
    toolName: "Edit",
    workspace_roots: [root],
    toolInput: { path: file, old_string: "First line.", new_string: "First line.\nAnother continuation." }
  }, { mode: "hard-block" });
  assert.equal(result.permission, "deny");
  const ignored = await evaluateCursorHook({ event: "other", tool_name: "Write", tool_input: {} }, { mode: "hard-block" });
  assert.deepEqual(ignored, {});
  await rm(root, { recursive: true, force: true });
});

test("unsafe paths, scanner failures, and state failures fail open", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cursor-hook-"));
  const outside = await evaluateCursorHook(event(root, "preToolUse", { file_path: path.join(root, "..", "outside.md"), content: fixture }), { mode: "hard-block" });
  assert.match(outside.user_message, /allowed/);
  const scanner = await evaluateCursorHook(event(root, "preToolUse", { content: fixture }), { mode: "hard-block", scan: () => { throw new Error("scanner unavailable"); } });
  assert.match(scanner.user_message, /scanner unavailable/);
  const stateFile = path.join(root, "state-file");
  await writeFile(stateFile, "not a directory");
  const stateFailure = await evaluateCursorHook(event(root, "preToolUse", { content: fixture }), { mode: "warn", stateDir: stateFile });
  assert.match(stateFailure.user_message, /allowed/);
  await rm(root, { recursive: true, force: true });
});

test("expired and mismatched warning records fail open without attribution", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cursor-hook-"));
  const stateDir = await mkdtemp(path.join(os.tmpdir(), "cursor-state-"));
  const file = path.join(root, "note.md");
  const identity = [root, "conversation-1", "generation-1", "tool-1", "Write", file];
  const expired = statePath(stateDir, identity);
  await writeFile(expired, JSON.stringify({ createdAt: 0, identity, findings: [] }));
  await cleanup(stateDir, Date.now(), 1);
  await assert.rejects(readFile(expired, "utf8"));
  const result = await evaluateCursorHook(event(root, "postToolUse", { content: fixture }), { mode: "warn", stateDir });
  assert.match(result.additional_context, /allowed/);
  await rm(root, { recursive: true, force: true });
  await rm(stateDir, { recursive: true, force: true });
});


test("Cursor operational branches fail open and clean post state stays silent", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cursor-hook-"));
  const file = path.join(root, "note.md");
  await writeFile(file, "One line.\\n");
  assert.throws(() => replaceText("same same", "missing", "new"), /not found/);
  assert.throws(() => replaceText("same same", "same", "new", false), /ambiguous/);
  assert.throws(() => replaceText("same", 1, "new"), /must be strings/);
  const missingPayload = await evaluateCursorHook({ hook_event_name: "preToolUse", tool_name: "Write", workspace_roots: [root], tool_input: null }, { mode: "hard-block" });
  assert.match(missingPayload.user_message, /allowed/);
  const missingContent = await evaluateCursorHook({ hook_event_name: "preToolUse", tool_name: "Write", workspace_roots: [root], tool_input: { file_path: file } }, { mode: "hard-block" });
  assert.match(missingContent.user_message, /content/);
  const missingEdit = await evaluateCursorHook({ hook_event_name: "preToolUse", tool_name: "Edit", workspace_roots: [root], tool_input: { file_path: path.join(root, "missing.md"), old_string: "x", new_string: "y" } }, { mode: "hard-block" });
  assert.match(missingEdit.user_message, /does not exist/);
  const postMissingIdentity = await evaluateCursorHook({ hook_event_name: "postToolUse", tool_name: "Write", workspace_roots: [root], tool_input: { file_path: file } }, { mode: "warn", stateDir: root });
  assert.match(postMissingIdentity.additional_context, /stable/);
  const cwdFallback = await evaluateCursorHook({ hook_event_name: "preToolUse", conversation_id: "c", generation_id: "g", tool_use_id: "t", tool_name: "Write", cwd: root, tool_input: { file_path: file, content: "One line.\\n" } }, { mode: "hard-block" });
  assert.deepEqual(cwdFallback, {});
  await rm(root, { recursive: true, force: true });
});


test("Cursor helper failure branches remain fail open", async () => {
  assert.deepEqual(await evaluateCursorHook(null), {});
  assert.equal(replaceText("same same", "same", "new", true), "new new");
  const root = await mkdtemp(path.join(os.tmpdir(), "cursor-hook-"));
  const file = path.join(root, "note.md");
  await writeFile(file, "One line.\\n");
  const fallback = await evaluateCursorHook({ hook_event_name: "preToolUse", conversation_id: "c", generation_id: "g", tool_use_id: "t", tool_name: "Write", tool_input: { file_path: file, content: "One line.\\n" } }, { mode: "hard-block", cwd: root });
  assert.deepEqual(fallback, {});
  const resolveFailure = await evaluateCursorHook(event(root, "preToolUse", { content: fixture }), { mode: "hard-block", resolve: async () => { const error = new Error("permission denied"); error.code = "EACCES"; throw error; } });
  assert.match(resolveFailure.user_message, /permission denied/);
  const readFailure = await evaluateCursorHook(event(root, "preToolUse", { content: fixture }), { mode: "hard-block", read: async () => { const error = new Error("read denied"); error.code = "EACCES"; throw error; } });
  assert.match(readFailure.user_message, /read denied/);
  const stateDir = await mkdtemp(path.join(os.tmpdir(), "cursor-state-"));
  await cleanup(path.join(stateDir, "missing"), Date.now(), 1);
  await writeFile(path.join(stateDir, "bad.json"), "{");
  await cleanup(stateDir, Date.now(), 1);
  await rm(root, { recursive: true, force: true });
  await rm(stateDir, { recursive: true, force: true });
});


test("matching post events consume warning state only once", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cursor-hook-"));
  const stateDir = await mkdtemp(path.join(os.tmpdir(), "cursor-state-"));
  const pre = await evaluateCursorHook(event(root, "preToolUse", { content: fixture }), { mode: "warn", stateDir });
  assert.deepEqual(pre, {});
  const results = await Promise.all([
    evaluateCursorHook(event(root, "postToolUse", { content: fixture }), { mode: "warn", stateDir }),
    evaluateCursorHook(event(root, "postToolUse", { content: fixture }), { mode: "warn", stateDir })
  ]);
  assert.equal(results.filter((result) => result.additional_context?.includes("note.md:2:1")).length, 1);
  assert.equal(results.filter((result) => result.additional_context?.includes("could not evaluate")).length, 1);
  await rm(root, { recursive: true, force: true });
  await rm(stateDir, { recursive: true, force: true });
});


test("edits in later workspace roots are evaluated", async () => {
  const first = await mkdtemp(path.join(os.tmpdir(), "cursor-workspace-"));
  const second = await mkdtemp(path.join(os.tmpdir(), "cursor-workspace-"));
  const file = path.join(second, "note.md");
  const result = await evaluateCursorHook({
    hook_event_name: "preToolUse",
    conversation_id: "c",
    generation_id: "g",
    tool_use_id: "t",
    tool_name: "Write",
    workspace_roots: [first, second],
    tool_input: { file_path: file, content: fixture }
  }, { mode: "hard-block" });
  assert.equal(result.permission, "deny");
  await rm(first, { recursive: true, force: true });
  await rm(second, { recursive: true, force: true });
});
