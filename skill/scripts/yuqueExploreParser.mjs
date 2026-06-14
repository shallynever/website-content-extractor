function normalizeText(value = "") {
  return value
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteYuqueUrl(path) {
  return new URL(path, "https://www.yuque.com").toString();
}

function viewsFromText(value = "") {
  return normalizeText(value).match(/(\d+)\s*查看/)?.[1] || "";
}

function renderContent(entries) {
  return entries
    .map((entry) => {
      const metadata = [
        `${entry.rank}. ${entry.title}`,
        entry.author,
        entry.views ? `${entry.views} views` : ""
      ].filter(Boolean).join(" - ");
      return `${metadata}\n${entry.description}`.trim();
    })
    .join("\n\n");
}

export function parseYuqueExplore(document, { url = "", currentUrl = "" } = {}) {
  const normalizeText = (value = "") => value
    .replace(/\s+/g, " ")
    .trim();
  const absoluteYuqueUrl = (path) => new URL(path, "https://www.yuque.com").toString();
  const viewsFromText = (value = "") => normalizeText(value).match(/(\d+)\s*查看/)?.[1] || "";
  const renderContent = (entries) => entries
    .map((entry) => {
      const metadata = [
        `${entry.rank}. ${entry.title}`,
        entry.author,
        entry.views ? `${entry.views} views` : ""
      ].filter(Boolean).join(" - ");
      return `${metadata}\n${entry.description}`.trim();
    })
    .join("\n\n");

  const feedNodes = [...document.querySelectorAll("div[class*='Feed-module_feed']")];
  const entries = feedNodes.map((node, index) => {
    const titleAnchor = node.querySelector("a[class*='DocFeed-module_title']");
    const author = normalizeText(node.querySelector("a[class*='Feed-module_uname']")?.textContent || "");
    const title = normalizeText(titleAnchor?.textContent || "");
    const href = titleAnchor?.getAttribute("href") || "";
    const description = normalizeText(node.querySelector("div[class*='DocFeed-module_desc']")?.textContent || "");
    const extra = normalizeText(node.querySelector("div[class*='Feed-module_extra']")?.textContent || "");

    if (!title || !href) return null;
    return {
      rank: index + 1,
      author,
      title,
      url: absoluteYuqueUrl(href),
      description,
      views: viewsFromText(extra)
    };
  }).filter(Boolean);

  if (entries.length === 0) {
    const bodyText = normalizeText(document.body?.innerText || document.body?.textContent || "");
    return {
      status: "unsupported_page",
      url,
      currentUrl,
      title: document.title || "",
      reason: "No Yuque Explore feed entries were found on this page.",
      visibleTextSample: bodyText.slice(0, 1000)
    };
  }

  return {
    status: "ok",
    url,
    currentUrl,
    title: document.title || "",
    listType: "yuque-explore-headlines",
    entries,
    content: renderContent(entries)
  };
}
