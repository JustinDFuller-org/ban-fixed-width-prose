import path from "node:path";
import { readFile } from "node:fs/promises";
import { RECOGNIZED_EXTENSIONS, scanText } from "./scanner.js";

const EDIT_TOOLS = new Set(["apply_patch", "file_edit", "edit", "write_file", "write"]) ;

function result(output) {
  return `${JSON.stringify(output)}\n`;
}

function context(message) {
  return { hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: message } };
}

function deny(message) {
  return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: message } };
}

function modeFromArgs(args = []) {
  const value = args.find((arg) => arg.startsWith("--mode="))?.slice("--mode=".length);
  return value || process.env.CODEX_HOOK_MODE || "hard-block";
}

function normalizePath(value, cwd) {
  if (typeof value !== "string" || value.trim() === "") throw new Error("edit payload is missing a file path");
  const absolute = path.resolve(cwd, value);
  const relative = path.relative(cwd, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`edit path escapes workspace: ${value}`);
  return { absolute, relative: relative || path.basename(absolute) };
}

function supported(relative) {
  return RECOGNIZED_EXTENSIONS.has(path.extname(relative).toLowerCase());
}

function replacement(content, oldString, newString) {
  if (typeof oldString !== "string" || typeof newString !== "string") throw new Error("old_string and new_string must be strings");
  const index = content.indexOf(oldString);
  if (index < 0) throw new Error("old_string was not found in the current file");
  if (content.indexOf(oldString, index + oldString.length) >= 0) throw new Error("old_string is ambiguous");
  return `${content.slice(0, index)}${newString}${content.slice(index + oldString.length)}`;
}

function applyHunk(content, lines) {
  const source = content.replace(/\r\n?/g, "\n").split("\n");
  if (source.length && source.at(-1) === "") source.pop();
  const oldLines = lines.filter((line) => line[0] === " " || line[0] === "-").map((line) => line.slice(1));
  const newLines = lines.filter((line) => line[0] === " " || line[0] === "+").map((line) => line.slice(1));
  let index = source.findIndex((_, candidate) => oldLines.every((line, offset) => source[candidate + offset] === line));
  if (oldLines.length === 0) index = source.length;
  if (index < 0) throw new Error("patch hunk does not match current file");
  source.splice(index, oldLines.length, ...newLines);
  return `${source.join("\n")}${content.endsWith("\n") ? "\n" : ""}`;
}

function parsePatch(patch) {
  const lines = String(patch).replace(/\r\n?/g, "\n").split("\n");
  const edits = [];
  let current = null;
  let hunk = [];
  const flush = () => {
    if (!current) return;
    if (hunk.length) current.hunks.push(hunk);
    hunk = [];
    edits.push(current);
    current = null;
  };
  for (const line of lines) {
    const add = /^\*\*\* Add File: (.+)$/.exec(line);
    const update = /^\*\*\* Update File: (.+)$/.exec(line);
    const remove = /^\*\*\* Delete File: (.+)$/.exec(line);
    const move = /^\*\*\* Move to: (.+)$/.exec(line);
    if (add || update || remove) {
      flush();
      current = { path: (add || update || remove)[1], kind: add ? "add" : update ? "update" : "delete", hunks: [] };
      continue;
    }
    if (move && current) {
      current.moveTo = move[1];
      continue;
    }
    if (current && (line.startsWith("@@") || line.startsWith("+") || line.startsWith("-") || line.startsWith(" "))) {
      if (!line.startsWith("@@")) hunk.push(line);
      continue;
    }
  }
  flush();
  if (!edits.length) throw new Error("patch contains no file edits");
  return edits;
}

function payloadEdits(toolInput) {
  const patch = toolInput.patch || toolInput.apply_patch || (typeof toolInput.command === "string" && toolInput.command.includes("*** Begin Patch") ? toolInput.command : null);
  if (patch) return parsePatch(patch).map((edit) => ({ ...edit, content: edit.kind === "add" ? edit.hunks.flat().filter((line) => line.startsWith("+")).map((line) => line.slice(1)).join("\n") : undefined }));
  if (Array.isArray(toolInput.edits)) return toolInput.edits;
  return [toolInput];
}

