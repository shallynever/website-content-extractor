import assert from "node:assert/strict";
import { test } from "node:test";
import { batchReportEntry, writeBatchReport } from "./batchReport.mjs";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("batchReportEntry records safe extraction metadata", () => {
  assert.deepEqual(batchReportEntry({
    url: "https://github.com/topics/artificial-intelligence",
    result: {
      status: "needs_browser_rendering",
      siteType: "github-repository-ranking",
      strategy: "static",
      reason: "Static HTML did not contain entries.",
      nextStrategy: "browser"
    },
    outputBase: "/tmp/github-ai"
  }), {
    url: "https://github.com/topics/artificial-intelligence",
    siteType: "github-repository-ranking",
    strategy: "static",
    status: "needs_browser_rendering",
    outputMarkdown: "/tmp/github-ai.md",
    outputJson: "/tmp/github-ai.json",
    reason: "Static HTML did not contain entries.",
    nextStrategy: "browser"
  });
});

test("batchReportEntry leaves output paths empty when not saved", () => {
  assert.equal(batchReportEntry({
    url: "https://example.com",
    result: { status: "unsupported_site" }
  }).outputMarkdown, "");
});

test("writeBatchReport writes formatted JSON", async () => {
  const dir = await mkdtemp(join(tmpdir(), "website-content-extractor-"));
  const report = join(dir, "report.json");

  await writeBatchReport(report, [
    { url: "https://example.com", status: "unsupported_site" }
  ]);

  assert.deepEqual(JSON.parse(await readFile(report, "utf8")), [
    { url: "https://example.com", status: "unsupported_site" }
  ]);
});
