import assert from "node:assert/strict";
import { test } from "node:test";
import { EXTRACTORS, getExtractor } from "./extractorRegistry.mjs";
import { extractGitHubRepositoryRankingStatic } from "./githubStaticExtractor.mjs";

test("registry declares GitHub static, browser, and CDP support", () => {
  assert.deepEqual(EXTRACTORS["github-repository-ranking"], {
    id: "github-repository-ranking",
    strategies: ["static", "browser", "cdp"],
    static: extractGitHubRepositoryRankingStatic,
    browserParser: "github-repository-ranking"
  });
});

test("registry declares browser parser for each browser-only extractor", () => {
  assert.equal(EXTRACTORS.wechat.browserParser, "wechat");
  assert.equal(EXTRACTORS["yuque-document"].browserParser, "yuque-document");
  assert.equal(EXTRACTORS["yuque-explore-headlines"].browserParser, "yuque-explore-headlines");
});

test("getExtractor returns a registered extractor", () => {
  assert.equal(getExtractor("wechat").id, "wechat");
});

test("getExtractor throws for unknown extractors", () => {
  assert.throws(
    () => getExtractor("missing"),
    /No extractor is registered for missing/
  );
});
