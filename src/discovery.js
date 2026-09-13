import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { RECOGNIZED_EXTENSIONS, SKIPPED_DIRECTORIES, scanText } from "./scanner.js";

const execFileAsync = promisify(execFile);

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
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch (error) {
    options.errors?.push(`${displaySource(root, options.cwd || relativeRoot)}: ${error.message}`);
    return [];
  }
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

async function gitDefaultFiles(cwd) {
  const { stdout } = await execFileAsync("git", ["-C", cwd, "ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8" });
  const { stdout: repositoryRoot } = await execFileAsync("git", ["-C", cwd, "rev-parse", "--show-toplevel"], { encoding: "utf8" });
  const root = await fs.realpath(repositoryRoot.trim());
  const realCwd = await fs.realpath(cwd);
  return stdout.split("\0").filter(Boolean).map((relativePath) => path.resolve(root, relativePath)).filter((filePath) => filePath === realCwd || filePath.startsWith(`${realCwd}${path.sep}`)).map((filePath) => path.resolve(cwd, path.relative(realCwd, filePath)));
}

async function discoverDefault(cwd, options) {
  try {
    const candidates = await gitDefaultFiles(cwd);
    const files = [];
    for (const fullPath of candidates) {
      if (!recognizedFile(fullPath)) continue;
      const relativePath = displaySource(fullPath, cwd);
      if (relativePath.split("/").some((part) => SKIPPED_DIRECTORIES.has(part))) continue;
      if (!matchesAny(relativePath, options.include || [])) continue;
      if ((options.exclude || []).some((pattern) => globToRegExp(normalizePath(pattern)).test(relativePath))) continue;
      files.push(fullPath);
    }
    return files;
  } catch {
    return discover(cwd, options, cwd);
  }
}

export async function sourcePaths(inputPaths = [], options = {}) {
  const cwd = path.resolve(options.cwd || process.cwd());
  if (inputPaths.length === 0) return (await discoverDefault(cwd, options)).sort((left, right) => displaySource(left, cwd).localeCompare(displaySource(right, cwd)));
  const paths = inputPaths;
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
  const files = [];
  const discoveryErrors = [];
  const errors = [];
  if (inputPaths.length === 0) {
    files.push(...await discoverDefault(cwd, { ...options, cwd, errors: discoveryErrors }));
  }
  for (const input of inputPaths) {
    const resolved = path.resolve(cwd, input);
    try {
      const stats = await fs.stat(resolved);
      if (stats.isDirectory()) files.push(...await discover(resolved, { ...options, cwd, errors: discoveryErrors }, resolved));
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
    errors: [...discoveryErrors, ...errors]
  };
}

export { displaySource, globToRegExp, matchesAny };
