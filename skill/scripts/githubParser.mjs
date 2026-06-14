const GITHUB_REPO_PATH = /^\/([^/\s]+)\/([^/\s?#]+)$/;

function normalizeText(value = "") {
  return value
    .replace(/\s+/g, " ")
    .trim();
}

function parseCompactNumber(value = "") {
  const cleaned = value.replace(/,/g, "").trim().toLowerCase();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)([km])?$/);
  if (!match) return null;

  const numeric = Number(match[1]);
  if (!Number.isFinite(numeric)) return null;
  if (match[2] === "k") return Math.round(numeric * 1000);
  if (match[2] === "m") return Math.round(numeric * 1000000);
  return numeric;
}

function absoluteGitHubUrl(path) {
  return new URL(path, "https://github.com").toString();
}

function textFromSelectors(root, selectors) {
  for (const selector of selectors) {
    const value = normalizeText(root.querySelector(selector)?.textContent || "");
    if (value) return value;
  }
  return "";
}

function repositoryDescription(container, owner, name) {
  const candidates = [
    ...container.querySelectorAll("div[class*='Content-module__Content'], p, [itemprop='description'], .f4")
  ].map((node) => normalizeText(node.textContent || ""));
  return candidates.find((candidate) => (
    candidate &&
    candidate !== owner &&
    candidate !== name &&
    candidate !== `${owner}/${name}` &&
    candidate.length > 3
  )) || "";
}

function languageFromSearchRow(root) {
  const languageNode = [...root.querySelectorAll("[aria-label$=' language']")][0];
  return normalizeText(languageNode?.textContent || "");
}

function findRepositoryContainer(anchor) {
  const searchResult = anchor.closest?.("div[class*='Result-module__Result'], div[class*='Repositories-module__resultRow']");
  if (searchResult) return searchResult;

  const preferred = anchor.closest?.("article, .Box-row");
  if (preferred) return preferred;

  let current = anchor;
  while (current && current.parentElement) {
    if (current.matches?.("article, .Box-row, li, div")) {
      const text = normalizeText(current.textContent || "");
      if (text.length > 20 || current.matches("article, .Box-row")) return current;
    }
    current = current.parentElement;
  }
  return anchor.parentElement || anchor;
}

function extractTopics(container) {
  return [...container.querySelectorAll('a[href^="/topics/"]')]
    .map((anchor) => normalizeText(anchor.textContent || ""))
    .filter(Boolean);
}

function extractMetric(container, fullName, metricName) {
  const hrefSuffix = metricName === "stars" ? "stargazers" : "forks";
  const metricAnchor = [...container.querySelectorAll(`a[href="/${fullName}/${hrefSuffix}"]`)][0];
  const linkedMetric = normalizeText(metricAnchor?.textContent || "");
  if (linkedMetric || metricName !== "stars") return linkedMetric;

  return normalizeText(container.querySelector(".js-social-count")?.textContent || "");
}

function extractStarCount(container, fullName, stars) {
  const socialCounter =
    container.querySelector(".js-social-count") ||
    container.querySelector(`a[href="/${fullName}/stargazers"]`);
  const exactCount = socialCounter?.getAttribute("title") || socialCounter?.getAttribute("aria-label") || "";
  const exactMatch = exactCount.replace(/,/g, "").match(/\d+/);
  if (exactMatch) return Number(exactMatch[0]);

  return parseCompactNumber(stars);
}

function extractStarsToday(container) {
  const text = normalizeText(container.textContent || "");
  return text.match(/[\d,.]+k?\s+stars?\s+today/i)?.[0] || "";
}

