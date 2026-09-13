import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const workflow = readFileSync(".github/workflows/release.yml", "utf8");

test("release workflow stages the validated package artifact", () => {
  assert.match(workflow, /tags:\n\s+- 'v\*\.\*\.\*'/);
  assert.match(workflow, /jobs:\n\s+validate:/);
  assert.match(workflow, /\n\s+stage:\n/);
  assert.match(workflow, /needs: validate/);
  assert.match(workflow, /release-artifact/);
  assert.match(workflow, /SHA256SUMS/);
  assert.match(workflow, /npm@11\.15\.0/);
  assert.match(workflow, /npm stage publish/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /node scripts\/validate-release\.mjs \"\$RELEASE_TAG\"/);
  assert.doesNotMatch(workflow, /npm publish/);
  assert.doesNotMatch(workflow, /gh release/);
});
