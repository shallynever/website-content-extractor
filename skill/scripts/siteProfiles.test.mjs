import assert from "node:assert/strict";
import { test } from "node:test";
import { matchSiteProfile } from "./siteProfiles.mjs";

test("GitHub repository ranking profile declares static before browser for auto", () => {
  const profile = matchSiteProfile("https://github.com/trending?since=daily");

  assert.equal(profile.id, "github-repository-ranking");
  assert.equal(profile.defaultStrategy, "auto");
  assert.deepEqual(profile.strategies, ["static", "browser", "cdp"]);
  assert.deepEqual(profile.strategyPriority, ["static", "browser"]);
});

test("WeChat profile stays browser and CDP only", () => {
  const profile = matchSiteProfile("https://mp.weixin.qq.com/s/YD3R01estFybUxZXxTnu4A");

  assert.equal(profile.id, "wechat-official-account");
  assert.equal(profile.defaultStrategy, "auto");
  assert.deepEqual(profile.strategies, ["browser", "cdp"]);
  assert.deepEqual(profile.strategyPriority, ["browser"]);
});

test("Yuque document profile stays browser and CDP only", () => {
  const profile = matchSiteProfile("https://www.yuque.com/example/book/page");

  assert.equal(profile.id, "yuque-document");
  assert.equal(profile.defaultStrategy, "auto");
  assert.deepEqual(profile.strategies, ["browser", "cdp"]);
  assert.deepEqual(profile.strategyPriority, ["browser"]);
});

test("Yuque Explore profile is matched before generic Yuque document profile", () => {
  const profile = matchSiteProfile("https://www.yuque.com/dashboard/explore");

  assert.equal(profile.id, "yuque-explore-headlines");
  assert.deepEqual(profile.strategies, ["browser", "cdp"]);
});
