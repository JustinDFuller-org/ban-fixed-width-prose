import path from "node:path";
import { lstat, readFile, realpath } from "node:fs/promises";
import { RECOGNIZED_EXTENSIONS, scanText } from "./scanner.js";
import { newFindings } from "./codex-hook.js";

const TOOL_NAMES = new Set(["Write", "Edit"]);

function output(value) {
  return `${JSON.stringify(value)}\n`;
}

function context(message) {
  return { hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: message } };
}

function deny(message) {
  return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: message } };
}

function normalizePath(value, cwd) {
  if (typeof value !== "string" || value.trim() === "") throw new Error("native edit is missing an absolute file path");
  const normalized = value.split("\\").join(path.sep);
  const absolute = path.resolve(cwd, normalized);
  const relative = path.relative(cwd, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`edit path escapes workspace: ${value}`);
  return { absolute, relative: relative || path.basename(absolute) };
}

function supported(relative) {
  return RECOGNIZED_EXTENSIONS.has(path.extname(relative).toLowerCase());
}

function replaceText(content, oldString, newString, replaceAll) {
  if (typeof oldString !== "string" || typeof newString !== "string") throw new Error("old_string and new_string must be strings");
  if (!content.includes(oldString)) throw new Error("old_string was not found in the current file");
  if (!replaceAll && content.indexOf(oldString) !== content.lastIndexOf(oldString)) throw new Error("old_string is ambiguous");
  return replaceAll ? content.split(oldString).join(newString) : content.replace(oldString, newString);
}

async function readCurrent(file, read) {
  try {
    return await read(file.absolute, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
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
      try {
        stats = await inspect(candidate);
      } catch (inspectError) {
        if (inspectError.code !== "ENOENT") throw inspectError;
      }
      if (stats?.isSymbolicLink()) throw new Error(`edit path cannot be safely resolved through a dangling symlink: ${candidate}`);
      const parent = path.dirname(candidate);
      if (parent === candidate) throw error;
      suffix = suffix ? path.join(path.basename(candidate), suffix) : path.basename(candidate);
      candidate = parent;
    }
  }
}

async function resolveWithinWorkspace(file, cwd, resolve) {
  const workspace = await resolve(cwd);
  const target = await existingPath(file.absolute, resolve);
  const relative = path.relative(workspace, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`edit path escapes workspace through a symlink: ${file.relative}`);
  return { ...file, absolute: target };
}

async function reconstruct(event, cwd, read, resolve = realpath) {
  const input = event.tool_input;
  const file = await resolveWithinWorkspace(normalizePath(input.file_path, cwd), cwd, resolve);
  const before = await readCurrent(file, read);
  if (event.tool_name === "Write") {
    if (typeof input.content !== "string") throw new Error("Write content must be a string");
    return { file, before, after: input.content };
  }
  if (before === null) throw new Error("Edit target does not exist");
  return {
    file,
    before,
    after: replaceText(before, input.old_string, input.new_string, input.replace_all === true)
  };
}

function findingMessage(findings) {
  const details = findings.map((finding) => `${finding.source}:${finding.line}:${finding.column} (${finding.reason})`).join(", ");
  return `Fixed-width prose detected at ${details}. Remove the physical wrap, or use an allowed structural/documentation form.`;
}

export async function evaluateClaudeHook(event, { mode = "hard-block", cwd = process.cwd(), read = readFile, scan = scanText, resolve = realpath } = {}) {
  try {
    if (!event || event.hook_event_name !== "PreToolUse" || !TOOL_NAMES.has(event.tool_name) || !event.tool_input || typeof event.tool_input !== "object") return {};
    const target = await reconstruct(event, event.cwd || cwd, read, resolve);
    if (!supported(target.file.relative)) return {};
    const before = target.before === null ? [] : scan(target.before, { source: target.file.relative }).findings;
    const after = scan(target.after, { source: target.file.relative }).findings;
    const findings = newFindings(before, after, target.file.relative);
    if (!findings.length) return {};
    const message = findingMessage(findings);
    return mode === "warn" ? context(message) : deny(message);
  } catch (error) {
    return context(`Fixed-width prose hook could not evaluate this native edit and allowed it: ${error.message}`);
  }
}

export async function main(args = process.argv.slice(2), io = {}) {
  const input = io.stdin ?? process.stdin;
  const outputStream = io.stdout ?? process.stdout;
  let raw = "";
  for await (const chunk of input) raw += chunk;
  try {
    const event = JSON.parse(raw);
    outputStream.write(output(await evaluateClaudeHook(event, { ...io, mode: args.includes("--mode=warn") ? "warn" : "hard-block" })));
  } catch (error) {
    outputStream.write(output(context(`Fixed-width prose hook received malformed JSON and allowed the tool call: ${error.message}`)));
  }
}

export { normalizePath, replaceText, reconstruct, resolveWithinWorkspace };
