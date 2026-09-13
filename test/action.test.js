import assert from "node:assert/strict";
import test from "node:test";
import { parseInputs, run } from "../src/action.js";

function harness(inputs = {}, event = null) {
  const outputs = {};
  const errors = [];
  const summary = { addHeading() { return this; }, addTable() { return this; }, addRaw() { return this; }, async write() { this.written = true; } };
  return {
    coreApi: {
      getInput(name) { return inputs[name] || ""; },
      getBooleanInput(name) { return inputs[name] === "true"; },
      setOutput(name, value) { outputs[name] = value; },
      error(value) { errors.push(value); },
      info(value) { errors.push(`info:${value}`); },
      summary,
      setFailed(value) { errors.push(`failed:${value}`); }
    },
    fsApi: { async readFile() { return JSON.stringify(event); } },
    env: event ? { GITHUB_EVENT_NAME: "pull_request", GITHUB_EVENT_PATH: "event.json" } : {},
    outputs,
    errors,
    summary
  };
}

test("parses multiline inputs and debug", () => {
  const coreApi = { getInput(name) { return name === "debug" ? "true" : " one\n\n two "; }, getBooleanInput() { return true; } };
  assert.deepEqual(parseInputs(coreApi), { paths: ["one", "two"], include: ["one", "two"], exclude: ["one", "two"], debug: true });
});

test("scans repository and pull request description with deterministic outputs", async () => {
  const h = harness({ paths: "test/fixtures/clean.md" }, { pull_request: { body: "First line.\nSecond line." } });
  const result = await run(h);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].source, "pull-request-description");
  assert.deepEqual(h.outputs, { "finding-count": 1, "files-scanned": 2, "files-with-findings": 1, "error-count": 0 });
  assert.match(h.errors.join("\n"), /pull-request-description:2:1/);
  assert.equal(h.summary.written, true);
});

test("emits debug scan details and treats an empty pull request body as clean", async () => {
  const h = harness({ paths: "test/fixtures/clean.md", debug: "true" }, { pull_request: { body: "" } });
  const result = await run(h);
  assert.equal(result.findings.length, 0);
  assert.equal(result.errors.length, 0);
  assert.match(h.errors.join("\n"), /info:scanned 1 repository source/);
});

test("does not interpret untrusted finding data as workflow commands", async () => {
  const h = harness({}, { pull_request: { body: "First line.\n::warning file=x\nSecond line." } });
  await run(h);
  assert.ok(h.errors.every((item) => !item.startsWith("::")));
});

test("reports event payload errors distinctly", async () => {
  const h = harness();
  h.env = { GITHUB_EVENT_NAME: "pull_request", GITHUB_EVENT_PATH: "missing" };
  h.fsApi = { async readFile() { throw new Error("cannot read event"); } };
  const result = await run(h);
  assert.equal(result.errors.length, 1);
  assert.equal(h.outputs["error-count"], 1);
  assert.match(h.errors.join("\n"), /cannot read event/);
});

test("reports invalid inputs with outputs and a summary", async () => {
  const h = harness();
  h.coreApi.getBooleanInput = () => { throw new Error("invalid boolean"); };
  const result = await run(h);
  assert.deepEqual(result.summary, { findingCount: 0, filesScanned: 0, filesWithFindings: 0, errorCount: 1 });
  assert.equal(h.outputs["error-count"], 1);
  assert.equal(h.outputs["finding-count"], 0);
  assert.equal(h.summary.written, true);
});
