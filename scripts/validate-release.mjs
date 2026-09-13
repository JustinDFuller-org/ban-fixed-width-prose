import { readFile } from "node:fs/promises";

const packageData = JSON.parse(await readFile("package.json", "utf8"));
const lockData = JSON.parse(await readFile("package-lock.json", "utf8"));
const requestedTag = process.argv[2] || process.env.GITHUB_REF_NAME;
const tag = /^v\d+\.\d+\.\d+$/.test(requestedTag || "") ? requestedTag : "v" + packageData.version;
if (!/^v\d+\.\d+\.\d+$/.test(tag || "")) throw new Error("unsupported stable release tag: " + (tag || "missing"));
const version = tag.slice(1);
if (packageData.version !== version || lockData.version !== version || lockData.packages?.[""].version !== version) throw new Error("release " + version + " does not match package metadata");
if (packageData.name !== "@justindfuller/ban-fixed-width-prose") throw new Error("release package must use the @justindfuller scope");
if (packageData.repository?.url !== "https://github.com/JustinDFuller-org/ban-fixed-width-prose.git") throw new Error("release package repository metadata is incorrect");
if (packageData.publishConfig?.access !== "public") throw new Error("release package must be public");
if (packageData.bin?.["ban-fixed-width-prose"] !== "./bin/ban-fixed-width-prose.js") throw new Error("release package CLI entrypoint is incorrect");
if (packageData.exports?.["."] !== "./src/index.js") throw new Error("release package root export is incorrect");
