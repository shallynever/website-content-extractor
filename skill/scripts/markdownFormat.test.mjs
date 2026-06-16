import assert from "node:assert/strict";
import { test } from "node:test";
import { parseMarkdownFormat, renderFormattedMarkdown } from "./markdownFormat.mjs";

test("parseMarkdownFormat defaults to article", () => {
  assert.equal(parseMarkdownFormat(undefined), "article");
  assert.equal(parseMarkdownFormat(""), "article");
});

test("parseMarkdownFormat rejects unknown formats", () => {
  assert.throws(
    () => parseMarkdownFormat("summary"),
    /--markdown-format must be one of article, knowledge/
  );
});

test("renderFormattedMarkdown preserves article format by default", () => {
  const markdown = renderFormattedMarkdown({
    status: "ok",
    title: "Article",
    url: "https://example.com",
    content: "Body"
  }, { markdownFormat: "article" });

  assert.match(markdown, /^# Article/);
  assert.doesNotMatch(markdown, /^---/);
});

test("renderFormattedMarkdown adds knowledge front matter", () => {
  const markdown = renderFormattedMarkdown({
    status: "ok",
    title: "Article",
    url: "https://example.com",
    siteName: "Example Site",
    siteType: "example-site",
    strategy: "static",
    account: "Example Account",
    publishTime: "2026-06-16",
    content: "Body"
  }, {
    markdownFormat: "knowledge",
    extractedAt: "2026-06-16T10:00:00.000Z"
  });

  assert.match(markdown, /^---\n/);
  assert.match(markdown, /title: "Article"/);
  assert.match(markdown, /url: "https:\/\/example.com"/);
  assert.match(markdown, /site: "Example Site"/);
  assert.match(markdown, /site_type: "example-site"/);
  assert.match(markdown, /strategy: "static"/);
  assert.match(markdown, /account: "Example Account"/);
  assert.match(markdown, /published: "2026-06-16"/);
  assert.match(markdown, /extracted_at: "2026-06-16T10:00:00.000Z"/);
  assert.match(markdown, /tags: \[\]/);
  assert.match(markdown, /\n---\n\n# Article/);
});

test("renderFormattedMarkdown escapes front matter string values", () => {
  const markdown = renderFormattedMarkdown({
    status: "ok",
    title: 'A "quoted" title',
    url: "https://example.com",
    content: "Body"
  }, {
    markdownFormat: "knowledge",
    extractedAt: "2026-06-16T10:00:00.000Z"
  });

  assert.match(markdown, /title: "A \\"quoted\\" title"/);
});
