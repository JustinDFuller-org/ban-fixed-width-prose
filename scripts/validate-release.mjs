import { readFile } from "node:fs/promises";

const tag = process.argv[2] || process.env.GITHUB_REF_NAME;
const packageData = JSON.parse(await readFile("package.json", "utf8"));
const lockData = JSON.parse(await readFile("package-lock.json", "utf8"));
if (!/^v1\.\d+\.\d+$/.test(tag || "")) throw new Error(`unsupported stable release tag: ${tag || "missing"}`);
const version = tag.slice(1);
if (packageData.version !== version || lockData.version !== version || lockData.packages?.[""].version !== version) throw new Error(`release ${version} does not match package metadata`);
