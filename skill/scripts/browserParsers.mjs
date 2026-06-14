import { parseGitHubRepositoryRanking } from "./githubParser.mjs";
import { parseWechatArticle } from "./articleParser.mjs";
import { parseYuqueDocument } from "./yuqueParser.mjs";
import { parseYuqueExplore } from "./yuqueExploreParser.mjs";

export function browserParserSource(parser) {
  if (parser === "wechat") {
    return parseWechatArticle.toString();
  }

  if (parser === "github-repository-ranking") {
    return parseGitHubRepositoryRanking.toString();
  }

  if (parser === "yuque-document") {
    return parseYuqueDocument.toString();
  }

  if (parser === "yuque-explore-headlines") {
    return parseYuqueExplore.toString();
  }

  throw new Error(`Unknown browser parser: ${parser}`);
}
