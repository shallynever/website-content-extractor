import assert from "node:assert/strict";
import { test } from "node:test";
import { buildStrategyPlan, parseStrategy } from "./strategySelection.mjs";

const githubProfile = {
  id: "github-repository-ranking",
  displayName: "GitHub Repository Ranking",
  strategies: ["static", "browser", "cdp"],
  strategyPriority: ["static", "browser"]
};

const wechatProfile = {
  id: "wechat-official-account",
  displayName: "WeChat Official Account",
  strategies: ["browser", "cdp"],
  strategyPriority: ["browser"]
};

test("parseStrategy defaults to auto", () => {
  assert.equal(parseStrategy(undefined), "auto");
  assert.equal(parseStrategy(""), "auto");
});

test("parseStrategy rejects unknown strategy values", () => {
  assert.throws(
    () => parseStrategy("scrape-everything"),
    /--strategy must be one of auto, static, browser, cdp/
  );
});

test("auto uses the profile priority order", () => {
  assert.deepEqual(buildStrategyPlan({
    requestedStrategy: "auto",
    siteProfile: githubProfile,
    cdpUrl: ""
  }), {
    requestedStrategy: "auto",
    attempts: [
      {
        strategy: "static",
        reason: "GitHub Repository Ranking supports static extraction as its lightest available strategy."
      },
      {
        strategy: "browser",
        reason: "Fallback to persistent Chrome profile if lighter extraction cannot read the page."
      }
    ]
  });
});

test("browser request creates a single browser attempt", () => {
  assert.deepEqual(buildStrategyPlan({
    requestedStrategy: "browser",
    siteProfile: githubProfile,
    cdpUrl: ""
  }), {
    requestedStrategy: "browser",
    attempts: [
      {
        strategy: "browser",
        reason: "User requested the persistent Chrome profile strategy."
      }
    ]
  });
});

test("cdp request requires cdpUrl", () => {
  assert.throws(
    () => buildStrategyPlan({
      requestedStrategy: "cdp",
      siteProfile: wechatProfile,
      cdpUrl: ""
    }),
    /--strategy cdp requires --cdp-url/
  );
});

test("unsupported explicit strategy returns a terminal non-ok result", () => {
  assert.deepEqual(buildStrategyPlan({
    requestedStrategy: "static",
    siteProfile: wechatProfile,
    cdpUrl: ""
  }), {
    requestedStrategy: "static",
    attempts: [],
    terminalResult: {
      status: "static_unavailable",
      strategy: "static",
      nextStrategy: "browser",
      reason: "WeChat Official Account does not support static extraction."
    }
  });
});
