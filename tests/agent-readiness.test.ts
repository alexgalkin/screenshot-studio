import test from "node:test";
import assert from "node:assert/strict";
import {
  parseAccept,
  qualityFor,
  prefersMarkdown,
  isUnacceptable,
} from "../lib/agents/accept";
import {
  AGENT_PAGES,
  BASE_URL,
  AGENT_RESOURCES,
  findAgentPage,
  normalizeAgentPath,
  renderAgentPageMarkdown,
  renderNotAcceptableMarkdown,
  renderNotFoundMarkdown,
} from "../lib/agents/site-content";
import { openApiSpec } from "../lib/api/openapi";
import { llmsTxt, llmsFullTxt } from "../lib/agents/llms";

test("parseAccept reads media ranges and q values", () => {
  assert.deepEqual(parseAccept(null), []);
  assert.deepEqual(parseAccept("text/markdown"), [
    { type: "text", subtype: "markdown", q: 1 },
  ]);
  assert.deepEqual(parseAccept("text/markdown;q=0.4, text/html"), [
    { type: "text", subtype: "markdown", q: 0.4 },
    { type: "text", subtype: "html", q: 1 },
  ]);
  assert.deepEqual(parseAccept("*/*;q=abc"), [
    { type: "*", subtype: "*", q: 1 },
  ]);
});

test("qualityFor honours exact, subtype wildcard, and full wildcard matches", () => {
  const ranges = parseAccept("text/*;q=0.5, */*;q=0.1, text/markdown;q=0.9");
  assert.equal(qualityFor(ranges, "text/markdown"), 0.9);
  assert.equal(qualityFor(ranges, "text/html"), 0.5);
  assert.equal(qualityFor(ranges, "image/png"), 0.1);
  assert.equal(qualityFor(parseAccept("text/html"), "text/markdown"), 0);
});

