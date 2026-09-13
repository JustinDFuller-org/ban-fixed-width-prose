import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { lstat, mkdir, readFile, realpath, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { RECOGNIZED_EXTENSIONS, scanText } from "./scanner.js";

const TOOLS = new Set(["Write", "Edit"]);
const TTL_MS = 10 * 60 * 1000;

function phase(event) {
  return String(event && (event.hook_event_name || event.event) || "").toLowerCase();
}

function messageFor(findings) {
  const details = findings.map((finding) => finding.source + ":" + finding.line + ":" + finding.column + " (" + finding.reason + ")").join(", ");
  return "Fixed-width prose detected at " + details + ". Remove the physical wrap, or use an allowed structural/documentation form.";
}

function diagnostic(message, post) {
  const text = "Fixed-width prose hook allowed the Cursor operation but could not evaluate it: " + message;
  return post ? { additional_context: text } : { user_message: text, agent_message: text };
}

function deny(message) {
  return { permission: "deny", user_message: message, agent_message: message };
}

function supported(relative) {
  return RECOGNIZED_EXTENSIONS.has(path.extname(relative).toLowerCase());
}

function workspaceRoots(event, cwd) {
  const roots = Array.isArray(event && event.workspace_roots) ? event.workspace_roots.filter((value) => typeof value === "string" && value !== "") : [];
  return roots.length ? roots : [(event && (event.workspace_root || event.cwd)) || cwd];
}

function normalizePath(value, cwd) {
  if (typeof value !== "string" || value.trim() === "") throw new Error("native edit is missing a file path");
  const normalized = value.split("\\\\").join(path.sep);
  const absolute = path.resolve(cwd, normalized);
  const relative = path.relative(cwd, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("edit path escapes workspace: " + value);
  return { absolute, relative: relative || path.basename(absolute) };
}

async function existingPath(value, resolve, inspect = lstat) {
  let candidate = value;
  let suffix = "";
  while (true) {
    try {
      const resolved = await resolve(candidate);
      return suffix ? path.join(resolved, suffix) : resolved;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      let stats;
      try { stats = await inspect(candidate); } catch (inspectError) {
        if (inspectError.code !== "ENOENT") throw inspectError;
      }
      if (stats && stats.isSymbolicLink()) throw new Error("edit path cannot be safely resolved through a dangling symlink: " + candidate);
      const parent = path.dirname(candidate);
      if (parent === candidate) throw error;
      suffix = suffix ? path.join(path.basename(candidate), suffix) : path.basename(candidate);
      candidate = parent;
    }
  }
}

async function safeFile(value, roots, resolve = realpath) {
  let lastError;
  for (const root of roots) {
    try {
      const file = normalizePath(value, root);
      const workspace = await resolve(root);
      const target = await existingPath(file.absolute, resolve);
      const relative = path.relative(workspace, target);
      if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("edit path escapes workspace through a symlink: " + file.relative);
      return { ...file, absolute: target, relative, workspace };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("no workspace root was available");
}

async function current(file, read) {
  try { return await read(file.absolute, "utf8"); } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function replaceText(content, oldString, newString, replaceAll) {
  if (typeof oldString !== "string" || typeof newString !== "string") throw new Error("old_string and new_string must be strings");
  if (!content.includes(oldString)) throw new Error("old_string was not found in the current file");
  if (!replaceAll && content.indexOf(oldString) !== content.lastIndexOf(oldString)) throw new Error("old_string is ambiguous");
  return replaceAll ? content.split(oldString).join(newString) : content.replace(oldString, newString);
}

async function reconstruct(event, roots, read, resolve) {
  const input = event.tool_input || event.toolInput;
  if (!input || typeof input !== "object") throw new Error("native edit payload is missing");
  const file = await safeFile(input.file_path || input.path, roots, resolve);
  const before = await current(file, read);
  const toolName = event.tool_name || event.toolName;
  if (toolName === "Write") {
    if (typeof input.content !== "string") throw new Error("Write content must be a string");
    return { file, before, after: input.content };
  }
  if (before === null) throw new Error("Edit target does not exist");
  return { file, before, after: replaceText(before, input.old_string, input.new_string, input.replace_all === true) };
}

function findingKey(finding) {
  return finding.reason + "\u0000" + finding.excerpt;
}

function newFindings(before, after) {
  const counts = new Map();
  for (const item of before) counts.set(findingKey(item), (counts.get(findingKey(item)) || 0) + 1);
  return after.filter((item) => {
    const key = findingKey(item);
    const count = counts.get(key) || 0;
    if (!count) return true;
    counts.set(key, count - 1);
    return false;
  });
}

function identity(event, root, file) {
  const values = [root, event.conversation_id, event.generation_id, event.tool_use_id || event.tool_call_id, event.tool_name || event.toolName, file];
  if (values.some((value) => typeof value !== "string" || value === "")) return null;
  return values;
}

function statePath(stateDir, values) {
  const digest = crypto.createHash("sha256").update(JSON.stringify(values)).digest("hex");
  return path.join(stateDir, digest + ".json");
}

async function cleanup(stateDir, now, ttl, entries = readdir, remove = unlink) {
  let names = [];
  try { names = await entries(stateDir); } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  await Promise.all(names.filter((name) => name.endsWith(".json")).map(async (name) => {
    const file = path.join(stateDir, name);
    try {
      const record = JSON.parse(await readFile(file, "utf8"));
      if (now - record.createdAt > ttl) await remove(file);
    } catch {}
  }));
}

async function saveState(file, record) {
  await mkdir(file.dir, { recursive: true });
  const temporary = file.path + "." + process.pid + "." + crypto.randomBytes(6).toString("hex") + ".tmp";
  await writeFile(temporary, JSON.stringify(record), "utf8");
  await rename(temporary, file.path);
}

async function consumeState(file, read, remove) {
  const claimed = file + "." + process.pid + "." + crypto.randomBytes(6).toString("hex") + ".consumed";
  await rename(file, claimed);
  try {
    return JSON.parse(await read(claimed, "utf8"));
  } finally {
    await remove(claimed);
  }
}

function defaultStateDir() {
  return path.join(os.tmpdir(), "ban-fixed-width-prose-cursor");
}

export async function evaluateCursorHook(event, options = {}) {
  const mode = options.mode || "hard-block";
  const post = phase(event) === "posttooluse";
  try {
    if (!event || (!post && phase(event) !== "pretooluse") || !TOOLS.has(event.tool_name || event.toolName)) return {};
    const roots = workspaceRoots(event, options.cwd || process.cwd());
    const input = event.tool_input || event.toolInput;
    const fileValue = input && (input.file_path || input.path);
    if (post) {
      const file = await safeFile(fileValue, roots, options.resolve || realpath);
      if (!supported(file.relative)) return {};
      const values = identity(event, file.workspace, file.absolute);
      if (!values) return diagnostic("the event has no stable conversation, generation, tool-use, or file identity", true);
      const stateDir = options.stateDir || defaultStateDir();
      const record = await consumeState(statePath(stateDir, values), options.read || readFile, options.remove || unlink);
      if (JSON.stringify(record.identity) !== JSON.stringify(values)) return diagnostic("warning state did not match this event", true);
      return record.findings.length ? { additional_context: messageFor(record.findings) } : {};
    }
    const target = await reconstruct(event, roots, options.read || readFile, options.resolve || realpath);
    if (!supported(target.file.relative)) return {};
    const before = target.before === null ? [] : (options.scan || scanText)(target.before, { source: target.file.relative }).findings;
    const after = (options.scan || scanText)(target.after, { source: target.file.relative }).findings;
    const findings = newFindings(before, after);
    if (mode === "hard-block") return findings.length ? deny(messageFor(findings)) : {};
    const values = identity(event, target.file.workspace, target.file.absolute);
    if (!values) return diagnostic("the event has no stable conversation, generation, tool-use, or file identity", post);
    const stateDir = options.stateDir || defaultStateDir();
    const pathName = statePath(stateDir, values);
    await cleanup(stateDir, Date.now(), options.ttl || TTL_MS);
    await saveState({ dir: stateDir, path: pathName }, { identity: values, createdAt: Date.now(), findings });
    return {};
  } catch (error) {
    return diagnostic(error.message, post);
  }
}

export async function main(args = process.argv.slice(2), io = {}) {
  const input = io.stdin || process.stdin;
  const output = io.stdout || process.stdout;
  let raw = "";
  for await (const chunk of input) raw += chunk;
  let event;
  try { event = JSON.parse(raw); } catch (error) {
    output.write(JSON.stringify(diagnostic("malformed JSON: " + error.message)) + "\n");
    return;
  }
  output.write(JSON.stringify(await evaluateCursorHook(event, { ...io, mode: args.includes("--mode=warn") ? "warn" : "hard-block" })) + "\n");
}

export { cleanup, findingKey, newFindings, normalizePath, reconstruct, replaceText, statePath };
