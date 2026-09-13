import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const pipe = (command, args, options, input) => new Promise((resolve, reject) => {
  const child = spawn(command, args, options);
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("error", reject);
  child.on("close", (code) => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${command} exited ${code}: ${stderr}`)));
  child.stdin.end(input);
});

const root = process.cwd();
const repo = await mkdtemp(path.join(tmpdir(), "fixed-width-prose-claude-"));
const current = "Existing paragraph line.\nExisting continuation line.\n";
try {
  await mkdir(path.join(repo, ".git"));
  await writeFile(path.join(repo, "note.md"), "Clean current content.\n");
  await writeFile(path.join(repo, "legacy.md"), current);
  const event = (toolName, input) => JSON.stringify({ hook_event_name: "PreToolUse", tool_name: toolName, cwd: repo, tool_input: { file_path: path.join(repo, input.path), ...input } });
  const invoke = async (name, payload) => {
    const { stdout } = await pipe("node", [path.join(root, "claude-plugins", name, "bin/hook.mjs")], { cwd: repo, env: { ...process.env, CLAUDE_PLUGIN_ROOT: path.join(root, "claude-plugins", name) } }, payload);
    return JSON.parse(stdout);
  };
  const wrapped = "First line of a paragraph.\nSecond line introduces a wrapped finding.\n";
  for (const name of ["ban-fixed-width-prose-hard-block", "ban-fixed-width-prose-warn"]) {
    const result = await invoke(name, event("Write", { path: "note.md", content: wrapped }));
    if (name.endsWith("hard-block") && result.hookSpecificOutput?.permissionDecision !== "deny") throw new Error("hard mode did not deny the wrapped write");
    if (name.endsWith("warn") && !result.hookSpecificOutput?.additionalContext) throw new Error("warn mode did not provide guidance");
  }
  const clean = await invoke("ban-fixed-width-prose-hard-block", event("Write", { path: "note.md", content: "One complete line.\n" }));
  const legacy = await invoke("ban-fixed-width-prose-hard-block", event("Write", { path: "legacy.md", content: `${current}\nUnrelated clean paragraph.\n` }));
  const repair = await invoke("ban-fixed-width-prose-hard-block", event("Edit", { path: "legacy.md", old_string: current, new_string: "One repaired paragraph.\n" }));
  const malformed = await pipe("node", [path.join(root, "claude-plugins", "ban-fixed-width-prose-hard-block", "bin/hook.mjs")], { cwd: repo }, "not-json");
  const malformedResult = JSON.parse(malformed.stdout);
  if (Object.keys(clean).length || Object.keys(legacy).length || Object.keys(repair).length) throw new Error("clean, legacy, or repair edit was not allowed");
  if (!malformedResult.hookSpecificOutput?.additionalContext) throw new Error("malformed input did not provide diagnostics");
  console.log("claude-smoke-ok hard=deny warn=context clean=allow legacy=allow repair=allow malformed=context");
} finally {
  await rm(repo, { recursive: true, force: true });
}
