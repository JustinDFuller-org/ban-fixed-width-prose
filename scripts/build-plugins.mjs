import { mkdir, rm, cp } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const run = promisify(execFile);
const root = process.cwd();
for (const [name, entry] of [["ban-fixed-width-prose-hard-block", "src/codex-hook-hard-block.js"], ["ban-fixed-width-prose-warn", "src/codex-hook-warn.js"]]) {
  const output = path.join(root, ".agents/plugins", name, "bin");
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const temporary = path.join(root, `.codex-plugin-${name}`);
  await rm(temporary, { recursive: true, force: true });
  await run("npx", ["--no-install", "ncc", "build", entry, "--minify", "-o", temporary], { cwd: root });
  await cp(path.join(temporary, "index.js"), path.join(output, "hook.js"));
  await rm(temporary, { recursive: true, force: true });
}
