import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const run = (file, input, cwd) => new Promise((resolve, reject) => {
  const child = spawn("node", [file], { cwd });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("error", reject);
  child.on("close", (code) => code === 0 ? resolve(JSON.parse(stdout)) : reject(new Error(stderr || "hook failed with " + code)));
  child.stdin.end(input);
});

const root = process.cwd();
const repo = await mkdtemp(path.join(tmpdir(), "fixed-width-prose-cursor-"));
const note = path.join(repo, "note.md");
const wrapped = "First line of a paragraph.\nSecond line introduces a wrapped finding.\n";
const event = (phase, tool, input, id) => JSON.stringify({
  hook_event_name: phase,
  conversation_id: "conversation-smoke",
  generation_id: "generation-smoke",
  tool_use_id: id,
  tool_name: tool,
  workspace_roots: [repo],
  tool_input: { file_path: note, ...input }
});
try {
  const hard = path.join(root, "cursor-plugins/ban-fixed-width-prose-hard-block/bin/hook.mjs");
  const warn = path.join(root, "cursor-plugins/ban-fixed-width-prose-warn/bin/hook.mjs");
  const denied = await run(hard, event("preToolUse", "Write", { content: wrapped }, "hard-write"), repo);
  if (denied.permission !== "deny" || !denied.user_message) throw new Error("hard=deny failed");
  await writeFile(note, "One complete line.\n");
  const warningPre = await run(warn, event("preToolUse", "Write", { content: wrapped }, "warn-write"), repo);
  if (Object.keys(warningPre).length) throw new Error("warn pre did not allow");
  await writeFile(note, wrapped);
  const warningPost = await run(warn, event("postToolUse", "Write", { content: wrapped }, "warn-write"), repo);
  if (!warningPost.additional_context?.includes("note.md:2:1")) throw new Error("warn post context failed");
  const clean = await run(hard, event("preToolUse", "Write", { content: "One complete line.\n" }, "clean"), repo);
  if (Object.keys(clean).length) throw new Error("clean=allow failed");
  await writeFile(note, wrapped);
  const legacy = await run(hard, event("preToolUse", "Edit", { old_string: "First line of a paragraph.", new_string: "Changed first line." }, "legacy"), repo);
  if (Object.keys(legacy).length) throw new Error("legacy=allow failed");
  const repair = await run(hard, event("preToolUse", "Edit", { old_string: wrapped, new_string: "One repaired paragraph.\n" }, "repair"), repo);
  if (Object.keys(repair).length) throw new Error("repair=allow failed");
  const unsupported = await run(hard, event("preToolUse", "Write", { file_path: path.join(repo, "note.yaml"), content: wrapped }, "unsupported"), repo);
  if (Object.keys(unsupported).length) throw new Error("unsupported=allow failed");
  const malformed = await run(hard, "not-json", repo);
  if (!malformed.user_message?.includes("malformed JSON")) throw new Error("malformed diagnostic failed");
  console.log("cursor-smoke-ok hard=deny warn=post-write-context clean=allow legacy=allow repair=allow unsupported=allow malformed=diagnostic");
} finally {
  await rm(repo, { recursive: true, force: true });
}
