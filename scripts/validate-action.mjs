import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const metadata = await readFile(path.join(root, "action.yml"), "utf8");
const packageData = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const required = ["using: node24", "main: dist/index.js", "paths:", "include:", "exclude:", "debug:", "finding-count:", "files-scanned:", "files-with-findings:", "error-count:"];
for (const value of required) if (!metadata.includes(value)) throw new Error(`action metadata missing ${value}`);
if (packageData.engines?.node !== ">=24") throw new Error("package Node engine must remain >=24");
await access(path.join(root, "dist", "index.js"));
