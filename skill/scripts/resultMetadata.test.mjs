import assert from "node:assert/strict";
import { test } from "node:test";
import { withExtractionMetadata } from "./resultMetadata.mjs";

const siteProfile = {
  id: "github-repository-ranking",
  displayName: "GitHub Repository Ranking"
};

test("adds site and strategy metadata without removing parser fields", () => {
  assert.deepEqual(withExtractionMetadata(
    {
      status: "ok",
      title: "Trending repositories",
      repositories: []
    },
    {
      siteProfile,
      strategy: "static"
    }
  ), {
    status: "ok",
    title: "Trending repositories",
    repositories: [],
    siteType: "github-repository-ranking",
    siteName: "GitHub Repository Ranking",
    strategy: "static"
  });
});

test("adds nextStrategy only when present", () => {
  assert.deepEqual(withExtractionMetadata(
    {
      status: "needs_browser_rendering",
      reason: "Static HTML did not contain repository entries."
    },
    {
      siteProfile,
      strategy: "static",
      nextStrategy: "browser"
    }
  ), {
    status: "needs_browser_rendering",
    reason: "Static HTML did not contain repository entries.",
    siteType: "github-repository-ranking",
    siteName: "GitHub Repository Ranking",
    strategy: "static",
    nextStrategy: "browser"
  });
});
