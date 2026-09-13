import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import * as core from "@actions/core";
import { scanPaths } from "./discovery.js";
import { scanText } from "./scanner.js";

function multiline(value) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

export function parseInputs(coreApi = core) {
  return {
    paths: multiline(coreApi.getInput("paths")),
    include: multiline(coreApi.getInput("include")),
    exclude: multiline(coreApi.getInput("exclude")),
    debug: coreApi.getBooleanInput("debug")
  };
}

async function eventBody(env, fsApi) {
  if (!env.GITHUB_EVENT_NAME?.startsWith("pull_request") || !env.GITHUB_EVENT_PATH) return null;
  const payload = JSON.parse(await fsApi.readFile(env.GITHUB_EVENT_PATH, "utf8"));
  const body = payload.pull_request?.body;
  return typeof body === "string" && body.length > 0 ? body : null;
}

function aggregate(repository, pullRequest) {
  const findings = [...repository.findings, ...(pullRequest?.findings || [])].sort((left, right) => left.source.localeCompare(right.source) || left.line - right.line || left.column - right.column);
  const errors = [...repository.errors, ...(pullRequest?.errors || [])];
  return {
    findings,
    errors,
    summary: {
      findingCount: findings.length,
      filesScanned: repository.summary.filesScanned + (pullRequest ? 1 : 0),
      filesWithFindings: new Set(findings.map((item) => item.source)).size,
      errorCount: errors.length
    }
  };
}

function findingRow(finding) {
  return [finding.source, `${finding.line}:${finding.column}`, finding.reason, finding.excerpt];
}

export async function run({ coreApi = core, fsApi = fs, env = process.env } = {}) {
  try {
    const inputs = parseInputs(coreApi);
    const repository = await scanPaths(inputs.paths, inputs);
    if (inputs.debug) coreApi.info(`scanned ${repository.summary.filesScanned} repository source(s)`);
    let pullRequest = null;
    try {
      const body = await eventBody(env, fsApi);
      if (body !== null) pullRequest = scanText(body, { source: "pull-request-description" });
    } catch (error) {
      pullRequest = { findings: [], errors: [`pull-request-description: ${error.message}`], summary: { filesScanned: 0 } };
    }
    const result = aggregate(repository, pullRequest);
    coreApi.setOutput("finding-count", result.summary.findingCount);
    coreApi.setOutput("files-scanned", result.summary.filesScanned);
    coreApi.setOutput("files-with-findings", result.summary.filesWithFindings);
    coreApi.setOutput("error-count", result.summary.errorCount);
    for (const finding of result.findings) coreApi.error(`${finding.source}:${finding.line}:${finding.column} ${finding.reason}: ${finding.excerpt}`);
    for (const error of result.errors) coreApi.error(error);
    const summary = coreApi.summary.addHeading("Fixed-width prose scan").addTable([
      [{ data: "Metric", header: true }, { data: "Count", header: true }],
      ["Findings", String(result.summary.findingCount)],
      ["Files scanned", String(result.summary.filesScanned)],
      ["Files with findings", String(result.summary.filesWithFindings)],
      ["Operational errors", String(result.summary.errorCount)]
    ]);
    if (result.findings.length > 0) summary.addHeading("Findings").addTable([["Source", "Location", "Reason", "Excerpt"], ...result.findings.map(findingRow)]);
    if (result.errors.length > 0) summary.addHeading("Operational errors").addRaw(result.errors.join("\n"));
    await summary.write();
    if (result.findings.length > 0 || result.errors.length > 0) coreApi.setFailed("Fixed-width prose scan failed");
    return result;
  } catch (error) {
    coreApi.setFailed(`Fixed-width prose action error: ${error.message}`);
    return { findings: [], errors: [error.message] };
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await run();
