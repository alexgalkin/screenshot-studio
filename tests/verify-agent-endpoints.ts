/**
 * Checks the static agent files. Does not start a server or call the network.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { llmsFullTxt, llmsTxt } from "../lib/agents/llms";
import { openApiSpec } from "../lib/api/openapi";

const banned = ["/api/screenshot", "/api/export", "/api/tweet", "/api/image-proxy"];

function assertClean(name: string, text: string): void {
  for (const token of banned) {
    assert.equal(text.includes(token), false, `${name} still mentions ${token}`);
  }
}

assertClean("llms.txt", llmsTxt);
assertClean("llms-full.txt", llmsFullTxt);
assertClean("openapi.json", JSON.stringify(openApiSpec));
assert.deepEqual(openApiSpec.paths, {});

const redirects = readFileSync("public/_redirects", "utf8");
for (const path of ["/docs", "/developers", "/tweet"]) {
  assert.match(redirects, new RegExp(`^${path}\\s+/`, "m"), `missing redirect for ${path}`);
}

console.log("static agent files ok");
