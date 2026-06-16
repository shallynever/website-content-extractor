import { join } from "node:path";
import { getExtractor } from "./extractorRegistry.mjs";

const DEFAULT_PROFILE_ROOT = join(
  process.env.HOME || ".",
  "Documents",
  "Codex",
  "shared",
  "chrome-profiles"
);

export const PROFILE_ROOT = process.env.WEBSITE_CONTENT_EXTRACTOR_PROFILE_ROOT || DEFAULT_PROFILE_ROOT;

function profilePath(name) {
  return join(PROFILE_ROOT, name);
}

function strategyMetadata(extractorId, strategyPriority) {
  const extractor = getExtractor(extractorId);
  return {
    strategies: [...extractor.strategies],
    defaultStrategy: "auto",
    strategyPriority
  };
}

export const SITE_PROFILES = [
  {
    id: "wechat-official-account",
    displayName: "WeChat Official Account",
    extractorId: "wechat",
    ...strategyMetadata("wechat", ["browser"]),
    chromeProfile: profilePath("wechat-official-account"),
    verificationKind: "manual",
    matches(url) {
      return url.hostname === "mp.weixin.qq.com";
    }
  },
  {
    id: "github-repository-ranking",
    displayName: "GitHub Repository Ranking",
    extractorId: "github-repository-ranking",
    ...strategyMetadata("github-repository-ranking", ["static", "browser"]),
    chromeProfile: profilePath("github"),
    verificationKind: "manual",
    matches(url) {
      return url.hostname === "github.com" && (
        url.pathname === "/trending" ||
        url.pathname.startsWith("/topics/") ||
        url.pathname === "/search"
      );
    }
  },
  {
    id: "yuque-explore-headlines",
    displayName: "Yuque Explore Headlines",
    extractorId: "yuque-explore-headlines",
    ...strategyMetadata("yuque-explore-headlines", ["browser"]),
    chromeProfile: profilePath("yuque"),
    verificationKind: "manual",
    matches(url) {
      return (url.hostname === "www.yuque.com" || url.hostname.endsWith(".yuque.com")) &&
        url.pathname === "/dashboard/explore";
    }
  },
  {
    id: "yuque-document",
    displayName: "Yuque Document",
    extractorId: "yuque-document",
    ...strategyMetadata("yuque-document", ["browser"]),
    chromeProfile: profilePath("yuque"),
    verificationKind: "manual",
    matches(url) {
      return url.hostname === "www.yuque.com" || url.hostname.endsWith(".yuque.com");
    }
  }
];

export function matchSiteProfile(urlValue) {
  const url = new URL(urlValue);
  const profile = SITE_PROFILES.find((candidate) => candidate.matches(url));
  if (!profile) return null;

  return {
    id: profile.id,
    displayName: profile.displayName,
    extractorId: profile.extractorId,
    strategies: [...profile.strategies],
    defaultStrategy: profile.defaultStrategy,
    strategyPriority: [...profile.strategyPriority],
    chromeProfile: profile.chromeProfile,
    verificationKind: profile.verificationKind
  };
}
