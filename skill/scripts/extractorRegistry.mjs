import { extractGitHubRepositoryRankingStatic } from "./githubStaticExtractor.mjs";

export const EXTRACTORS = {
  "github-repository-ranking": {
    id: "github-repository-ranking",
    strategies: ["static", "browser", "cdp"],
    static: extractGitHubRepositoryRankingStatic,
    browserParser: "github-repository-ranking"
  },
  wechat: {
    id: "wechat",
    strategies: ["browser", "cdp"],
    browserParser: "wechat"
  },
  "yuque-document": {
    id: "yuque-document",
    strategies: ["browser", "cdp"],
    browserParser: "yuque-document"
  },
  "yuque-explore-headlines": {
    id: "yuque-explore-headlines",
    strategies: ["browser", "cdp"],
    browserParser: "yuque-explore-headlines"
  }
};

export function getExtractor(extractorId) {
  const extractor = EXTRACTORS[extractorId];
  if (!extractor) {
    throw new Error(`No extractor is registered for ${extractorId}.`);
  }
  return extractor;
}
