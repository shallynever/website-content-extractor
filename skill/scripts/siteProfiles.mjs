import { join } from "node:path";

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

export const SITE_PROFILES = [
  {
    id: "wechat-official-account",
    displayName: "WeChat Official Account",
    extractorId: "wechat",
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
    chromeProfile: profile.chromeProfile,
    verificationKind: profile.verificationKind
  };
}
