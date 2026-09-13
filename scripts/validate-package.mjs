import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const packageData = JSON.parse(await readFile("package.json", "utf8"));
const { stdout } = await execFileAsync("npm", ["pack", "--dry-run", "--json"], { maxBuffer: 1024 * 1024 });
const pack = JSON.parse(stdout)[0];
const files = new Set(pack.files.map((file) => file.path));
const requiredFiles = [
  "LICENSE",
  "README.md",
  "package.json",
  "bin/ban-fixed-width-prose.js",
  "src/index.js"
];
for (const file of requiredFiles) {
  if (!files.has(file)) throw new Error("npm package is missing " + file);
}
for (const file of files) {
  if ([".github/", "coverage/", "node_modules/", "openspec/", "scripts/", "test/"].some((prefix) => file.startsWith(prefix))) throw new Error("npm package includes excluded file " + file);
}
if (pack.name !== packageData.name || pack.version !== packageData.version) throw new Error("npm package metadata does not match package.json");
if (packageData.name !== "@justindfuller/ban-fixed-width-prose") throw new Error("package name must use the @justindfuller scope");
console.log("validated " + pack.name + "@" + pack.version + " with " + pack.files.length + " files");