async function currentContent(file, read = readFile) {
  try { return await read(file.absolute, "utf8"); } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function reconstruct(edit, cwd, read) {
  const file = normalizePath(edit.path || edit.file_path || edit.filePath || edit.filename, cwd);
  const before = await currentContent(file, read);
  let after;
  const kind = edit.kind || (edit.delete || edit.operation === "delete" ? "delete" : "update");
  if (kind === "delete" || edit.delete === true) after = null;
  else if (typeof edit.content === "string") after = edit.content;
  else if (typeof edit.new_content === "string") after = edit.new_content;
  else if (typeof edit.newContent === "string") after = edit.newContent;
  else if (typeof edit.text === "string") after = edit.text;
  else if (typeof edit.new_string === "string") after = replacement(before || "", edit.old_string, edit.new_string);
  else if (Array.isArray(edit.hunks)) after = edit.hunks.reduce((value, lines) => applyHunk(value, lines), before || "");
  else throw new Error(`unsupported edit shape for ${file.relative}`);
  if (edit.moveTo) {
    const moved = normalizePath(edit.moveTo, cwd);
    return [{ file, before, after: null }, { file: moved, before: await currentContent(moved, read), after }];
  }
  return [{ file, before, after }];
}

function findingKey(finding) {
  return `${finding.reason}\u0000${finding.excerpt}`;
}

function newFindings(before, after, source) {
  const oldCounts = new Map();
  for (const finding of before) oldCounts.set(findingKey(finding), (oldCounts.get(findingKey(finding)) || 0) + 1);
  return after.filter((finding) => {
    const key = findingKey(finding);
    const count = oldCounts.get(key) || 0;
    if (count) { oldCounts.set(key, count - 1); return false; }
    return true;
  }).map((finding) => ({ ...finding, source }));
}

export async function evaluateHook(event, { mode = "hard-block", cwd = process.cwd(), read = readFile, scan = scanText } = {}) {
  try {
    if (!event || event.hook_event_name && event.hook_event_name !== "PreToolUse") return {};
    const toolName = event.tool_name || event.toolName;
    const input = event.tool_input || event.toolInput;
    if (!EDIT_TOOLS.has(toolName) || !input || typeof input !== "object") return {};
    const edits = payloadEdits(input);
    const findings = [];
    for (const edit of edits) for (const target of await reconstruct(edit, cwd, read)) {
      if (!supported(target.file.relative) || target.after === null) continue;
      const before = target.before === null ? [] : scan(target.before, { source: target.file.relative }).findings;
      const after = scan(target.after, { source: target.file.relative }).findings;
      findings.push(...newFindings(before, after, target.file.relative));
    }
    if (!findings.length) return {};
    const details = findings.map((finding) => `${finding.source}:${finding.line}:${finding.column} (${finding.reason})`).join(", ");
    const message = `Fixed-width prose detected at ${details}. Remove the physical wrap, or use an allowed structural/documentation form.`;
    return mode === "warn" ? context(message) : deny(message);
  } catch (error) {
    return context(`Fixed-width prose hook could not evaluate this edit and allowed it: ${error.message}`);
  }
}

export async function main(args = process.argv.slice(2), io = {}) {
  const input = io.stdin ?? process.stdin;
  const output = io.stdout ?? process.stdout;
  let raw = "";
  for await (const chunk of input) raw += chunk;
  let event;
  try { event = JSON.parse(raw); } catch (error) { output.write(result(context(`Fixed-width prose hook received malformed JSON and allowed the tool call: ${error.message}`))); return; }
  output.write(result(await evaluateHook(event, { ...io, mode: modeFromArgs(args) })));
}

export { applyHunk, parsePatch, payloadEdits, reconstruct, newFindings, modeFromArgs };