function extractRepository(anchor, rank) {
  const href = anchor.getAttribute("href") || "";
  const match = href.match(GITHUB_REPO_PATH);
  if (!match) return null;

  const owner = match[1];
  const name = match[2];
  const fullName = `${owner}/${name}`;
  const container = findRepositoryContainer(anchor);
  const description = repositoryDescription(container, owner, name);
  const language = textFromSelectors(container, ["[itemprop='programmingLanguage']"]) || languageFromSearchRow(container);
  const stars = extractMetric(container, fullName, "stars");
  const forks = extractMetric(container, fullName, "forks");

  return {
    rank,
    fullName,
    owner,
    name,
    url: absoluteGitHubUrl(href),
    description,
    language,
    stars,
    starsCount: extractStarCount(container, fullName, stars),
    forks,
    forksCount: parseCompactNumber(forks),
    starsToday: extractStarsToday(container),
    topics: extractTopics(container)
  };
}

function findRepositoryAnchors(document) {
  const seen = new Set();
  const anchors = [];

  for (const anchor of document.querySelectorAll('a[href^="/"]')) {
    const href = anchor.getAttribute("href") || "";
    const match = href.match(GITHUB_REPO_PATH);
    if (!match) continue;
    if (["features", "topics", "trending", "collections", "sponsors", "settings", "search", "login"].includes(match[1])) continue;

    const fullName = `${match[1]}/${match[2]}`;
    if (seen.has(fullName)) continue;
    seen.add(fullName);
    anchors.push(anchor);
  }

  return anchors;
}

function renderRankingContent(repositories) {
  return repositories
    .map((repository) => {
      const metadata = [
        `${repository.rank}. ${repository.fullName}`,
        repository.stars ? `${repository.stars} stars` : "",
        repository.language
      ].filter(Boolean).join(" - ");
      return `${metadata}\n${repository.description}`.trim();
    })
    .join("\n\n");
}

