import { promises as fs } from "node:fs";
import path from "node:path";
import { RECOGNIZED_EXTENSIONS, SKIPPED_DIRECTORIES, scanText } from "./scanner.js";

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function globToRegExp(pattern) {
  let expression = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*" && pattern[index + 1] === "*") {
      if (pattern[index + 2] === "/") {
        expression += "(?:.*/)?";
        index += 2;
      } else {
        expression += ".*";
        index += 1;
      }
    } else if (character === "*") expression += "[^/]*";
    else if (character === "?") expression += "[^/]";
    else expression += /[.+^${}()|[\]\\]/.test(character) ? `\\${character}` : character;
  }
  return new RegExp(`${expression}$`);
}

function matchesAny(relativePath, patterns) {
  return patterns.length === 0 || patterns.some((pattern) => globToRegExp(normalizePath(pattern)).test(relativePath));
}

function recognizedFile(filePath) {
  return RECOGNIZED_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

async function discover(root, options, relativeRoot = root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) files.push(...await discover(fullPath, options, relativeRoot));
      continue;
    }
    if (!entry.isFile() || !recognizedFile(fullPath)) continue;
    const relativePath = normalizePath(path.relative(options.cwd || relativeRoot, fullPath));
    if (!matchesAny(relativePath, options.include || [])) continue;
    if ((options.exclude || []).some((pattern) => globToRegExp(normalizePath(pattern)).test(relativePath))) continue;
    files.push(fullPath);
  }
  return files;
}

export async function sourcePaths(inputPaths = [], options = {}) {
  const cwd = path.resolve(options.cwd || process.cwd());
  const paths = inputPaths.length > 0 ? inputPaths : [cwd];
  const files = [];
  for (const input of paths) {
    const resolved = path.resolve(cwd, input);
    const stats = await fs.stat(resolved);
    if (stats.isDirectory()) files.push(...await discover(resolved, { ...options, cwd }, resolved));
    else if (stats.isFile()) files.push(resolved);
  }
  return [...new Set(files)].sort((left, right) => displaySource(left, cwd).localeCompare(displaySource(right, cwd)));
}

function displaySource(filePath, cwd) {
  const relative = path.relative(cwd, filePath);
  return normalizePath(relative || path.basename(filePath));
}

export async function scanPaths(inputPaths = [], options = {}) {
  const cwd = path.resolve(options.cwd || process.cwd());
  const paths = inputPaths.length > 0 ? inputPaths : [cwd];
  const files = [];
  const errors = [];
  for (const input of paths) {
    const resolved = path.resolve(cwd, input);
    try {
      const stats = await fs.stat(resolved);
      if (stats.isDirectory()) files.push(...await discover(resolved, { ...options, cwd }, resolved));
      else if (stats.isFile()) {
        const relativePath = displaySource(resolved, cwd);
        if (matchesAny(relativePath, options.include || []) && !(options.exclude || []).some((pattern) => globToRegExp(normalizePath(pattern)).test(relativePath))) files.push(resolved);
      } else errors.push(`unsupported source: ${input}`);
    } catch (error) {
      errors.push(`${input}: ${error.message}`);
    }
  }
  const uniqueFiles = [...new Set(files)].sort((left, right) => displaySource(left, cwd).localeCompare(displaySource(right, cwd)));
  const results = [];
  for (const filePath of uniqueFiles) {
    try {
      const text = await fs.readFile(filePath, "utf8");
      results.push(scanText(text, { source: displaySource(filePath, cwd) }));
    } catch (error) {
      errors.push(`${displaySource(filePath, cwd)}: ${error.message}`);
    }
  }
  const findings = results.flatMap((result) => result.findings).sort((left, right) => left.source.localeCompare(right.source) || left.line - right.line || left.column - right.column);
  return {
    findings,
    summary: { filesScanned: uniqueFiles.length, filesWithFindings: new Set(findings.map((item) => item.source)).size, findingCount: findings.length },
    errors
  };
}

export { displaySource, globToRegExp, matchesAny };
