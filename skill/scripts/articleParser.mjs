const VERIFICATION_PATTERNS = [
  /验证码/,
  /captcha/i,
  /wappoc_appmsgcaptcha/i,
  /环境异常/,
  /请在微信客户端打开/
];

function firstText(document, selectors) {
  for (const selector of selectors) {
    const value = document.querySelector(selector)?.textContent?.trim();
    if (value) return value.replace(/\s+/g, " ");
  }
  return "";
}

function metaContent(document, property) {
  return (
    document.querySelector(`meta[property="${property}"]`)?.getAttribute("content") ||
    document.querySelector(`meta[name="${property}"]`)?.getAttribute("content") ||
    ""
  ).trim();
}

export function normalizeArticleText(value) {
  return value
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export function detectVerificationPage({ url = "", title = "", bodyText = "" }) {
  const combined = `${url}\n${title}\n${bodyText}`;
  return VERIFICATION_PATTERNS.some((pattern) => pattern.test(combined));
}

export function parseWechatArticle(document, { url = "", currentUrl = "" } = {}) {
  const firstText = (root, selectors) => {
    for (const selector of selectors) {
      const value = root.querySelector(selector)?.textContent?.trim();
      if (value) return value.replace(/\s+/g, " ");
    }
    return "";
  };
  const metaContent = (root, property) => (
    root.querySelector(`meta[property="${property}"]`)?.getAttribute("content") ||
    root.querySelector(`meta[name="${property}"]`)?.getAttribute("content") ||
    ""
  ).trim();
  const normalizeArticleText = (value) => value
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
  const detectVerificationPage = ({ url: detectedUrl = "", title = "", bodyText = "" }) => {
    const verificationPatterns = [
      /验证码/,
      /captcha/i,
      /wappoc_appmsgcaptcha/i,
      /环境异常/,
      /请在微信客户端打开/
    ];
    const combined = `${detectedUrl}\n${title}\n${bodyText}`;
    return verificationPatterns.some((pattern) => pattern.test(combined));
  };

  const bodyText = document.body?.innerText || document.body?.textContent || "";
  const pageTitle = document.title || "";
  const title =
    firstText(document, ["#activity-name", "h1.rich_media_title", "h1"]) ||
    metaContent(document, "og:title") ||
    pageTitle.trim();
  const account =
    firstText(document, ["#js_name", ".rich_media_meta_nickname"]) ||
    metaContent(document, "og:article:author");
  const publishTime =
    firstText(document, ["#publish_time", "#js_publish_time", ".rich_media_meta_text"]);
  const contentRoot = document.querySelector("#js_content") || document.querySelector(".rich_media_content");
  const content = normalizeArticleText(contentRoot?.innerText || contentRoot?.textContent || "");

  if (content) {
    return {
      status: "ok",
      url,
      currentUrl,
      title,
      account,
      publishTime,
      content
    };
  }

  const needsVerification = detectVerificationPage({ url: currentUrl || url, title: pageTitle, bodyText });

  if (needsVerification || !content) {
    return {
      status: "needs_verification",
      url,
      currentUrl,
      title: pageTitle,
      reason: needsVerification ? "WeChat is showing a verification page." : "Article content was not found on the page.",
      visibleTextSample: normalizeArticleText(bodyText).slice(0, 1000)
    };
  }
}

export function renderMarkdown(result) {
  if (result.status !== "ok") {
    return `# Website Content Extraction\n\nStatus: ${result.status}\n\nURL: ${result.url}\n\nReason: ${result.reason || "Manual verification is required."}\n`;
  }

  if (result.listType === "github-repository-ranking") {
    const repositories = (result.repositories || []).map((repository) => {
      const details = [
        repository.description,
        repository.language ? `Language: ${repository.language}` : "",
        repository.stars ? `Stars: ${repository.stars}` : "",
        repository.forks ? `Forks: ${repository.forks}` : "",
        repository.starsToday ? `Today: ${repository.starsToday}` : "",
        repository.topics?.length ? `Topics: ${repository.topics.join(", ")}` : ""
      ].filter(Boolean).join("\n");

      return `${repository.rank}. [${repository.fullName}](${repository.url})\n${details}`.trim();
    }).join("\n\n");

    return `# ${result.title || "GitHub Repository Ranking"}\n\n` +
      `- URL: ${result.url}\n` +
      (result.siteName ? `- Site: ${result.siteName}\n` : "") +
      `\n## Repositories\n\n${repositories}\n`;
  }

  if (result.listType === "yuque-explore-headlines") {
    const entries = (result.entries || []).map((entry) => {
      const details = [
        entry.author ? `Author: ${entry.author}` : "",
        entry.views ? `Views: ${entry.views}` : "",
        entry.description
      ].filter(Boolean).join("\n");

      return `${entry.rank}. [${entry.title}](${entry.url})\n${details}`.trim();
    }).join("\n\n");

    return `# ${result.title || "Yuque Explore Headlines"}\n\n` +
      `- URL: ${result.url}\n` +
      (result.siteName ? `- Site: ${result.siteName}\n` : "") +
      `\n## Headlines\n\n${entries}\n`;
  }

  return `# ${result.title || "Untitled Website Content"}\n\n` +
    `- URL: ${result.url}\n` +
    (result.siteName ? `- Site: ${result.siteName}\n` : "") +
    (result.account ? `- Account: ${result.account}\n` : "") +
    (result.publishTime ? `- Published: ${result.publishTime}\n` : "") +
    `\n` +
    `${result.content || ""}\n`;
}
