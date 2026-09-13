import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const marketplace = JSON.parse(await readFile(path.join(root, ".agents/plugins/marketplace.json"), "utf8"));
if (marketplace.plugins?.length !== 2) throw new Error("marketplace must contain two plugins");
for (const entry of marketplace.plugins) {
  if (entry.version !== "1.1.0" || entry.source?.source !== "local" || !entry.source.path.startsWith("./") || !entry.install.includes(entry.name)) throw new Error(`invalid marketplace entry for ${entry.name}`);
  const plugin = path.join(root, ".agents/plugins", entry.name);
  const metadata = JSON.parse(await readFile(path.join(plugin, ".codex-plugin/plugin.json"), "utf8"));
  const portable = JSON.parse(await readFile(path.join(plugin, "plugin.json"), "utf8"));
  if (metadata.name !== entry.name || metadata.version !== "1.1.0") throw new Error(`invalid metadata for ${entry.name}`);
  if (portable.name !== entry.name || portable.version !== "1.1.0" || portable.extensions?.["com.openai"]?.hooks !== "./hooks/hooks.json") throw new Error(`invalid portable metadata for ${entry.name}`);
  const hooks = JSON.parse(await readFile(path.join(plugin, "hooks/hooks.json"), "utf8"));
  if (!hooks.hooks?.PreToolUse?.length || hooks.hooks.PreToolUse[0].hooks[0].type !== "command") throw new Error(`invalid hook config for ${entry.name}`);
  await access(path.join(plugin, "bin/hook.js"));
  await access(path.join(plugin, "skills/no-fixed-width-prose/SKILL.md"));
}
