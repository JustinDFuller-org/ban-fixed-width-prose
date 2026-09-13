import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
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
const codex = "codex";
const home = await mkdtemp(path.join(tmpdir(), "fixed-width-prose-codex-"));
const repo = await mkdtemp(path.join(tmpdir(), "fixed-width-prose-repo-"));
try {
  const current = "Existing paragraph line.\nExisting continuation line.\n";
  await mkdir(path.join(repo, ".git"));
  await writeFile(path.join(repo, "note.md"), "Clean current content.\n");
  await writeFile(path.join(repo, "legacy.md"), current);
  await run(codex, ["plugin", "marketplace", "add", root], { env: { ...process.env, CODEX_HOME: home } });
  const installs = {};
  for (const name of ["ban-fixed-width-prose-hard-block", "ban-fixed-width-prose-warn"]) {
    const { stdout } = await run(codex, ["plugin", "add", name, "--marketplace", "ban-fixed-width-prose", "--json"], { env: { ...process.env, CODEX_HOME: home } });
    installs[name] = JSON.parse(stdout).installedPath;
  }
  const event = (filePath, content) => JSON.stringify({ hook_event_name: "PreToolUse", tool_name: "file_edit", tool_input: { file_path: filePath, content } });
  const invoke = async (name, payload) => {
    const { stdout } = await pipe("node", [path.join(installs[name], "bin/hook.js")], { cwd: repo, env: { ...process.env, PLUGIN_ROOT: installs[name] } }, payload);
    return JSON.parse(stdout);
  };
  const hard = await invoke("ban-fixed-width-prose-hard-block", event("note.md", "First line.\nSecond line."));
  const warn = await invoke("ban-fixed-width-prose-warn", event("note.md", "First line.\nSecond line."));
  const clean = await invoke("ban-fixed-width-prose-hard-block", event("note.md", "One complete line."));
  const legacy = await invoke("ban-fixed-width-prose-hard-block", event("legacy.md", `${current}\nUnrelated clean paragraph.`));
  if (hard.hookSpecificOutput?.permissionDecision !== "deny") throw new Error("hard mode did not deny the wrapped edit");
  if (!warn.hookSpecificOutput?.additionalContext) throw new Error("warn mode did not provide guidance");
  if (Object.keys(clean).length || Object.keys(legacy).length) throw new Error("clean or legacy edit was not allowed");
  console.log("codex-smoke-ok hard=deny warn=context clean=allow legacy=allow");
} finally {
  await rm(home, { recursive: true, force: true });
  await rm(repo, { recursive: true, force: true });
}
