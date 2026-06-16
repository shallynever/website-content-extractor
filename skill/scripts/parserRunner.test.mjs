import assert from "node:assert/strict";
import { test } from "node:test";
import { parseHTML } from "linkedom";
import {
  evaluateParserInPlaywrightPage,
  evaluateParserInStaticDocument,
  parserSourceForExtractor
} from "./parserRunner.mjs";

test("parserSourceForExtractor returns the browser parser source", () => {
  assert.match(parserSourceForExtractor("github-repository-ranking"), /parseGitHubRepositoryRanking/);
});

test("evaluateParserInPlaywrightPage sends parser source and URL to page.evaluate", async () => {
  const calls = [];
  const page = {
    evaluate: async (callback, payload) => {
      calls.push({ callback, payload });
      return { status: "ok", url: payload.pageUrl, sourceIncludesParser: payload.source.includes("fakeParser") };
    }
  };

  const result = await evaluateParserInPlaywrightPage(page, {
    extractorId: "fake",
    url: "https://example.com/page",
    parserSourceForExtractor: () => "function fakeParser() { return { status: 'ok' }; }"
  });

  assert.deepEqual(result, {
    status: "ok",
    url: "https://example.com/page",
    sourceIncludesParser: true
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].payload.pageUrl, "https://example.com/page");
});

test("evaluateParserInStaticDocument runs the parser against a static document", () => {
  const { document } = parseHTML("<html><head><title>Static</title></head><body></body></html>");

  const result = evaluateParserInStaticDocument(document, {
    extractorId: "fake",
    url: "https://example.com/original",
    currentUrl: "https://example.com/current",
    parserSourceForExtractor: () => `function fakeParser(document, options) {
      return {
        status: "ok",
        title: document.title,
        url: options.url,
        currentUrl: options.currentUrl
      };
    }`
  });

  assert.deepEqual(result, {
    status: "ok",
    title: "Static",
    url: "https://example.com/original",
    currentUrl: "https://example.com/current"
  });
});
