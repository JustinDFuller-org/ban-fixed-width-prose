import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const marketplace = JSON.parse(await readFile(path.join(root, ".agents/plugins/marketplace.json"), "utf8"));
if (marketplace.plugins?.length !== 2) throw new Error("marketplace must contain two plugins");
for (const entry of marketplace.plugins) {
  if (entry.version !== "1.2.0" || entry.source?.source !== "local" || !entry.source.path.startsWith("./") || !entry.install.includes(entry.name)) throw new Error(`invalid marketplace entry for ${entry.name}`);
  const plugin = path.join(root, ".agents/plugins", entry.name);
  const metadata = JSON.parse(await readFile(path.join(plugin, ".codex-plugin/plugin.json"), "utf8"));
  const portable = JSON.parse(await readFile(path.join(plugin, "plugin.json"), "utf8"));
  if (metadata.name !== entry.name || metadata.version !== "1.2.0") throw new Error(`invalid metadata for ${entry.name}`);
  if (portable.name !== entry.name || portable.version !== "1.2.0" || portable.extensions?.["com.openai"]?.hooks !== "./hooks/hooks.json") throw new Error(`invalid portable metadata for ${entry.name}`);
  const hooks = JSON.parse(await readFile(path.join(plugin, "hooks/hooks.json"), "utf8"));
  if (!hooks.hooks?.PreToolUse?.length || hooks.hooks.PreToolUse[0].hooks[0].type !== "command") throw new Error(`invalid hook config for ${entry.name}`);
  await access(path.join(plugin, "bin/hook.js"));
  await access(path.join(plugin, "skills/no-fixed-width-prose/SKILL.md"));
}
const claudeMarketplace = JSON.parse(await readFile(path.join(root, ".claude-plugin/marketplace.json"), "utf8"));
if (claudeMarketplace.metadata?.version !== "1.2.0" || claudeMarketplace.plugins?.length !== 2) throw new Error("invalid Claude marketplace metadata");
for (const entry of claudeMarketplace.plugins) {
  if (entry.version !== "1.2.0" || typeof entry.source !== "string" || !entry.source.startsWith("./claude-plugins/")) throw new Error(`invalid Claude marketplace entry for ${entry.name}`);
  const plugin = path.join(root, entry.source.slice(2));
  const metadata = JSON.parse(await readFile(path.join(plugin, ".claude-plugin/plugin.json"), "utf8"));
  if (metadata.name !== entry.name || metadata.version !== "1.2.0" || metadata.hooks) throw new Error(`invalid Claude metadata for ${entry.name}`);
  const hooks = JSON.parse(await readFile(path.join(plugin, "hooks/hooks.json"), "utf8"));
  const registration = hooks.hooks?.PreToolUse?.[0];
  if (registration?.matcher !== "Write|Edit" || registration.hooks?.[0]?.type !== "command" || !registration.hooks[0].command.includes("${CLAUDE_PLUGIN_ROOT}") || !registration.hooks[0].command.endsWith("/bin/hook.mjs")) throw new Error(`invalid Claude hook config for ${entry.name}`);
  await access(path.join(plugin, "bin/hook.mjs"));
  await access(path.join(plugin, "skills/no-fixed-width-prose/SKILL.md"));
}

const cursorMarketplace = JSON.parse(await readFile(path.join(root, ".cursor-plugin/marketplace.json"), "utf8"));
if (cursorMarketplace.metadata?.version !== "1.3.0" || cursorMarketplace.plugins?.length !== 2) throw new Error("invalid Cursor marketplace metadata");
for (const entry of cursorMarketplace.plugins) {
  if (entry.version !== "1.3.0" || typeof entry.source !== "string" || !entry.source.startsWith("./cursor-plugins/") || entry.source.includes("..")) throw new Error("invalid Cursor marketplace entry for " + entry.name);
  const plugin = path.join(root, entry.source.slice(2));
  const metadata = JSON.parse(await readFile(path.join(plugin, ".cursor-plugin/plugin.json"), "utf8"));
  if (metadata.name !== entry.name || metadata.version !== "1.3.0" || !Array.isArray(metadata.skills)) throw new Error("invalid Cursor metadata for " + entry.name);
  const hooks = JSON.parse(await readFile(path.join(plugin, "hooks/hooks.json"), "utf8"));
  if (hooks.version !== 1) throw new Error("invalid Cursor hooks version for " + entry.name);
  const pre = hooks.hooks?.preToolUse?.[0];
  if (pre?.matcher !== "Write|Edit" || pre.hooks?.[0]?.type !== "command" || !pre.hooks[0].command.includes("\${CURSOR_PLUGIN_ROOT}") || !pre.hooks[0].command.endsWith("/bin/hook.mjs")) throw new Error("invalid Cursor preToolUse hook for " + entry.name);
  if (entry.name.endsWith("-hard-block") && hooks.hooks?.postToolUse) throw new Error("hard-block Cursor plugin must not register postToolUse");
  if (entry.name.endsWith("-warn")) {
    const post = hooks.hooks?.postToolUse?.[0];
    if (post?.matcher !== "Write|Edit" || post.hooks?.[0]?.type !== "command") throw new Error("warning Cursor plugin must register postToolUse");
  }
  await access(path.join(plugin, "bin/hook.mjs"));
  await access(path.join(plugin, "skills/no-fixed-width-prose/SKILL.md"));
}