export function parseGitHubRepositoryRanking(document, { url = "", currentUrl = "" } = {}) {
  const GITHUB_REPO_PATH = /^\/([^/\s]+)\/([^/\s?#]+)$/;
  const normalizeText = (value = "") => value
    .replace(/\s+/g, " ")
    .trim();
  const parseCompactNumber = (value = "") => {
    const cleaned = value.replace(/,/g, "").trim().toLowerCase();
    const match = cleaned.match(/^(\d+(?:\.\d+)?)([km])?$/);
    if (!match) return null;

    const numeric = Number(match[1]);
    if (!Number.isFinite(numeric)) return null;
    if (match[2] === "k") return Math.round(numeric * 1000);
    if (match[2] === "m") return Math.round(numeric * 1000000);
    return numeric;
  };
  const absoluteGitHubUrl = (path) => new URL(path, "https://github.com").toString();
  const textFromSelectors = (root, selectors) => {
    for (const selector of selectors) {
      const value = normalizeText(root.querySelector(selector)?.textContent || "");
      if (value) return value;
    }
    return "";
  };
  const repositoryDescription = (container, owner, name) => {
    const candidates = [
      ...container.querySelectorAll("div[class*='Content-module__Content'], p, [itemprop='description'], .f4")
    ].map((node) => normalizeText(node.textContent || ""));
    return candidates.find((candidate) => (
      candidate &&
      candidate !== owner &&
      candidate !== name &&
      candidate !== `${owner}/${name}` &&
      candidate.length > 3
    )) || "";
  };
  const languageFromSearchRow = (root) => {
    const languageNode = [...root.querySelectorAll("[aria-label$=' language']")][0];
    return normalizeText(languageNode?.textContent || "");
  };
  const findRepositoryContainer = (anchor) => {
    const searchResult = anchor.closest?.("div[class*='Result-module__Result'], div[class*='Repositories-module__resultRow']");
    if (searchResult) return searchResult;

    const preferred = anchor.closest?.("article, .Box-row");
    if (preferred) return preferred;

    let current = anchor;
    while (current && current.parentElement) {
      if (current.matches?.("article, .Box-row, li, div")) {
        const text = normalizeText(current.textContent || "");
        if (text.length > 20 || current.matches("article, .Box-row")) return current;
      }
      current = current.parentElement;
    }
    return anchor.parentElement || anchor;
  };
  const extractTopics = (container) => [...container.querySelectorAll('a[href^="/topics/"]')]
    .map((anchor) => normalizeText(anchor.textContent || ""))
    .filter(Boolean);
  const extractMetric = (container, fullName, metricName) => {
    const hrefSuffix = metricName === "stars" ? "stargazers" : "forks";
    const metricAnchor = [...container.querySelectorAll(`a[href="/${fullName}/${hrefSuffix}"]`)][0];
    const linkedMetric = normalizeText(metricAnchor?.textContent || "");
    if (linkedMetric || metricName !== "stars") return linkedMetric;

    return normalizeText(container.querySelector(".js-social-count")?.textContent || "");
  };
  const extractStarCount = (container, fullName, stars) => {
    const socialCounter =
      container.querySelector(".js-social-count") ||
      container.querySelector(`a[href="/${fullName}/stargazers"]`);
    const exactCount = socialCounter?.getAttribute("title") || socialCounter?.getAttribute("aria-label") || "";
    const exactMatch = exactCount.replace(/,/g, "").match(/\d+/);
    if (exactMatch) return Number(exactMatch[0]);

    return parseCompactNumber(stars);
  };
  const extractStarsToday = (container) => {
    const text = normalizeText(container.textContent || "");
    return text.match(/[\d,.]+k?\s+stars?\s+today/i)?.[0] || "";
  };
  const extractRepository = (anchor, rank) => {
    const href = anchor.getAttribute("href") || "";
    const match = href.match(GITHUB_REPO_PATH);
    if (!match) return null;

    const owner = match[1];
    const name = match[2];
    const fullName = `${owner}/${name}`;
    const container = findRepositoryContainer(anchor);
    const description = repositoryDescription(container, owner, name);
    const language = textFromSelectors(container, ["[itemprop='programmingLanguage']"]) || languageFromSearchRow(container);
    const stars = extractMetric(container, fullName, "stars");
    const forks = extractMetric(container, fullName, "forks");

    return {
      rank,
      fullName,
      owner,
      name,
      url: absoluteGitHubUrl(href),
      description,
      language,
      stars,
      starsCount: extractStarCount(container, fullName, stars),
      forks,
      forksCount: parseCompactNumber(forks),
      starsToday: extractStarsToday(container),
      topics: extractTopics(container)
    };
  };
  const findRepositoryAnchors = (root) => {
    const seen = new Set();
    const anchors = [];

    for (const anchor of root.querySelectorAll('a[href^="/"]')) {
      const href = anchor.getAttribute("href") || "";
      const match = href.match(GITHUB_REPO_PATH);
      if (!match) continue;
      if (["features", "topics", "trending", "collections", "sponsors", "settings", "search", "login"].includes(match[1])) continue;

      const fullName = `${match[1]}/${match[2]}`;
      if (seen.has(fullName)) continue;
      seen.add(fullName);
      anchors.push(anchor);
    }

    return anchors;
  };
  const renderRankingContent = (repositories) => repositories
    .map((repository) => {
      const metadata = [
        `${repository.rank}. ${repository.fullName}`,
        repository.stars ? `${repository.stars} stars` : "",
        repository.language
      ].filter(Boolean).join(" - ");
      return `${metadata}\n${repository.description}`.trim();
    })
    .join("\n\n");

  const repositories = findRepositoryAnchors(document)
    .map((anchor, index) => extractRepository(anchor, index + 1))
    .filter(Boolean);
  const title = document.title || "";

  if (repositories.length === 0) {
    const bodyText = normalizeText(document.body?.innerText || document.body?.textContent || "");
    return {
      status: "unsupported_page",
      url,
      currentUrl,
      title,
      reason: "No GitHub repository ranking entries were found on this page.",
      visibleTextSample: bodyText.slice(0, 1000)
    };
  }

  return {
    status: "ok",
    url,
    currentUrl,
    title,
    listType: "github-repository-ranking",
    repositories,
    content: renderRankingContent(repositories)
  };
}