test("prefersMarkdown only diverts explicit, higher-ranked markdown requests", () => {
  assert.equal(prefersMarkdown("text/markdown"), true);
  assert.equal(prefersMarkdown("text/x-markdown"), true);
  assert.equal(prefersMarkdown("text/markdown, text/html;q=0.5"), true);
  assert.equal(prefersMarkdown("text/markdown;q=0.9, text/html;q=0.8"), true);

  assert.equal(prefersMarkdown(null), false);
  assert.equal(prefersMarkdown("*/*"), false);
  assert.equal(prefersMarkdown("text/html"), false);
  assert.equal(
    prefersMarkdown(
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,*/*;q=0.8",
    ),
    false,
  );
  assert.equal(prefersMarkdown("text/markdown;q=0.5, text/html;q=0.9"), false);
  assert.equal(prefersMarkdown("text/markdown;q=1, text/html;q=1"), false);
  assert.equal(prefersMarkdown("text/markdown;q=0"), false);
});

test("isUnacceptable is true only when every supported type is ruled out", () => {
  assert.equal(isUnacceptable("application/json"), true);
  assert.equal(isUnacceptable("text/html;q=0, text/markdown;q=0"), true);

  assert.equal(isUnacceptable(null), false);
  assert.equal(isUnacceptable("*/*"), false);
  assert.equal(isUnacceptable("text/html"), false);
  assert.equal(isUnacceptable("text/markdown"), false);
  assert.equal(isUnacceptable("application/json, */*;q=0.1"), false);
});

test("agent page registry is unique and rooted", () => {
  const paths = AGENT_PAGES.map((page) => page.path);
  assert.equal(new Set(paths).size, paths.length);
  for (const path of paths) {
    assert.ok(path === "/" || /^\/[a-z0-9/-]+$/.test(path), path);
    assert.ok(!path.endsWith("/") || path === "/", path);
  }
  for (const path of ["/", "/editor", "/code", "/for/developers"]) {
    assert.ok(findAgentPage(path), `missing agent page ${path}`);
  }
  for (const path of ["/docs", "/docs/authentication", "/developers", "/tweet"]) {
    assert.equal(findAgentPage(path), undefined);
  }
});

test("normalizeAgentPath strips locale prefixes and trailing slashes", () => {
  assert.equal(normalizeAgentPath("/"), "/");
  assert.equal(normalizeAgentPath("/es"), "/");
  assert.equal(normalizeAgentPath("/es/"), "/");
  assert.equal(normalizeAgentPath("/editor/"), "/editor");
  assert.equal(normalizeAgentPath("/ja/for/developers"), "/for/developers");
  assert.equal(normalizeAgentPath("/design"), "/design");
  assert.equal(findAgentPage("/de/for/developers/")?.path, "/for/developers");
});

test("rendered markdown carries a heading, canonical URL, and resources", () => {
  const page = findAgentPage("/editor");
  assert.ok(page);
  const md = renderAgentPageMarkdown(page);
  assert.ok(md.startsWith(`# ${page.title}`));
  assert.match(md, /## Canonical URL/);
  assert.match(md, /https:\/\/www\.screenshot-studio\.com\/editor/);
  for (const resource of AGENT_RESOURCES) {
    assert.ok(md.includes(resource.url), `missing ${resource.url}`);
  }
});

test("404 and 406 markdown bodies guide an agent to a next step", () => {
  const notFound = renderNotFoundMarkdown("/nope");
  assert.ok(notFound.startsWith("# 404 Not Found"));
  assert.match(notFound, /\/nope/);
  assert.match(notFound, /## Where to look next/);
  assert.match(notFound, /openapi\.json/);

  const notAcceptable = renderNotAcceptableMarkdown("application/json");
  assert.ok(notAcceptable.startsWith("# 406 Not Acceptable"));
  assert.match(notAcceptable, /text\/markdown/);
  assert.match(notAcceptable, /application\/json/);
});

test("llms.txt files describe a static site and no HTTP API", () => {
  for (const doc of [llmsTxt, llmsFullTxt]) {
    assert.match(doc, /\/openapi\.json/);
    assert.match(doc, /\/for\/developers/);
    assert.doesNotMatch(doc, /\/api\/screenshot/);
    assert.doesNotMatch(doc, /\/api\/export/);
    assert.doesNotMatch(doc, /\/api\/tweet/);
    assert.doesNotMatch(doc, /\/api\/image-proxy/);
  }
});

test("openapi document is a valid 3.1 shape", () => {
  assert.equal(openApiSpec.openapi, "3.1.0");
  assert.ok(openApiSpec.info.title);
  assert.ok(openApiSpec.info.version);
  assert.ok(openApiSpec.info.description.length > 40);
  assert.ok(openApiSpec.servers.length > 0);
});

test("openapi document has no operations", () => {
  assert.deepEqual(openApiSpec.paths, {});
  const serialized = JSON.stringify(openApiSpec);
  assert.doesNotMatch(serialized, /\/api\/screenshot/);
  assert.doesNotMatch(serialized, /\/api\/export/);
});

test("agent-facing copy points at the canonical www host and the brand X account", () => {
  const sources = [llmsTxt, llmsFullTxt, BASE_URL, openApiSpec.servers[0].url];
  for (const source of sources) {
    assert.doesNotMatch(source, /https:\/\/screenshot-studio\.com/);
  }
  assert.match(llmsTxt, /x\.com\/screenshotstdio/);
  assert.equal(BASE_URL, "https://www.screenshot-studio.com");
});

test("agent-facing copy does not claim images never reach a server", () => {
  const claims = /never leave (your|the) (browser|device|machine)|never uploaded to (any|a) server/i;
  assert.doesNotMatch(llmsTxt, claims);
  assert.doesNotMatch(llmsFullTxt, claims);
  for (const page of AGENT_PAGES) {
    assert.doesNotMatch(page.summary, claims);
  }
});
