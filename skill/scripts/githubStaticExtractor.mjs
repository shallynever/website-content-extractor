import { parseHTML } from "linkedom";
import { parseGitHubRepositoryRanking } from "./githubParser.mjs";

function staticFailure(status, reason, extra = {}) {
  return {
    status,
    strategy: "static",
    nextStrategy: "browser",
    reason,
    ...extra
  };
}

export async function extractGitHubRepositoryRankingStatic(url, { fetchImpl = fetch } = {}) {
  let response;
  try {
    response = await fetchImpl(url, {
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "user-agent": "website-content-extractor/0.1 static-fetch"
      }
    });
  } catch (error) {
    return staticFailure("static_unavailable", `Static fetch failed: ${error.message}`);
  }

  if (response.status === 429) {
    return staticFailure("rate_limited", "Static fetch was rate limited by HTTP 429.", {
      httpStatus: response.status
    });
  }

  if (!response.ok) {
    return staticFailure("static_unavailable", `Static fetch failed with HTTP ${response.status}.`, {
      httpStatus: response.status
    });
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType && !contentType.includes("text/html")) {
    return staticFailure("static_unavailable", `Static fetch returned non-HTML content: ${contentType}.`);
  }

  const html = await response.text();
  const { document } = parseHTML(html);
  const parsed = parseGitHubRepositoryRanking(document, { url, currentUrl: url });

  if (parsed.status !== "ok") {
    return {
      ...parsed,
      status: "needs_browser_rendering",
      strategy: "static",
      nextStrategy: "browser",
      reason: "Static HTML did not contain GitHub repository ranking entries."
    };
  }

  return {
    ...parsed,
    strategy: "static"
  };
}
